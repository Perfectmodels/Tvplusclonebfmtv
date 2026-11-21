'use client';
import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export default function V2ArticleThumb({src,alt,compact=false}:{
  src:string|null|undefined;alt:string;compact?:boolean;
}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return src && !failed
    ? <img loading="lazy" decoding="async" src={src} alt={alt}
        onError={()=>setFailed(true)}/>
    : <span className="v2-newsroom-thumb-empty">
        <ImageIcon size={compact?17:26} aria-hidden="true"/>
        {!compact&&<small>Sans visuel</small>}
      </span>;
}
