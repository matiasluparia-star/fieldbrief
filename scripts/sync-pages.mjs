import {readdir,copyFile,cp,writeFile} from 'node:fs/promises';
for(const e of await readdir('dist',{withFileTypes:true})){if(e.isDirectory())await cp(`dist/${e.name}`,`docs/${e.name}`,{recursive:true});else await copyFile(`dist/${e.name}`,`docs/${e.name}`);}
await writeFile('docs/.nojekyll','');
console.log('Static app copied from dist to docs for GitHub Pages.');
