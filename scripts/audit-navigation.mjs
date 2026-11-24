#!/usr/bin/env node
/** Contrôle statique des destinations de TV+ Afrique, sans réseau ni secrets. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
function walk(dir){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const file=path.join(dir,e.name);
  if(e.name.startsWith('.')||e.name==='node_modules')return [];
  return e.isDirectory()?walk(file):/\.(tsx?|jsx?)$/.test(e.name)?[file]:[];
 });
}
const app=walk(path.join(root,'app'));
const pages=app.filter(f=>/[\\/]page\.(tsx?|jsx?)$/.test(f));
const all=[...app,...walk(path.join(root,'components'))];
function routePattern(f){
 const parts=path.relative(path.join(root,'app'),f).replaceAll('\\','/').split('/').slice(0,-1)
 .filter(p=>!p.startsWith('@')&&!/^\(.*\)$/.test(p));
 const pattern=parts.map(part=>{
  if(/^\[\[\.\.\.[^\]]+\]\]$/.test(part))return '(?:.+)?';
  if(/^\[\.\.\.[^\]]+\]$/.test(part))return '.+';
  if(/^\[[^\]]+\]$/.test(part))return '[^/]+';
  return part.replace(/[^a-zA-Z0-9_-]/g,ch=>'\\'+ch);
 });
 return new RegExp('^/'+pattern.join('/')+'/?$');
}
const routes=pages.map(routePattern);
const errors=[],warnings=[];
let links=0,buttons=0;
function check(href,source){
 if(href==='#'||href.startsWith('javascript:')){errors.push(source+' : lien sans destination ('+href+')');return}
 if(!href.startsWith('/')||href.startsWith('//'))return;
 const url=href.split(/[?#]/)[0]||'/';
 if(url.startsWith('/api/')||url.startsWith('/_next/'))return;
 links++;
 if(!routes.some(route=>route.test(url)))errors.push(source+' : route non trouvée '+url);
}
for(const file of all){
 const src=fs.readFileSync(file,'utf8');
 const label=path.relative(root,file);
 for(const m of src.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\})/g))check(m[1]??m[2]??m[3]??m[4],label);
 for(const m of src.matchAll(/\bhref\s*:\s*['"]([^'"]+)['"]/g))check(m[1],label);
 for(const m of src.matchAll(/\[\s*['"][^'"]+['"]\s*,\s*['"](\/[^'"]+)['"]\s*\]/g))check(m[1],label);
 for(const m of src.matchAll(/<button\b([\s\S]*?)>/g)){
  buttons++;
  if(!/\bonClick\s*=|\bonSubmit\s*=|\bformAction\s*=|\btype\s*=\s*['"]submit['"]|\bdata-open-live\b/.test(m[1])){
   warnings.push(label+' : bouton sans action évidente : '+m[1].replace(/\s+/g,' ').slice(0,75));
  }
 }
}
console.log('[TV+ Navigation] '+pages.length+' pages, '+links+' destinations statiques, '+buttons+' boutons.');
if(warnings.length)console.log('[TV+ Navigation] '+warnings.length+' boutons à examiner manuellement :\n'+warnings.slice(0,12).join('\n'));
if(errors.length){console.error('[TV+ Navigation] '+errors.length+' liens cassés :\n'+errors.join('\n'));process.exit(1);}
console.log('[TV+ Navigation] Toutes les destinations statiques examinées existent.');
