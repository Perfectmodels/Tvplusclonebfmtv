'use client';
import {useState} from 'react';
import {Eye,EyeOff,KeyRound,Copy,Check} from 'lucide-react';

const groups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%*-_+'];
function randomIndex(max:number){const values=new Uint32Array(1);const ceiling=Math.floor(2**32/max)*max;do{crypto.getRandomValues(values);}while(values[0]>=ceiling);return values[0]%max;}
function generatePassword(){const all=groups.join(''),chars=groups.map(g=>g[randomIndex(g.length)]);while(chars.length<20)chars.push(all[randomIndex(all.length)]);for(let i=chars.length-1;i>0;i--){const j=randomIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}return chars.join('');}

export default function PasswordFields({password,repeat,onPassword,onRepeat,disabled=false,title='Mot de passe'}:{password:string;repeat:string;onPassword:(s:string)=>void;onRepeat:(s:string)=>void;disabled?:boolean;title?:string}){
 const [show,setShow]=useState(false),[copyStatus,setCopyStatus]=useState(''),[generated,setGenerated]=useState(false);
 const rules=[password.length>=10,/\d/.test(password),/[a-z]/.test(password)&&/[A-Z]/.test(password),/[^a-zA-Z0-9]/.test(password),password.length>=16];
 const score=rules.filter(Boolean).length;const match=!!repeat&&repeat===password;
 const strength=!password?'À définir':!rules[0]||!rules[1]?'Insuffisant':score>=4?'Fort':'Acceptable';
 function generate(){const value=generatePassword();onPassword(value);onRepeat(value);setShow(true);setGenerated(true);setCopyStatus('');}
 async function copy(){try{await navigator.clipboard.writeText(password);setCopyStatus('Copié. Enregistrez-le dans votre gestionnaire de mots de passe.');}catch{setCopyStatus('Copie indisponible : sélectionnez le mot de passe affiché.');}}
 return <div className="tv-auth-password-tools">
 <label><span>{title}</span><span className="auth-password"><input required minLength={10} maxLength={200} pattern=".*[0-9].*" autoComplete="new-password" name="new-password" type={show?'text':'password'} value={password} disabled={disabled} onChange={e=>{onPassword(e.target.value);setGenerated(false);setCopyStatus('');}} aria-describedby="password-strength"/><button type="button" disabled={disabled} aria-label={show?'Masquer':'Afficher le mot de passe'} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
 <div className="tv-auth-tools"><button type="button" disabled={disabled} onClick={generate}><KeyRound size={15}/> Générer un mot de passe</button>{generated&&<button type="button" disabled={disabled} onClick={copy}><Copy size={15}/> Copier</button>}</div>
 <div id="password-strength" className="tv-auth-strength"><div className="tv-auth-strength-label"><span>Sécurité estimée</span><strong>{strength}</strong></div><div className="tv-auth-meter" aria-hidden="true">{Array.from({length:5},(_,i)=><i key={i} data-active={!!password&&i<score}/>)}</div><small>10 caractères minimum et un chiffre. Privilégiez 16 caractères ou plus, avec des lettres et symboles variés.</small></div>
 {copyStatus&&<small role="status">{copyStatus}</small>}
 <label><span>Confirmer le mot de passe</span><input required type={show?'text':'password'} autoComplete="new-password" name="confirm-password" value={repeat} disabled={disabled} onChange={e=>onRepeat(e.target.value)} aria-invalid={!!repeat&&!match}/></label>
 {repeat&&<small className={match?'tv-auth-match':'tv-auth-mismatch'} role="status">{match?<><Check size={14}/> Les mots de passe correspondent.</>:'Les mots de passe ne correspondent pas.'}</small>}
 </div>;
}
