import {handleRoute,ApiError} from '../../../../lib/api/response';
export const dynamic='force-dynamic';
// Désactivé pendant la recette : valider le trigger de profil et la politique d'inscription.
export const POST=handleRoute(async()=>{throw new ApiError('Inscription temporairement indisponible pendant la migration.',503,'UNAVAILABLE');});
