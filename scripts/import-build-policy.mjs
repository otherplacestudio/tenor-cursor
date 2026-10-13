import path from 'node:path';
import {createHash} from 'node:crypto';
export const BUILD_POLICY = Object.freeze({version:1,maxAttempts:3,maxSourceBytes:24_000_000,maxFiles:4500,maxDependencies:100,maxInstalledPackages:2000,installTimeoutMs:120000,registry:'https://registry.npmjs.org/',reactVersion:'19.2.3',bundlerVersion:'0.27.4'});
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const exactVersion=/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const packageName=/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function safePath(value){
  if(typeof value!=='string'||value.length>500||path.isAbsolute(value)||value.includes('\\')||value.split('/').some(p=>!p||p==='.'||p==='..')) throw Error('Use relative source paths without traversal.');
  if(/(^|\/)(node_modules|\.git|\.env[^/]*|\.npmrc|[^/]*\.(pem|key|p12))($|\/)/i.test(value)) throw Error('Configuration secrets and node_modules cannot be submitted as source.');
  return value;
}
export function validateBuildPlan(plan){
  if(!plan||plan.version!==1||typeof plan.name!=='string'||!plan.name.trim()||plan.name.length>120) throw Error('Use a version 1 plan with a component name.');
  if(!uuid.test(plan.idempotency_key??'')) throw Error('Provide one import idempotency_key UUID and retain it through repairs.');
  if(plan.canvas_id!==undefined&&!uuid.test(plan.canvas_id)) throw Error('Invalid canvas ID.');
  if(!Array.isArray(plan.files)||!plan.files.length||plan.files.length>BUILD_POLICY.maxFiles) throw Error('Invalid source file count.');
  const paths=new Set();
  for(const file of plan.files){
    safePath(file.path);
    if(file.path.startsWith('.tenor/')||paths.has(file.path)) throw Error('Duplicate or reserved source path.');
    if(typeof file.content!=='string'||Buffer.byteLength(file.content)>2_000_000||!['utf8','base64',undefined].includes(file.encoding)) throw Error('Invalid source file content.');
    if(file.encoding==='base64'&&!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) throw Error('Invalid base64 source asset.');
    paths.add(file.path);
  }
  if(Buffer.byteLength(JSON.stringify(plan.files))>BUILD_POLICY.maxSourceBytes) throw Error('Source package exceeds 24 MB.');
  if(!paths.has(plan.entry)) throw Error('Entry must be a preserved source file.');
  const dependencies=plan.dependencies??{};
  if(!dependencies||typeof dependencies!=='object'||Array.isArray(dependencies)||Object.keys(dependencies).length>BUILD_POLICY.maxDependencies) throw Error('Too many dependencies.');
  for(const [name,version] of Object.entries(dependencies)){
    if(!packageName.test(name)||typeof version!=='string'||!exactVersion.test(version)) throw Error(`Dependency ${name} needs an exact registry version from source evidence. Ranges, Git, URLs, aliases and local paths are unsupported.`);
    if(name==='esbuild'&&version!==BUILD_POLICY.bundlerVersion) throw Error('The import builder version is pinned; source toolchain changes need an explicit adapter.');
    if(['react','react-dom'].includes(name)&&version!==BUILD_POLICY.reactVersion) throw Error(`Preview uses React ${BUILD_POLICY.reactVersion}; review runtime compatibility instead of silently replacing the requested version.`);
  }
  const adapters=plan.adapters??[];
  if(!Array.isArray(adapters)||adapters.length>20) throw Error('At most 20 adapter files are allowed.');
  for(const file of adapters){
    safePath(file.path);
    if(['.tenor/build-lock.json','.tenor/build-plan.json'].includes(file.path)||!file.path.startsWith('.tenor/')||paths.has(file.path)||typeof file.content!=='string'||Buffer.byteLength(file.content)>100_000) throw Error('Adapters must be unique text files under .tenor/. Original source cannot be overwritten.');
    paths.add(file.path);
  }
  if(plan.adapter_entry!==undefined&&!adapters.some(f=>f.path===plan.adapter_entry)) throw Error('Adapter entry must be a declared adapter file.');
  if((plan.css??[]).some(file=>!paths.has(file))) throw Error('Styles must be included source or adapter files.');
  if(adapters.length&&(!plan.adaptation_reason||typeof plan.adaptation_reason!=='string')) throw Error('Disclose why the adapter is needed.');
  if(plan.manifest&&plan.manifest.adapter!=='react-browser-v1') throw Error('Unsupported runtime adapter.');
  return plan;
}
export function validateLockfile(lock,dependencies){
  if(![2,3].includes(lock?.lockfileVersion)||!lock.packages||Object.keys(lock.packages).length>BUILD_POLICY.maxInstalledPackages) throw Error('Use an npm lockfile v2/v3 with at most 2000 packages.');
  const root=lock.packages[''];
  if(JSON.stringify(Object.entries(root?.dependencies??{}).sort())!==JSON.stringify(Object.entries(dependencies).sort())) throw Error('Lockfile root dependencies do not match this build.');
  for(const [name,version] of Object.entries(dependencies)) if(lock.packages['node_modules/'+name]?.version!==version) throw Error('Lockfile is missing a pinned direct dependency.');
  for(const [location,pkg] of Object.entries(lock.packages)){
    if(!location) continue;
    if(!location.startsWith('node_modules/')||location.includes('..')||location.includes('\\')||pkg.link) throw Error('Lockfile links or paths are unsupported.');
    if(!exactVersion.test(pkg.version??'')) throw Error('Lockfile contains an unpinned version.');
    const url=new URL(pkg.resolved);
    if(url.protocol!=='https:'||url.hostname!=='registry.npmjs.org'||url.username||url.password||url.port||url.search||url.hash) throw Error('Dependencies must resolve to the npm registry.');
    const installedName=location.slice(location.lastIndexOf('node_modules/')+'node_modules/'.length);
    if(!packageName.test(installedName)) throw Error('Invalid installed package path.');
    const expectedPath='/'+installedName+'/-/'+installedName.split('/').at(-1)+'-'+pkg.version+'.tgz';
    if(decodeURIComponent(url.pathname)!==expectedPath) throw Error('Tarball must match the installed package name and pinned version.');
    if(!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(pkg.integrity??'')) throw Error('Every package requires SHA-512 integrity.');
    if(location.endsWith('/react')||location.endsWith('/react-dom')) if(pkg.version!==BUILD_POLICY.reactVersion) throw Error('Dependency tree contains an incompatible React runtime.');
  }
  return lock;
}

