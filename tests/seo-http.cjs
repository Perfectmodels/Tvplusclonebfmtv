const {createServer} = require('node:http');
const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const now = Date.now();
const row = (id, time) => ({
  id, slug:'exemple-'+id, short_code:id, title:'Essai & actualité', excerpt:'Un chapeau <b>public</b> & factuel',
  author_name:'Panfil Ebo', published_at:new Date(time).toISOString().slice(0,19).replace('T',' '),
  updated_at:null, category:'Économie', cover_url:'https://example.test/cover.jpg?x=1&y=2',
  cover_alt:'Illustration', country_code:'GA', content_html:'<p>Article publié</p>', article_reads:1,
});
const fresh = row('SEOtest1', now-3600000);
const archive = row('SEOtest2', now-3*86400000);
const mock = createServer((request,response)=>{
  const p = new URL(request.url,'http://localhost').searchParams;
  const articles = p.get('resource') === 'articles';
  const items = !articles ? [] : p.has('code') ? [fresh,archive].filter(x=>x.short_code===p.get('code'))
    : p.has('slug') ? [fresh,archive].filter(x=>x.slug===p.get('slug'))
    : Number(p.get('offset')) >= 200 ? [archive] : [fresh,archive];
  response.setHeader('content-type','application/json');
  response.end(JSON.stringify({items,total:articles?201:0}));
});
mock.listen(4281,'127.0.0.1');
const next = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','4280','--hostname','127.0.0.1'],{
  stdio:['ignore','ignore','inherit'],
  env:{...process.env,SUPABASE_SCHEMA_MODE:'tvplus-v2',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:4280',LWS_EDITORIAL_API_URL:'http://127.0.0.1:4281'}
});
const base='http://127.0.0.1:4280';
const get=async path=>{const r=await fetch(base+path);assert.equal(r.status,200,path);return r.text();};
(async()=>{
  for(let i=0;i<60;i++){try{await get('/robots.txt');break}catch{await new Promise(r=>setTimeout(r,300));}}
  const index=await get('/sitemap.xml');
  assert.match(index,/sitemap-articles-2\.xml/);
  assert.doesNotMatch(index,/sitemap-articles-3\.xml/);
  const news=await get('/sitemap-news.xml');
  assert.match(news,/SEOtest1/);assert.doesNotMatch(news,/SEOtest2/);
  assert.match(news,/Essai &amp; actualité/);
  assert.match(await get('/sitemap-articles-2.xml'),/SEOtest2/);
  assert.equal((await fetch(base+'/sitemap-notfound.xml')).status,404);
  const rss=await get('/rss.xml');
  assert.match(rss,/Un chapeau public &amp; factuel/);
  const firstArchivePage = await get('/actualites');
  assert.match(firstArchivePage, /actualites\?page=2/);
  const secondArchivePage = await get('/actualites?page=2');
  assert.match(secondArchivePage, /<link rel="canonical" href="http:\/\/127.0.0.1:4280\/actualites\?page=2"/);
  const outOfRange = await fetch(base+'/actualites?page=10');
  const notFoundHtml = await outOfRange.text();
  assert.ok(outOfRange.status === 404 || /<meta name="robots" content="noindex"/.test(notFoundHtml));
  const detail=await get('/a/SEOtest1');
  assert.match(detail,/Panfil Ebo/);
  assert.match(detail,/NewsArticle/);assert.match(detail,/BreadcrumbList/);
  assert.match(detail,/<link rel="canonical" href="http:\/\/127.0.0.1:4280\/a\/SEOtest1"/);
  const old=await fetch(base+'/article/exemple-SEOtest1',{redirect:'manual'});
  assert.ok(old.status===308 || (await old.text()).includes('NEXT_REDIRECT;replace;/a/SEOtest1;308'));
  assert.equal((await fetch(base+'/api/admin-v2/seo',{method:'POST',body:'{}'})).status,401);
  console.log('Index paginé, actualités 48 h, échappement XML, RSS, signature, JSON-LD, canonical, redirection et authentification vérifiés.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{next.kill();mock.close();});
