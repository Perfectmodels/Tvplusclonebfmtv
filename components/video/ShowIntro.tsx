import ReplayEmbed from './ReplayEmbed';
import {parseVideoUrl} from '../../lib/video/providers';
export default function ShowIntro({title,url,poster}:{title:string;url?:string|null;poster?:string}){
 if(!url)return null;
 return <section className="tvplus-show-intro" aria-label={'Générique de '+title}><h2>Générique de l’émission</h2>{parseVideoUrl(url)?<ReplayEmbed title={'Générique · '+title} url={url} thumbnail={poster}/>: /^https:\/\/[^\s]+\.(mp4|webm)(?:\?.*)?$/i.test(url)?<video controls preload="none" src={url} poster={poster||undefined} style={{width:'100%',aspectRatio:'16/9',background:'#102d53'}}/>:null}</section>;
}