/** Resolve requested direct packages from source evidence, never guess a latest version. */
export function resolveDependencyPins(requested,manifest,lockfile){
  if(!Array.isArray(requested)||requested.length>BUILD_POLICY.maxDependencies)throw Error('Request at most 100 dependencies.');
  const pinned={};const unresolved=[];
  for(const name of new Set(requested)){
    if(!packageName.test(name))throw Error('Invalid package name.');
    const declared=manifest?.dependencies?.[name]??manifest?.devDependencies?.[name]??manifest?.peerDependencies?.[name];
    if(typeof declared!=='string'){unresolved.push({name,reason:'Not declared in the supplied source manifest.'});continue;}
    if(exactVersion.test(declared)){pinned[name]=declared;continue;}
    if(/^(?:file:|link:|workspace:|https?:|git|npm:)/.test(declared)){unresolved.push({name,reason:'Local, aliased, private or non-registry source needs an explicit adapter.'});continue;}
    const lockedRoot=lockfile?.packages?.[''];
    const lockedDeclared=lockedRoot?.dependencies?.[name]??lockedRoot?.devDependencies?.[name]??lockedRoot?.peerDependencies?.[name];
    const locked=lockfile?.packages?.['node_modules/'+name];
    if(![2,3].includes(lockfile?.lockfileVersion)||lockedDeclared!==declared||!exactVersion.test(locked?.version??'')){
      unresolved.push({name,reason:'Supply the matching npm v2/v3 lockfile or extract an exact pin from the source project lockfile.'});continue;
    }
    pinned[name]=locked.version;
  }
  return {pinned,unresolved,status:unresolved.length?'needs_source_evidence':'resolved',next:'Put these direct pins in the build plan. Transitive packages are integrity-checked and locked during isolated preparation.'};
}
