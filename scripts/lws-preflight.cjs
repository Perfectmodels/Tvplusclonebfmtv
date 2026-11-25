'use strict';
// Charger les fichiers .env de Next.js sans afficher les secrets.
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
if(root.split(path.sep).includes('public_html')){console.error('Refus : placer les sources et les secrets hors public_html.');process.exit(1);}
if(Number(process.versions.node.split('.')[0])<22){console.error('Node.js 22 ou supérieur requis pour cette recette.');process.exit(1);}
if(!fs.existsSync(path.join(root,'app.js'))||!fs.existsSync(path.join(root,'package-lock.json'))){console.error('Racine de projet invalide.');process.exit(1);}
try{require('@next/env').loadEnvConfig(root,false,{info(){},error(){console.error('Chargement de configuration impossible.');}});}catch{console.error('Installer les dépendances via Setup Node.js App.');process.exit(1);}
const errors=[];
for(const key of ['LWS_EDITORIAL_API_URL','LWS_EDITORIAL_SERVICE_KEY','AUTH_SESSION_SECRET','NEXT_PUBLIC_SITE_URL'])if(!process.env[key]?.trim())errors.push(key+' manquant');
if((process.env.AUTH_SESSION_SECRET||'').length<32)errors.push('AUTH_SESSION_SECRET : 32 caractères minimum');
for(const key of ['LWS_EDITORIAL_API_URL','NEXT_PUBLIC_SITE_URL']){
 try{const url=new URL(process.env[key]||'');if(url.protocol!=='https:'||url.username||url.password||(key==='NEXT_PUBLIC_SITE_URL'&&(url.pathname!=='/'||url.search||url.hash)))throw Error();}catch{errors.push(key+' : URL HTTPS invalide');}
}
for(const key of ['SINGPAY_ENABLED','INFOBIP_SEND_ENABLED','INFOBIP_BOT_ENABLED'])if(process.env[key]==='true')errors.push(key+' : désactiver pour la recette LWS');
for(const key of ['BLOB_READ_WRITE_TOKEN','CRON_SECRET','GROQ_API_KEY','LIVE_TOKEN_BROKER_URL','LIVE_TOKEN_BROKER_SECRET','LIVE_EMBED_HOSTS'])if(!process.env[key]?.trim())console.warn('Option non configurée : '+key);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('Préflight LWS OK — paramètres présents, paiements et envois désactivés. Aucun appel externe.');
