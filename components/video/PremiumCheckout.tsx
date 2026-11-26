'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';

type Plan = { slug: string; name: string; amount: number; duration_minutes: number };
type Plans = { available: boolean; enabled: boolean; mode: string; plans: Plan[]; message?: string };
const money = (amount: number) => amount.toLocaleString('fr-FR') + ' FCFA';

function duration(minutes: number) {
  const [value, unit] = minutes % 1440 === 0 ? [minutes / 1440, 'jour'] :
    minutes % 60 === 0 ? [minutes / 60, 'heure'] : [minutes, 'minute'];
  return value + ' ' + unit + (value === 1 ? '' : 's');
}

export default function PremiumCheckout({ offer }: { offer?: string }) {
  const [data, setData] = useState<Plans | null>(null);
  const [slug, setSlug] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/premium/plans', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !body.success) throw Error('Catalogue indisponible');
        if (controller.signal.aborted) return;
        const result = body.data as Plans;
        setData(result);
        setSlug(result.plans.find(plan => plan.slug === offer)?.slug ?? result.plans[0]?.slug ?? '');
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [offer, refresh]);

  const plan = data?.plans.find(option => option.slug === slug);
  const next = '/direct' + (slug ? '?offre=' + encodeURIComponent(slug) : '');

  async function purchase() {
    if (lock.current || !plan || !data?.enabled) return;
    lock.current = true;
    setBusy(true);
    setPaymentError('');
    try {
      const response = await fetch('/api/premium/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          plan: plan.slug,
          amount: plan.amount,
          durationMinutes: plan.duration_minutes,
          confirmed: true,
        }),
        cache: 'no-store',
      });
      const body = await response.json();
      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }
      if (!response.ok || !body.success) throw Error(body.error?.message || 'Paiement indisponible.');
      const { url, reference } = body.data;
      if (url) {
        window.location.assign(url);
        return;
      }
      if (reference) {
        window.location.assign('/direct/paiement?reference=' + encodeURIComponent(reference));
        return;
      }
      throw Error('Le paiement n’a pas pu être préparé.');
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Paiement indisponible.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const unavailable = loadError || (data && !data.available);
  return (
    <div className="premium-offers direct-offers">
      {!data && !loadError && <p role="status">Chargement des formules…</p>}
      {unavailable && (
        <div className="direct-offer-status">
          <p role="status">Les formules sont momentanément indisponibles.</p>
          <button className="premium-secondary" type="button" onClick={() => {
            setData(null);
            setLoadError(false);
            setRefresh(value => value + 1);
          }}>Réessayer</button>
        </div>
      )}
      {data?.available && data.plans.length === 0 && <p role="status">Aucune formule d’accès n’est disponible pour le moment.</p>}
      {data?.available && data.plans.length > 0 && (
        <>
          <fieldset disabled={busy}>
            <legend>Formules du direct</legend>
            {data.plans.map(option => (
              <label key={option.slug} className={'premium-option' + (slug === option.slug ? ' selected' : '')}>
                <input type="radio" name="premium-plan" checked={slug === option.slug} onChange={() => {
                  setSlug(option.slug);
                  setPaymentError('');
                }} />
                <span><strong>{option.name}</strong><small>{duration(option.duration_minutes)} d’accès</small></span>
                <b>{money(option.amount)}</b>
              </label>
            ))}
          </fieldset>
          {data.enabled ? (
            <>
              <p className="direct-access-note"><LockKeyhole size={16} aria-hidden="true" /> Paiement unique via SingPay. L’accès s’active après confirmation.</p>
              {data.mode === 'sandbox' && <p>Mode test SingPay. Les paiements de test ne donnent aucun accès réel.</p>}
              {sessionExpired ? (
                <Link className="premium-primary" href={'/connexion?next=' + encodeURIComponent(next)}>Reconnectez-vous pour continuer</Link>
              ) : (
                <button className="premium-primary" type="button" disabled={!plan || busy} onClick={() => void purchase()}>
                  {busy ? 'Préparation du paiement…' : plan ? 'Payer ' + money(plan.amount) + ' avec SingPay' : 'Choisir une formule'} <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
              {paymentError && <p role="alert" className="premium-error">{paymentError}</p>}
            </>
          ) : <p role="status">Le paiement en ligne est indisponible pour le moment.</p>}
        </>
      )}
      <Link className="direct-payment-history" href="/direct/paiement">Mes accès et paiements</Link>
    </div>
  );
}
