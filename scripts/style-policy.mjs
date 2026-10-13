import {readdir,readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';

/** Tailwind must never discover code, configuration or host files from a package. */
export async function validateStyleInputs(workspace){
  let count=0,bytes=0;
  const root=await realpath(workspace);
  const inside=file=>{const relative=path.relative(root,file);return !relative.startsWith('..')&&!path.isAbsolute(relative)&&/^(?:source|node_modules)\//.test(relative);};
  async function walk(directory){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      if(++count>60000)throw Error('Style preparation exceeds the source budget.');
      if(entry.name==='.bin')continue;
      const file=path.join(directory,entry.name);
      if(entry.isSymbolicLink())throw Error('Linked stylesheet inputs are unsupported.');
      if(entry.isDirectory()){await walk(file);continue;}
      if(!/\.css$/i.test(entry.name))continue;
      if(!inside(await realpath(file)))throw Error('Stylesheet input is outside the build workspace.');
      const info=await stat(file);bytes+=info.size;if(info.size>2000000||bytes>20000000)throw Error('Stylesheets exceed the preparation budget.');
      const css=(await readFile(file,'utf8')).replace(/\/\*[\s\S]*?\*\//g,'');
      if(/@[^;{]*\\/.test(css))throw Error('Escaped stylesheet directives are unsupported. Provide compiled CSS.');
      if(/@(?:plugin|config|source)\b/i.test(css))throw Error('Styles must not load executable plugins/configuration or scan external paths. Provide compiled CSS.');
      for(const match of css.matchAll(/@(?:import|reference)\s+(?:url\(\s*)?["']?([^"'\s);]+)/gi)){
        const target=match[1];
        if(/^(?:[a-z]+:|\/)/i.test(target)||target.includes('\\'))throw Error('Stylesheet imports must stay in the selected source or locked packages.');
        if(target.startsWith('.')&&(!/\.css$/.test(target)||!inside(path.resolve(path.dirname(file),target))))throw Error('Stylesheet import escapes the selected source.');
      }
    }
  }
  await walk(path.join(root,'source'));await walk(path.join(root,'node_modules'));
}
