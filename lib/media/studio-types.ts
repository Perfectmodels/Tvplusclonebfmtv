import {z} from 'zod';
import {parseVideoUrl} from '../video/providers';
export const kinds=['reel','podcast','reportage'] as const;
export type StudioKind=typeof kinds[number];
export const states=['draft','production','review','approved','scheduled','published','archived'] as const;
export type StudioState=typeof states[number];
export const stateLabels:Record<StudioState,string>={draft:'Brouillon',production:'En production',review:'À valider',approved:'Validé',scheduled:'Programmé',published:'Publié',archived:'Archivé'};
export const formats={reel:{slug:'reels',title:'TV+ Reels',singular:'Reel',description:'Vidéos courtes verticales, légendes et publication.',publicPath:'/reels'},podcast:{slug:'podcasts',title:'TV+ Podcasts',singular:'Podcast',description:'Séries, épisodes audio et entretiens.',publicPath:'/podcasts'},reportage:{slug:'reportages',title:'Reportages TV+',singular:'Reportage',description:'Reportages, interviews et productions journalistiques.',publicPath:'/videos'}} as const;
export function studioKind(slug:string):StudioKind|null{return kinds.find(k=>formats[k].slug===slug)??null;}
export function httpsUrl(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port;}catch{return false;}}
export function mediaSource(kind:StudioKind,value:string){
 if(!httpsUrl(value))return false;
 const u=new URL(value);
 if(kind==='podcast')return /\.(mp3|ogg|wav|m4a|aac)(?:$)/i.test(u.pathname)||['open.spotify.com','spotify.com','www.spotify.com','soundcloud.com','www.soundcloud.com','www.deezer.com','deezer.com','podcasts.apple.com'].includes(u.hostname);
 return !!parseVideoUrl(value)||/\.(mp4|webm|m3u8)$/i.test(u.pathname);
}
export const metaSchema=z.object({series:z.string().trim().max(140).default(''),season:z.number().int().min(1).max(1000).nullable().default(null),episode:z.number().int().min(1).max(100000).nullable().default(null),host:z.string().trim().max(160).default(''),guest:z.string().trim().max(300).default(''),journalist:z.string().trim().max(160).default(''),location:z.string().trim().max(160).default(''),credits:z.string().trim().max(500).default(''),caption:z.string().trim().max(2000).default(''),keywords:z.string().trim().max(500).default(''),transcript:z.string().trim().max(20000).default(''),reportType:z.enum(['reportage','interview','documentaire','decryptage']).default('reportage'),relatedArticle:z.string().trim().max(160).refine(v=>!v||/^\/(?:a|article)\/[a-zA-Z0-9_-]+$/.test(v),'Lien interne /a/... ou /article/...').default('')});
export type StudioMeta=z.infer<typeof metaSchema>;
export const blankMeta=():StudioMeta=>metaSchema.parse({});
export const saveSchema=z.object({kind:z.enum(kinds),id:z.string().uuid().optional(),revision:z.number().int().nonnegative().optional(),title:z.string().trim().min(3).max(200),description:z.string().trim().max(5000),category:z.string().trim().max(100),source_url:z.string().trim().max(1300),thumbnail_url:z.string().trim().max(1300).refine(v=>!v||httpsUrl(v),'Couverture HTTPS requise'),duration_seconds:z.number().int().positive().max(864000).nullable(),studio_meta:metaSchema}).superRefine((v,ctx)=>{if(v.source_url&&!mediaSource(v.kind,v.source_url))ctx.addIssue({code:'custom',path:['source_url'],message:'Source incompatible avec ce format.'});if(v.id&&v.revision===undefined)ctx.addIssue({code:'custom',path:['revision'],message:'Révision requise.'});});
export type StudioForm=z.infer<typeof saveSchema>;
export type StudioItem=StudioForm&{id:string;revision:number;state:StudioState;published_at:string|null;updated_at:string|null};
export type StudioList={items:StudioItem[];total:number;page:number;pageSize:number;counts:Partial<Record<StudioState,number>>};
export function canManageStudio(permissions:string[],kind:StudioKind){return permissions.includes('shows.manage')||permissions.includes('studio.'+kind+'_manage');}
export function canReviewStudio(permissions:string[]){return permissions.includes('articles.review')||permissions.includes('settings.manage');}
export function targets(state:StudioState,reviewer:boolean):StudioState[]{
 switch(state){case 'draft':return ['production','review','archived'];case 'production':return ['draft','review','archived'];case 'review':return reviewer?['production','approved','archived']:[];case 'approved':return reviewer?['production','published','scheduled','archived']:[];case 'scheduled':case 'published':return reviewer?['production','archived']:[];case 'archived':return reviewer?['draft']:[];}
}
export function readyForReview(form:Pick<StudioForm,'kind'|'source_url'|'thumbnail_url'|'title'>){return form.title.trim().length>=3&&mediaSource(form.kind,form.source_url)&&httpsUrl(form.thumbnail_url);}
