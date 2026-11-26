import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
// Compatibilité de compilation des anciennes routes. Toute tentative d'accès échoue
// localement, sans créer de client ni lire d'anciennes clés.
const disabled=new Proxy({},{get(){throw new Error('Accès historique désactivé. Cette opération doit utiliser MySQL LWS.');}}) as SupabaseClient;
export function getServerSupabase():SupabaseClient{return disabled;}
export const getAdminSupabase=getServerSupabase;
export const getPublicServerSupabase=getServerSupabase;
