/** Client-side parsing of backend responses; never retries a mutation automatically. */
export class ClientApiError extends Error {
 constructor(message:string,public status:number,public code?:string,public requestId?:string){super(message);this.name='ClientApiError';}
}
export async function readApi<T>(response:Response,fallback='Opération impossible.'):Promise<T>{
 let body:any;try{body=await response.json();}catch{throw new ClientApiError(response.status>=500?'Le service est momentanément indisponible. Réessayez.':fallback,response.status);}
 if(!response.ok||body?.success===false){
  const ref=body?.error?.requestId??response.headers.get('x-request-id');
  const requestId=typeof ref==='string'&&/^[a-f0-9-]{36}$/i.test(ref)?ref:undefined;
  const code=typeof body?.error?.code==='string'?body.error.code:undefined;
  const message=typeof body?.error?.message==='string'?body.error.message:fallback;
  const userMessage=response.status===409?'Le contenu a été modifié. Actualisez la liste avant de réessayer.':response.status===401?'Votre session a expiré. Reconnectez-vous.':response.status===429?'Trop de demandes. Réessayez dans quelques instants.':response.status>=500?'Le service est momentanément indisponible. Réessayez.':message;
  throw new ClientApiError(userMessage+(requestId&&response.status>=500?' Référence : '+requestId.slice(0,8):''),response.status,code,requestId);
 }
 if(!body||typeof body!=='object'||!('data' in body))throw new ClientApiError(fallback,response.status);
 return body.data as T;
}
