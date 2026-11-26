'use client';

import { useRef, useState } from 'react';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const locked=useRef(false);
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  async function logout() {
    if(locked.current)return;
    locked.current=true;setPending(true);setError('');
    try {
      const response=await fetch('/api/auth/logout',{method:'POST'});
      if(!response.ok)throw new Error('La déconnexion a échoué. Réessayez.');
      window.location.replace('/');
    } catch(e) {
      setError(e instanceof Error?e.message:'Déconnexion indisponible.');
    } finally {locked.current=false;setPending(false);}
  }
  return <><button type="button" className="auth-submit auth-logout" onClick={logout} disabled={pending}>
      <LogOut size={16} /> {pending?'Déconnexion…':'Se déconnecter'}
    </button>{error&&<p className="form-error" role="alert">{error}</p>}</>;
}
