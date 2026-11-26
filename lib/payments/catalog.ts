import 'server-only';
import {z} from 'zod';
import {getTvplusV2PublicClient} from '../db/v2-public';

export const settingsSchema=z.object({
  checkout_enabled:z.boolean(),
  golive_confirmed:z.boolean(),
  checkout_hosts:z.string().max(1500),
  return_origin:z.string().max(300),
});
export type PremiumSettings=z.infer<typeof settingsSchema>;
export const emptySettings:PremiumSettings={checkout_enabled:false,golive_confirmed:false,checkout_hosts:'',return_origin:''};

const plan=z.object({
  slug:z.string().min(1).max(50),
  name:z.string().min(1).max(120),
  amount:z.coerce.number().int().positive(),
  duration_minutes:z.coerce.number().int().positive(),
  active:z.boolean().default(true),
});
export type PremiumPlan = Omit<z.infer<typeof plan>, 'active'>;

/** Formule officielle : 500 FCFA pour 24 h d’accès au direct. */
export const DEFAULT_PLANS: PremiumPlan[] = [
  { slug: 'direct-24h', name: 'Accès direct 24 h', amount: 500, duration_minutes: 1440 },
];

const planList=z.array(plan);
const settingRow=settingsSchema.partial();

/**
 * Catalogue 100 % Supabase. Sans table configurée, on utilise la formule officielle
 * et les réglages d’environnement : le parcours reste affichable en attendant la migration.
 */
export async function premiumCatalog(): Promise<{plans: PremiumPlan[]; settings: PremiumSettings}> {
  const settings: PremiumSettings = {
    ...emptySettings,
    checkout_enabled: process.env.SINGPAY_ENABLED === 'true',
    golive_confirmed: process.env.SINGPAY_GOLIVE_CONFIRMED === 'true',
    checkout_hosts: process.env.SINGPAY_CHECKOUT_HOSTS?.trim() ?? '',
    return_origin: process.env.SINGPAY_RETURN_ORIGIN?.trim() ?? '',
  };
  try {
    const db=getTvplusV2PublicClient();
    const [plansResult,settingsResult]=await Promise.all([
      db.from('premium_plans').select('slug,name,amount,duration_minutes,active').eq('active',true).order('amount'),
      db.from('premium_settings').select('checkout_enabled,golive_confirmed,checkout_hosts,return_origin').eq('id',1).maybeSingle(),
    ]);
    if (!plansResult.error) {
      const parsed=planList.safeParse(plansResult.data);
      if (parsed.success && parsed.data.length) {
        return {
          plans: parsed.data.filter(item => item.active).map(({slug,name,amount,duration_minutes}) => ({slug,name,amount,duration_minutes})),
          settings: settingsResult.data && !settingsResult.error ? {...settings,...settingRow.parse(settingsResult.data)} : settings,
        };
      }
    }
  } catch {
    // La page doit rester présentable même si les tables de recette ne sont pas créées.
  }
  return {plans: DEFAULT_PLANS, settings};
}
