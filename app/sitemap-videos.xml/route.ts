import {getEpisodes} from '../../lib/db/repository';
import {getSiteUrl} from '../../lib/articles/site-url';
import {videoSeo} from '../../lib/seo/video';
import {escapeXml as x,xmlResponse,unavailableFeed} from '../../lib/seo/public-feeds';
export const revalidate=600;
export async function GET(){
 try{
 const [base,result]=await Promise.all([getSiteUrl(),getEpisodes(500)]);
 if(result.error) return unavailableFeed();
 const videos=result.data.map(e=>videoSeo(e,base)).filter((v):v is NonNullable<typeof v>=>v!==null);
 const entries=videos.map(v=>'<url><loc>'+x(v.url)+'</loc><video:video><video:thumbnail_loc>'+x(v.thumbnail)+'</video:thumbnail_loc><video:title>'+x(v.title.slice(0,100))+'</video:title><video:description>'+x(v.description.slice(0,2048))+'</video:description><video:player_loc>'+x(v.embedUrl)+'</video:player_loc><video:publication_date>'+v.uploadDate+'</video:publication_date></video:video></url>');
 return xmlResponse('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'+entries.join('')+'</urlset>');
 }catch{return unavailableFeed();}
}
