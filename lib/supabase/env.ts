// Shim temporaire pour les anciens modules : aucune ancienne clé n'est lue.
export function isSupabaseConfigured(){return false;}
export function getServerEnv():{url:string;publishableKey:string;secretKey:string}{throw new Error('Ancien fournisseur désactivé.');}
export function getPublicEnv():{url:string;key:string}{throw new Error('Ancien fournisseur désactivé.');}
