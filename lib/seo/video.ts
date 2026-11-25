import type {PublicEpisode} from '../db/repository';
import {parseVideoUrl,videoEmbedUrl} from '../video/providers';
import {absoluteUrl,validDate,plainText} from './public-feeds';
export function videoSeo(episode:PublicEpisode,base:string){
 const parsed=parseVideoUrl(episode.videoUrl);
 const thumbnail=episode.thumbnail?absoluteUrl(episode.thumbnail,base):undefined;
 const date=validDate(episode.publishedAt);
 const description=plainText(episode.description||episode.title||'');
 const embed=parsed?videoEmbedUrl(parsed.platform,parsed.externalId,episode.videoUrl):'';
 if(!thumbnail||!date||!embed||!episode.title||!description)return null;
 return {title:episode.title,description,thumbnail,uploadDate:date.toISOString(),embedUrl:embed,url:base+'/replays/'+encodeURIComponent(episode.id)};
}
