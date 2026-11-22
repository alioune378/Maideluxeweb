/* Runs automatically on every Netlify Forms submission.
   Private List sign-up → save the subscriber + send the welcome email (EN/FR). */
import * as L from './_lib/list.mjs';

const R = (status, body) => new Response(body || '', { status });
export default async (req) => {
  let payload;
  try { payload = (await req.json()).payload; } catch (e) { return R(400, 'bad json'); }
  if (!payload || payload.form_name !== 'private-list') return R(200, 'ignored');
  const d = payload.data || {};
  const email = String(d.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || d.consent !== 'yes' || d['bot-field']) return R(200, 'skipped');
  let interests = d.interests || [];
  if (typeof interests === 'string') { try { interests = JSON.parse(interests); } catch (e) { interests = interests.split(/\s*,\s*/); } }
  const lang = d.lang === 'fr' ? 'fr' : 'en';

  const key = L.keyFor(email);
  let st = null, prev = null;
  try { st = await L.store(); prev = await st.get(key, { type: 'json' }); }
  catch (e) { console.error('private-list: storage unavailable', e && e.message); st = null; }
  const sub = Object.assign({}, prev || {}, {
    email, interests: Array.isArray(interests) ? interests.slice(0, 8) : [], lang,
    status: 'active', token: (prev && prev.token) || L.token(), updated: new Date().toISOString()
  });
  if (!prev) sub.created = sub.updated;
  const alreadyWelcomed = prev && prev.status === 'active' && prev.welcomed;
  if (st) { try { await st.setJSON(key, sub); await st.set('tok/' + sub.token, key); } catch (e) { console.error('private-list: save failed', e && e.message); } }
  if (alreadyWelcomed) return R(200, 'updated');

  const fr = lang === 'fr';
  const picks = sub.interests.length ? sub.interests.map(i => L.esc(FR_INT[i] && fr ? FR_INT[i] : i)).join(', ') : '';
  const heading = fr ? 'Bienvenue dans la Liste privée' : 'Welcome to the Private List';
  const p = s => `<p style="margin:0 0 14px;font-size:16px;line-height:1.65">${s}</p>`;
  const bodyHtml = fr
    ? p('Merci de nous avoir rejoints ! Vous serez parmi les premières personnes à découvrir les nouveautés, les voyages de sourcing de Mai, les collections exclusives et les offres spéciales.') +
      (picks ? p(`Vos centres d’intérêt : <strong>${picks}</strong>.`) : '') +
      p('Vous cherchez une pièce en particulier ? Envoyez une demande avec ce que vous aimez, votre budget et vos préférences : Mai vous confirme le prix, la disponibilité et la livraison avant tout paiement.') +
      p('Avec toute mon affection,<br><em>Mai</em>')
    : p('Thank you for joining! You will be among the first to discover new arrivals, Mai’s sourcing trips, exclusive collections and special offers.') +
      (picks ? p(`Your interests: <strong>${picks}</strong>.`) : '') +
      p('Looking for something special? Send a shopping request with what you love, your budget and your preferences — Mai confirms price, availability and delivery with you before anything is paid.') +
      p('With love,<br><em>Mai</em>');
  const unsub = L.unsubUrl(sub.token);
  const html = L.shell({ lang, preheader: heading, heading, bodyHtml, cta: { url: L.SITE + '/#arrivals', label: fr ? 'Découvrir les nouveautés' : 'Discover New Arrivals' }, unsubUrl: unsub });
  const text = (fr ? 'Bienvenue dans la Liste privée Mai Deluxe ! Découvrez les nouveautés : ' : 'Welcome to the Mai Deluxe Private List! Discover new arrivals: ') + L.SITE + '/#arrivals\n\n' + (fr ? 'Se désabonner : ' : 'Unsubscribe: ') + unsub;
  const r = await L.send([{ to: email, subject: fr ? 'Bienvenue dans la Liste privée Mai Deluxe' : 'Welcome to the Mai Deluxe Private List', html, text, unsubUrl: unsub }]);
  console.log('private-list: welcome', email.replace(/^(.).*@/, '$1***@'), r.sent ? 'sent' : 'not sent');
  if (r.sent && st) { sub.welcomed = new Date().toISOString(); try { await st.setJSON(key, sub); } catch (e) {} }
  return R(200, r.sent ? 'welcomed' : 'saved (email not configured)');
};
const FR_INT = { 'Gold & Jewelry': 'Or & bijoux', 'Fabrics': 'Tissus', 'Travel Updates': 'Voyages', 'Special Finds': 'Trouvailles exclusives' };
