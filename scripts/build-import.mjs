/**
 * Read-only package metadata inspection plus the retired package-build surface.
 *
 * Unknown-package execution stays disabled until Tenor has a hard VM/container
 * boundary. Keeping the exported build function fail-closed prevents callers
 * from bypassing the disabled CLI or desktop/server capability checks.
 */
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export {BUILD_POLICY,validateBuildPlan,validateLockfile} from './import-build-policy.mjs';

export const PACKAGE_BUILDS_DISABLED =
  'Standalone, hosted, and Mac package builds are disabled until a hard VM or container isolation boundary is available. Self-contained component import remains available through MCP.';

/** Read only bounded public declaration data from exact installed packages. */
export async function inspectPackages(workspace,names){
  const context={};
  for(const name of names){
    const root=path.join(workspace,'node_modules',name),pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
    const files={},omissions=[];let bytes=0,count=0,entries=0;
    const omitted=(file,reason)=>{if(omissions.length<50)omissions.push({path:file,reason});};
    const walk=async(directory,depth)=>{
      if(depth>5){omitted(directory,'directory depth exceeds 5');return;}
      for(const entry of (await readdir(path.join(root,directory),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
        if(entries++>=5000){omitted(directory||'.','package entry count exceeds 5000');return;}
        const file=path.posix.join(directory,entry.name);
        if(entry.name==='node_modules')continue;
        if(entry.isSymbolicLink()){omitted(file,'symbolic links are not inspected');continue;}
        if(entry.isDirectory())await walk(file,depth+1);
        else if(/\.d\.(?:ts|mts|cts)$/i.test(entry.name)){
          const info=await stat(path.join(root,file));
          if(info.size>100000){omitted(file,'declaration exceeds 100000 bytes');continue;}
          if(bytes+info.size>500000){omitted(file,'declaration total exceeds 500000 bytes');continue;}
          if(count>=200){omitted(file,'declaration count exceeds 200');continue;}
          files[file]=await readFile(path.join(root,file),'utf8');bytes+=info.size;count++;
        }
      }
    };
    await walk('',0);
    context[name]={name:pkg.name,version:pkg.version,license:pkg.license,types:pkg.types||pkg.typings,main:pkg.main,module:pkg.module,exports:pkg.exports,typesVersions:pkg.typesVersions,peerDependencies:pkg.peerDependencies,files,inspection:{complete:omissions.length===0,omissions}};
  }
  return context;
}

/** Retained as a fail-closed compatibility export for older plugin clients. */
export async function buildImport(){
  throw Error(PACKAGE_BUILDS_DISABLED);
}

export async function runBuildCli(){
  throw Error(PACKAGE_BUILDS_DISABLED);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await runBuildCli();
