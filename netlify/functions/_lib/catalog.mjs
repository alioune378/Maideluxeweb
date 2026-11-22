/* Reads the published page and extracts what subscribers care about: products (name, price, section, image),
   the "Next Trip" travel announcement and the announcement bar. Pure functions — tested locally. */
const decode = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|’/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function between(html, startMarker, endMarker) {
  const i = html.indexOf(startMarker); if (i < 0) return '';
  const j = html.indexOf(endMarker, i + startMarker.length);
  return html.slice(i, j < 0 ? undefined : j);
}
function cards(block, section) {
  const out = [];
  const parts = block.split('<div class="p" data-t="').slice(1);
  for (const p of parts) {
    const t = p.slice(0, p.indexOf('"'));
    const name = decode((p.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1]);
    if (!name) continue;
    const price = decode((p.match(/<p class="pr"[^>]*>([\s\S]*?)<\/p>/) || [])[1]);
    const weight = decode((p.match(/<p class="wt"[^>]*>([\s\S]*?)<\/p>/) || [])[1]);
    const img = (p.match(/<img[^>]+src="([^"]+)"/) || p.match(/poster="([^"]+)"/) || [])[1] || '';
    const link = (p.match(/<a class="btn" href="(#[^"]+)"/) || [])[1] || (section === 'gold' ? '#gold' : '#fabrics');
    out.push({ key: section + '|' + name + '|' + img, section, type: t, name, price, weight, img, link: link === '#request' ? (section === 'gold' ? '#gold' : '#fabrics') : link });
  }
  return out;
}
function extract(html) {
  const gold = cards(between(html, 'id="gg"', 'id="fabrics-page"'), 'gold');
  const fab = cards(between(html, 'id="fg"', '</main>'), 'fabrics');
  const items = {};
  for (const c of gold.concat(fab)) if (!items[c.key]) items[c.key] = c;
  const tripBlock = between(html, 'class="mx-next-trip', '</aside>');
  const trip = decode((tripBlock.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1]);
  const ann = (between(html, 'id="ann"', '</ul>').match(/<li[^>]*>[\s\S]*?<\/li>/g) || []).map(decode).filter(Boolean);
  return { items, trip, ann };
}
const isPriced = p => p && !/price on request|prix sur demande/i.test(p);
function diff(prev, next) {
  const added = [], priced = [];
  for (const k of Object.keys(next.items)) {
    const n = next.items[k], o = prev.items[k];
    if (!o) added.push(n);
    else if (n.price !== o.price && isPriced(n.price)) priced.push(Object.assign({ old: o.price }, n));
  }
  const travel = next.trip && next.trip !== prev.trip ? next.trip : '';
  const news = next.ann.filter(a => !prev.ann.includes(a));
  return { added, priced, travel, news };
}
export { extract, diff, decode, isPriced };
