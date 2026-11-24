import {NextRequest,NextResponse} from 'next/server';
import {getTvplusV2PublicClient} from '../../../lib/db/v2-public';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!origin||origin!==request.nextUrl.origin)return NextResponse.json({error:'Origine refusée'},{status:403});
  if((request.headers.get('sec-fetch-site')||'').toLowerCase()==='cross-site')return NextResponse.json({error:'Requête refusée'},{status:403});
  if(/bot|crawler|spider|preview|facebookexternalhit|whatsapp|googlebot|bingbot/i.test(request.headers.get('user-agent')||''))return NextResponse.json({reads:null},{status:204});
  let shortCode='';
  try{const body=await request.json();shortCode=String(body?.shortCode||'');}catch{return NextResponse.json({error:'Requête invalide'},{status:400});}
  if(!/^[A-Za-z0-9_-]{8}$/.test(shortCode))return NextResponse.json({error:'Article invalide'},{status:400});
  try{
    const {data,error}=await getTvplusV2PublicClient().rpc('record_public_article_read',{p_short_code:shortCode});
    if(error)throw error;
    return NextResponse.json({reads:Number(data)||0},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'Compteur indisponible'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
