'use strict';
const L = require('./_lib/list');
const page = (fr, ok) => `<!doctype html><html lang="${fr ? 'fr' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Mai Deluxe</title></head>
<body style="margin:0;background:#faf9f5;font-family:Georgia,serif;color:#171717;text-align:center;padding:60px 20px"><img src="/assets/img-5b020a8220.png" alt="Mai Deluxe" style="width:220px;max-width:70%;background:#080808;padding:14px">
<h1 style="font-weight:normal;font-size:26px;margin:28px 0 10px">${ok ? (fr ? 'Vous êtes désabonné(e).' : 'You have been unsubscribed.') : (fr ? 'Lien invalide ou expiré.' : 'This link is invalid or has expired.')}</h1>
<p style="color:#56524e">${ok ? (fr ? 'Vous ne recevrez plus les courriels de la Liste privée. Vous pouvez vous réinscrire à tout moment sur le site.' : 'You will no longer receive Private List emails. You can join again at any time on the website.') : (fr ? 'Écrivez-nous à hello@mai-deluxe.com et nous vous retirerons de la liste.' : 'Write to hello@mai-deluxe.com and we will remove you from the list.')}</p>
<p><a href="/" style="color:#8a6a2e">mai-deluxe.com</a></p></body></html>`;
exports.handler = async (event) => {
  const t = (event.queryStringParameters || {}).t || '';
  const st = L.store(event);
  let ok = false, fr = false;
  if (/^[\w-]{10,64}$/.test(t)) {
    const key = await st.get('tok/' + t);
    const sub = key && await st.get(key, { type: 'json' });
    if (sub) { fr = sub.lang === 'fr'; sub.status = 'unsubscribed'; sub.unsubscribed = new Date().toISOString(); await st.setJSON(key, sub); ok = true; }
  }
  // One-click (RFC 8058) POST from mail clients just needs a 200.
  if (event.httpMethod === 'POST') return { statusCode: 200, body: 'ok' };
  return { statusCode: ok ? 200 : 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, body: page(fr, ok) };
};
