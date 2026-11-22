'use strict';
/* Runs automatically after every successful production deploy.
   Compares the published site with the previous version and emails the Private List about:
   new products, new prices, a new "Next Trip" travel announcement, new announcement-bar news,
   and any new entry in /updates.json (travel, special finds, news). */
const L = require('./_lib/list');
const C = require('./_lib/catalog');

const INT = { gold: 'Gold & Jewelry', fabrics: 'Fabrics', travel: 'Travel Updates', special: 'Special Finds' };

exports.handler = async (event) => {
  let payload = {};
  try { payload = JSON.parse(event.body || '{}').payload || {}; } catch (e) {}
  if (payload.context && payload.context !== 'production') return { statusCode: 200, body: 'not production' };
  if ((process.env.LIST_AUTOSEND || 'on') === 'off') return { statusCode: 200, body: 'autosend off' };
  const st = L.store(event);
  const base = L.SITE;
  const html = await (await fetch(base + '/?v=' + Date.now())).text();
  let updates = [];
  try { const r = await fetch(base + '/updates.json?v=' + Date.now()); if (r.ok) updates = await r.json(); } catch (e) {}
  const next = C.extract(html);
  const prev = await st.get('snapshot', { type: 'json' });
  const sentUpdates = (await st.get('sent-updates', { type: 'json' })) || [];
  const freshUpdates = (Array.isArray(updates) ? updates : []).filter(u => u && u.id && !sentUpdates.includes(u.id) && u.status !== 'draft');

  if (!prev) { // first run: remember the current state, announce nothing old
    await st.setJSON('snapshot', next);
    await st.setJSON('sent-updates', (updates || []).map(u => u.id).filter(Boolean));
    return { statusCode: 200, body: 'baseline saved (' + Object.keys(next.items).length + ' items)' };
  }
  const ch = C.diff(prev, next);
  const nothing = !ch.added.length && !ch.priced.length && !ch.travel && !ch.news.length && !freshUpdates.length;
  if (nothing) { await st.setJSON('snapshot', next); return { statusCode: 200, body: 'no subscriber-facing changes' }; }

  const subs = await L.listSubscribers(st);
  const messages = [];
  for (const s of subs) {
    const want = k => !s.interests || !s.interests.length || s.interests.includes(INT[k]);
    const fr = s.lang === 'fr';
    const parts = [];
    const add = ch.added.filter(i => want(i.section)), pr = ch.priced.filter(i => want(i.section));
    if (add.length) parts.push(section(fr ? 'Nouveautés' : 'New Arrivals', add, fr, base));
    if (pr.length) parts.push(section(fr ? 'Prix maintenant disponibles' : 'New Prices', pr, fr, base, true));
    if (ch.travel && want('travel')) parts.push(textBlock(fr ? 'Prochain voyage de Mai' : 'Mai’s Next Trip', ch.travel));
    for (const n of ch.news) parts.push(textBlock(fr ? 'Annonce' : 'Announcement', n));
    for (const u of freshUpdates) {
      const k = u.type === 'travel' ? 'travel' : u.type === 'special' ? 'special' : u.type === 'gold' ? 'gold' : u.type === 'fabrics' ? 'fabrics' : null;
      if (k && !want(k)) continue;
      parts.push(textBlock(pick(u.title, fr), pick(u.text, fr), u.link && (base + '/' + u.link.replace(/^\//, ''))));
    }
    if (!parts.length) continue;
    const subject = subjectFor({ added: add, priced: pr, travel: ch.travel && want('travel') }, freshUpdates, fr);
    const unsub = L.unsubUrl(s.token);
    const html2 = L.shell({ lang: s.lang, preheader: subject, heading: fr ? 'Du nouveau chez Mai Deluxe' : 'New from Mai Deluxe', bodyHtml: parts.join(''),
      cta: { url: base + '/#arrivals', label: fr ? 'Voir sur le site' : 'See it on the website' }, unsubUrl: unsub });
    const text = (fr ? 'Du nouveau chez Mai Deluxe : ' : 'New from Mai Deluxe: ') + base + '/#arrivals\n\n' + (fr ? 'Se désabonner : ' : 'Unsubscribe: ') + unsub;
    messages.push({ to: s.email, subject, html: html2, text, unsubUrl: unsub });
  }
  const r = await L.send(messages);
  if (L.configured()) { // only move the baseline forward once the emails could actually go out
    await st.setJSON('snapshot', next);
    await st.setJSON('sent-updates', sentUpdates.concat(freshUpdates.map(u => u.id)));
  }
  await st.setJSON('log/' + new Date().toISOString(), { added: ch.added.length, priced: ch.priced.length, travel: !!ch.travel, news: ch.news.length, updates: freshUpdates.map(u => u.id), recipients: messages.length, sent: r.sent || 0 });
  return { statusCode: 200, body: `recipients ${messages.length}, sent ${r.sent || 0}` };
};

function pick(o, fr) { return o && typeof o === 'object' ? (fr ? o.fr || o.en : o.en || o.fr) : (o || ''); }
function subjectFor(ch, ups, fr) {
  if (ch.added.length) return fr ? `${ch.added.length} nouveauté${ch.added.length > 1 ? 's' : ''} chez Mai Deluxe` : `${ch.added.length} new arrival${ch.added.length > 1 ? 's' : ''} at Mai Deluxe`;
  if (ch.travel || ups.some(u => u.type === 'travel')) return fr ? 'Mai part en voyage de sourcing' : 'Mai is going on a sourcing trip';
  if (ch.priced.length) return fr ? 'Nouveaux prix chez Mai Deluxe' : 'New prices at Mai Deluxe';
  return fr ? 'Du nouveau chez Mai Deluxe' : 'News from Mai Deluxe';
}
function textBlock(title, text, link) {
  return `<h2 style="margin:22px 0 8px;font-size:19px;font-weight:normal;color:#8a6a2e">${L.esc(title)}</h2><p style="margin:0 0 12px;font-size:16px;line-height:1.6">${L.esc(text)}</p>` +
    (link ? `<p style="margin:0 0 12px"><a href="${L.esc(link)}" style="color:#8a6a2e">${L.esc(link.replace(/^https?:\/\//, ''))}</a></p>` : '');
}
function section(title, items, fr, base, showOld) {
  const shown = items.slice(0, 12);
  const rows = shown.map(i => {
    const img = i.img ? (i.img.startsWith('http') ? i.img : base + '/' + i.img.replace(/^\//, '')) : '';
    const price = C.isPriced(i.price) ? i.price : (fr ? 'Prix sur demande' : 'Price on request');
    return `<tr><td width="84" style="padding:8px 12px 8px 0;vertical-align:top">${img ? `<img src="${L.esc(img)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;object-fit:cover;border:1px solid #e2dacb">` : ''}</td>
<td style="padding:8px 0;vertical-align:top;font-size:15px;line-height:1.45"><a href="${base}/${L.esc(i.link)}" style="color:#171717;text-decoration:none"><strong>${L.esc(i.name)}</strong></a><br>
<span style="color:#56524e">${L.esc([i.weight, price].filter(Boolean).join(' · '))}${showOld && i.old ? ` <s style="color:#999">${L.esc(i.old)}</s>` : ''}</span></td></tr>`;
  }).join('');
  const more = items.length > shown.length ? `<p style="font-size:14px;color:#56524e">${fr ? `et ${items.length - shown.length} autre(s) sur le site.` : `and ${items.length - shown.length} more on the website.`}</p>` : '';
  return `<h2 style="margin:22px 0 8px;font-size:19px;font-weight:normal;color:#8a6a2e">${L.esc(title)}</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${more}`;
}
