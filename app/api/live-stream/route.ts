import {NextResponse} from 'next/server';
import {premiumAccess,issuePlayback} from '../../../lib/video/premium';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};
export async function GET(){
 const access=await premiumAccess();
 if(!access.authenticated||!access.entitled||!access.configured||!access.userId)return NextResponse.json({success:false,error:'Accès Premium requis'},{status:access.authenticated?403:401,headers});
 const source=await issuePlayback(access.userId);
 if(!source)return NextResponse.json({success:false,error:'Lecteur sécurisé indisponible'},{status:503,headers});
 return NextResponse.json({success:true,data:{enabled:true,title:'TV+ Afrique en direct',description:'',hlsUrl:'',embedUrl:source.embedUrl,playbackUrl:'',expiresAt:source.expiresAt,standbyMessage:'Le direct reprendra prochainement.'}},{headers});
}
