import {NextResponse} from 'next/server';
import {getNewsFeed} from '../../../../lib/rss/news';
export async function GET(){try{const data=await getNewsFeed(20);return NextResponse.json({items:data.items.map(({id,time,title})=>({id,time,title}))},{headers:{'Cache-Control':'public,s-maxage=120,stale-while-revalidate=120'}});}catch{return NextResponse.json({error:'Flux indisponible'},{status:503,headers:{'Cache-Control':'no-store'}});}}
