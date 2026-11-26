// Configure l'URL de callback du portefeuille SingPay.
// Usage : node --env-file=.env.local scripts/set-singpay-callback.mjs
const clientId = process.env.SINGPAY_CLIENT_ID?.trim();
const clientSecret = process.env.SINGPAY_CLIENT_SECRET?.trim();
const walletId = process.env.SINGPAY_WALLET_ID?.trim();
const origin = (process.env.SINGPAY_RETURN_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');

if (!clientId || !clientSecret || !walletId || !origin) {
  console.error('Variables manquantes : SINGPAY_CLIENT_ID, SINGPAY_CLIENT_SECRET, SINGPAY_WALLET_ID, SINGPAY_RETURN_ORIGIN.');
  process.exit(1);
}

const base = 'https://gateway.singpay.ga/v1';
const headers = {
  'x-client-id': clientId,
  'x-client-secret': clientSecret,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function call(path, init = {}) {
  const response = await fetch(base + path, { ...init, headers, redirect: 'error' });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${path} : ${JSON.stringify(body).slice(0, 400)}`);
  return body;
}

const callbackURL = origin + '/direct/paiement';
console.log('Portefeuille :', walletId);
console.log('Callback :', callbackURL);

const before = await call('/portefeuille/api/' + encodeURIComponent(walletId));
console.log('Callback actuel :', before?.callbackURL || '(non défini)');

await call('/portefeuille/api/' + encodeURIComponent(walletId), {
  method: 'PUT',
  body: JSON.stringify({ callbackURL }),
});
const after = await call('/portefeuille/api/' + encodeURIComponent(walletId));
console.log('Callback enregistré :', after?.callbackURL || '(non confirmé)');
