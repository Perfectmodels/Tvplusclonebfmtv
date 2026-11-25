import {NextRequest,NextResponse} from 'next/server';
import {listArticles} from '../../../../lib/db/repository';
export async function GET(request:NextRequest){
 const page=Math.max(1,Math.min(2000,Math.floor(Number(request.nextUrl.searchParams.get('page'))||1)));
 const excludeSlugs=request.nextUrl.searchParams.getAll('exclude').filter(s=>/^[a-z0-9-]{1,120}$/i.test(s)).slice(0,2);
 try{const data=await listArticles({page,pageSize:10,excludeSlugs});return NextResponse.json({items:data.items,total:data.total},{headers:{'Cache-Control':'public, s-maxage=60, stale-while-revalidate=60'}});}
 catch{return NextResponse.json({error:'Fil indisponible'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
