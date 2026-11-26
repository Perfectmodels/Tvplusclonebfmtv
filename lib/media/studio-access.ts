import 'server-only';
import {redirect} from 'next/navigation';
import {getV2Actor} from '../auth/v2-admin';
import {canManageStudio,canReviewStudio,type StudioKind} from './studio-types';
export async function studioAccess(kind:StudioKind){const actor=await getV2Actor();if(!actor)redirect('/connexion?next=/admin-v2/studio');if(!canManageStudio(actor.permissions,kind))redirect('/acces-refuse');return {actor,reviewer:canReviewStudio(actor.permissions)};}
