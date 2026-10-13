/** Bundle reviewed repository source without executing it or installing dependencies.
 * node scripts/prepare-mcp-import.mjs --root /repo --entry examples/card.tsx --name Card --out /tmp/import.json [--css dist/styles.css] [--canvas UUID]
 * The entry is a real demo wrapper with default props/providers. Supply compiled CSS for Tailwind/PostCSS.
 */
import { createRequire } from 'node:module';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const runtime = ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'];
export async function prepareImport({ root, entry, name, css = [], canvas, adaptations = [], manifest = null, archive = false }) {
  root = await realpath(root);
  // A plugin installation has no node_modules. Prefer the source repository's
  // installed bundler; the Tenor checkout also declares it for local tooling/tests.
  let build;
  try { ({build} = createRequire(path.join(root,'package.json'))('esbuild')); }
  catch {
    try { ({build} = createRequire(import.meta.url)('esbuild')); }
    catch { throw new Error('esbuild is not installed in the source repository. Install a compatible esbuild explicitly before bundling; this helper never installs dependencies.'); }
  }
  const entryPath = path.resolve(root, entry);
  const safe = async file => {
    const actual = await realpath(file);
    const relative = path.relative(root,actual);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Source outside --root: ${relative}`);
    if (/(^|\/)(\.env[^/]*|\.git|\.npmrc|[^/]*\.(pem|key|p12))($|\/)/i.test(relative)) throw new Error('Sensitive configuration files cannot be imported.');
    return actual;
  };
  await safe(entryPath);
  const unsupportedDependencies = new Set();
  const environmentErrors = new Set();
  const identifier = value => typeof value === 'string' && /^[A-Za-z_$][\w$]*$/.test(value);
  if (manifest && (manifest.adapter !== 'react-browser-v1' || !identifier(manifest.export ?? 'default'))) throw new Error('Use the react-browser-v1 adapter and a valid export name.');
  const providers = manifest?.providers ?? [];
  if (!Array.isArray(providers) || providers.length > 16) throw new Error('At most 16 providers are supported.');
  const env = manifest?.environment ?? {};
  for (const [key,value] of Object.entries(env)) {
    if (!identifier(key) || typeof value !== 'string' || /SECRET|PASSWORD|PRIVATE|TOKEN|API_KEY/i.test(key)) throw new Error('Only explicit non-secret browser environment values are allowed.');
  }
  const modes = {MODE:'production',PROD:true,DEV:false,SSR:false,...env};
  const aliases = {};
  for (const [name,file] of Object.entries(manifest?.aliases ?? {})) {
    if (typeof file !== 'string' || !name || name.startsWith('.') || name.startsWith('/') || /^(?:node:|https?:|react(?:-dom)?(?:\/|$))/.test(name))
      throw new Error('Use explicit local source aliases without overriding React or platform imports.');
    aliases[name] = await safe(path.resolve(root,file));
  }
  const imports = [`import React from 'react';`, `import {${manifest?.export ?? 'default'} as Target} from ${JSON.stringify(entryPath)};`];
  let element = `React.createElement(Target, {...${JSON.stringify(manifest?.props ?? {})},...props})`;
  for (let i=providers.length-1;i>=0;i--) {
    const provider=providers[i];
    if (!identifier(provider.export ?? 'default') || typeof provider.module !== 'string') throw new Error('A provider needs a module and export.');
    const modulePath = await safe(path.resolve(root,provider.module));
    imports.push(`import {${provider.export ?? 'default'} as Provider${i}} from ${JSON.stringify(modulePath)};`);
    element = `React.createElement(Provider${i},${JSON.stringify(provider.props ?? {})},${element})`;
  }
  const harness = imports.join('\n') + `export default function ImportedHarness(props){return ${element}}`;

  const buildOptions = {
    absWorkingDir: root, ...(manifest ? {stdin:{contents:harness,resolveDir:root,sourcefile:'tenor-harness.tsx',loader:'tsx'}} : {entryPoints:[entryPath]}), bundle: true, write: false, metafile: true,
    logLevel: 'silent', format: 'esm', platform: 'browser', target: 'es2022', outfile: '/virtual/component.js',
    jsx: 'automatic', external: runtime, minify: true, legalComments: 'inline', alias: aliases,
    define: { ...Object.fromEntries(Object.entries(env).map(([key,value])=>['process.env.'+key,JSON.stringify(value)])), 'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify(modes) },
    loader: { '.png':'dataurl', '.jpg':'dataurl', '.jpeg':'dataurl', '.gif':'dataurl', '.webp':'dataurl', '.svg':'dataurl', '.woff':'dataurl', '.woff2':'dataurl', '.ttf':'dataurl', '.mp3':'dataurl', '.mp4':'dataurl' },
    plugins: [{ name: 'reviewed-source-only', setup(build) {
      build.onLoad({filter: /.*/}, async args => {
        await safe(args.path);
        if (/\.[cm]?[jt]sx?$/.test(args.path) && !args.path.split('/').includes('node_modules')) {
          const source=await readFile(args.path,'utf8');
          if (/(?:import\.meta\.env|process\.env)\s*\[/.test(source)) environmentErrors.add('Dynamic environment access needs an explicit browser adapter.');
          for (const match of source.matchAll(/(?:import\.meta\.env|process\.env)\.([A-Za-z_$][\w$]*)/g)) {
            if (match[1] !== 'NODE_ENV' && !Object.hasOwn(modes,match[1])) environmentErrors.add(`Undeclared browser environment requirement: ${match[1]}. Declare a public value or supply an explicit adapter.`);
          }
        }
        return undefined;
      });
      build.onResolve({filter: /^(node:|https?:|@tenor\/)/}, args => { unsupportedDependencies.add(args.path); return {path:args.path,external:true}; });
    }}],
  };
  // Preflight without metafile avoids esbuild 0.27's malformed failure metadata.
  await build({...buildOptions,metafile:false});
  const result=await build(buildOptions);
  if (environmentErrors.size) throw new Error([...environmentErrors].join(' '));
  if (unsupportedDependencies.size) throw new Error(`Unsupported dependency ${[...unsupportedDependencies].join(', ')}. Supply a browser adapter; never substitute a placeholder.`);
  if(!Object.values(result.metafile.outputs).some(output=>output.exports?.includes('default'))) throw new Error('A default component export is required. Select the original named export in the runtime manifest.');
  const dependencies = {};
  const files = [];
  const binaryExtensions = /\.(png|jpe?g|gif|webp|woff2?|ttf|mp3|mp4)$/i;
  for (const file of Object.keys(result.metafile.inputs).sort()) {
    if (file === '<define:import.meta.env>' || file === 'tenor-harness.tsx') continue; // esbuild-generated mode constants, not a source file.
    const absolute = await safe(path.resolve(root,file));
    if (file.split('/').includes('node_modules')) {
      // Preserve the exact installed package version; bundled implementation is in code.
      let dir = path.dirname(absolute);
      for (;;) {
        try {
          const pkg = JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));
          if (pkg.name && pkg.version) { dependencies[pkg.name] = pkg.version; break; }
        } catch { /* walk to the owning package */ }
        const parent = path.dirname(dir); if (parent === dir) break; dir = parent;
      }
      continue;
    }
    const binary = binaryExtensions.test(file);
    files.push({path:path.relative(root,absolute), content:await readFile(absolute,binary ? 'base64' : 'utf8'), encoding:binary ? 'base64' : 'utf8'});
  }
  let styles = result.outputFiles.filter(f=>f.path.endsWith('.css')).map(f=>f.text).join('\n');
  for (const file of css) {
    const absolute = await safe(path.resolve(root,file));
    const content = await readFile(absolute,'utf8');
    if (/@(?:tailwind|apply|import)\b/.test(content)) throw new Error('Supply compiled standalone CSS; unresolved CSS directives cannot be preserved.');
    if (/url\(\s*["']?(?!data:|https:|http:|#)[^\s"')]/i.test(content)) throw new Error('Embed or resolve stylesheet asset URLs before importing.');
    styles += '\n'+content;
    if (!files.some(f=>f.path===path.relative(root,absolute))) files.push({path:path.relative(root,absolute),content,encoding:'utf8'});
  }
  if (/@(?:tailwind|apply|import)\b/.test(styles)) throw new Error('Compile Tailwind/PostCSS before importing; CSS directives remain unresolved.');
  let code = result.outputFiles.find(f=>f.path.endsWith('.js')).text;
  // Styles mount with the component, including off-screen candidate renders; no document mutation during compilation.
  if (styles) {
    const bundledCode = code;
    const wrapped = await build({
      stdin: {contents: `import React from 'react';import Component from 'tenor:compiled';export default function ImportedComponent(props){return React.createElement(React.Fragment,null,React.createElement('style',null,${JSON.stringify(styles)}),React.createElement(Component,props));}`},
      bundle:true,write:false,format:'esm',platform:'browser',external:runtime,minify:true,
      plugins:[{name:'compiled-component',setup(builder){
        builder.onResolve({filter:/^tenor:compiled$/},()=>({path:'compiled',namespace:'tenor'}));
        builder.onLoad({filter:/.*/,namespace:'tenor'},()=>({contents:bundledCode,loader:'js'}));
      }}],
    });
    code = wrapped.outputFiles[0].text;
  }
  if (manifest) files.push({path:'tenor-import-manifest.json',content:JSON.stringify(manifest),encoding:'utf8'});
  const source_package = {...(manifest ? {manifest} : {}),entry:path.relative(root,entryPath),files,dependencies,adaptations:[...adaptations,'Build-time NODE_ENV and import.meta.env mode flags use production. Only explicitly declared public environment values are supplied.']};
  if (Buffer.byteLength(code)>2_000_000 || Buffer.byteLength(JSON.stringify(source_package))>(archive ? 32_000_000 : 2_000_000) || files.length>(archive ? 5000 : 200)) throw new Error('Bundle or preserved package exceeds import limits. Split the example without dropping required behavior.');
  return {idempotency_key:randomUUID(),name,code,source_package,...(canvas?{canvas_id:canvas}:{}),description:'Bundled from repository source. Rendering and interactions require verification.'};
}
export async function runCli(args = process.argv.slice(2)) {
  const options = {css:[]};
  for (let i=0;i<args.length;i+=2) {
    const key=args[i].replace(/^--/,'');
    if (!['root','entry','name','out','css','canvas','manifest','archive'].includes(key) || !args[i+1]) throw new Error('Use --root --entry --name --out, optional --css and --canvas.');
    if(key==='css') options.css.push(args[i+1]); else options[key]=args[i+1];
  }
  if(!options.root || !options.entry || !options.name || !options.out) throw new Error('--root, --entry, --name and --out are required.');
  if(options.manifest) options.manifest=JSON.parse(await readFile(options.manifest,'utf8'));
  if(options.archive) options.archive=options.archive==='true';
  const result=await prepareImport(options);
  await writeFile(options.out,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});
  console.log(`Prepared ${result.source_package.files.length} source files; ${Buffer.byteLength(result.code)} runnable bytes. Saved ${options.out}. Render and interaction checks remain required.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
