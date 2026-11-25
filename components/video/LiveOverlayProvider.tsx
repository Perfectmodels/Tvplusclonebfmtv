'use client';
import {createContext,useContext,useEffect,useCallback,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
const Context=createContext<{isOpen:boolean;open:()=>void;close:()=>void}|null>(null);
export function useLiveOverlay(){const value=useContext(Context);if(!value)throw Error('LiveOverlayProvider manquant');return value;}
export default function LiveOverlayProvider({children}:{children:ReactNode}){
 const router=useRouter(),open=useCallback(()=>router.push('/direct'),[router]),close=useCallback(()=>{},[]);
 useEffect(()=>{function click(e:MouseEvent){if(e.target instanceof Element&&e.target.closest('[data-open-live]')){e.preventDefault();open();}}document.addEventListener('click',click);return()=>document.removeEventListener('click',click);},[open]);
 return <Context.Provider value={{isOpen:false,open,close}}>{children}</Context.Provider>;
}
