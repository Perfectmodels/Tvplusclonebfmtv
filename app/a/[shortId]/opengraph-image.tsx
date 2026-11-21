import { ImageResponse } from 'next/og';
import { getArticleByShortId } from '../../../lib/db/repository';

export const alt = 'TV+ Afrique — Actualités';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

type Props = { params: Promise<{shortId: string}> };

// Seuls les hébergeurs effectivement employés par notre médiathèque sont interrogés.
async function getCoverImage(url: string): Promise<string | undefined> {
  try {
    const target = new URL(url);
    const host = target.hostname.toLowerCase();
    const allowed = host === 'i.ibb.co' || host.endsWith('.supabase.co')
      || host.endsWith('.supabase.in') || host === 'images.unsplash.com';
    if (target.protocol !== 'https:' || !allowed) return;
    const response = await fetch(target.toString(), {
      signal: AbortSignal.timeout(4500),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return;
    const type = response.headers.get('content-type') || '';
    if (!/^image\/(jpeg|png|webp|avif)/i.test(type)) return;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 4_500_000) return;
    return `data:${type.split(';')[0]};base64,${Buffer.from(bytes).toString('base64')}`;
  } catch {
    return;
  }
}

export default async function Image({ params }: Props) {
  const { shortId } = await params;
  const { item } = await getArticleByShortId(shortId);
  const photo = item?.image ? await getCoverImage(item.image) : undefined;
  const headline = (item?.title ?? 'L’actualité du Gabon et de l’Afrique').trim();
  const summary = (item?.seoDescription || item?.chapter || item?.summary || '')
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const category = (item?.category || 'Actualité').toLocaleUpperCase('fr-FR');

  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', position: 'relative',
      backgroundColor: '#071d3a', color: '#fff', fontFamily: 'Arial, sans-serif',
      overflow: 'hidden',
    }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          objectFit: 'cover',
        }} />
      ) : null}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'linear-gradient(90deg, #04172e 0%, rgba(4,23,46,.97) 16%, rgba(4,23,46,.88) 34%, rgba(4,23,46,.53) 52%, rgba(4,23,46,0) 70%)',
        display: 'flex',
      }} />
      <div style={{
        position: 'absolute', inset: 0, padding: '54px 56px 43px', display: 'flex',
        flexDirection: 'column', justifyContent: 'space-between', width: 730,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{display:'flex',background:'#e52436',width:8,height:39,borderRadius:2}} />
          <div style={{display:'flex',fontWeight:900,fontSize:30,letterSpacing:-1}}>TV+ AFRIQUE</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start'}}>
          <div style={{display:'flex',background:'#d51c38',borderRadius:3,padding:'11px 16px',
            fontWeight:800,fontSize:18,letterSpacing:2,marginBottom:20}}>
            {category.slice(0,30)}
          </div>
          <div style={{
            display:'flex',fontSize:headline.length>95?37:44,fontWeight:900,lineHeight:1.08,
            letterSpacing:-1.5, maxWidth:645, marginBottom:19,
          }}>{headline.length>130?headline.slice(0,127).trimEnd()+'…':headline}</div>
          <div style={{
            display:'flex',fontSize:22,lineHeight:1.32,color:'#d9e3f2',maxWidth:600,
          }}>{summary.length>155?summary.slice(0,152).trimEnd()+'…':summary}</div>
        </div>
        <div style={{display:'flex',height:4,width:106,background:'#e52436',borderRadius:2}} />
      </div>
      <div style={{
        position:'absolute',right:0,bottom:0,width:260,height:10,background:'#e52436',
        display:'flex',
      }} />
    </div>,
    size,
  );
}
