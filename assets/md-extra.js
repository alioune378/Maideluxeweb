/* Mai Deluxe — search + wishlist (wishlist is saved on this device). */
(function () {
  'use strict';
  var d = document, KEY = 'mdWish', W = [];
  try { W = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { W = []; }
  var st = d.createElement('style');
  st.textContent = '.md-search input{width:100%;font:inherit;font-size:17px;padding:14px 18px;border:1px solid #d9cdb4;border-radius:999px;background:#fff;margin:6px 0 10px}' +
    '.md-sr{color:#56524e;margin:4px 0 18px}.md-wl-act{text-align:center;margin:26px 0}.p .w[aria-pressed=true] svg{fill:#caa45b;stroke:#caa45b}' +
    '.p .md-rm{display:block;margin:8px auto 0;background:none;border:0;color:#8a6a2e;text-decoration:underline;font:inherit;font-size:13px;cursor:pointer}';
  d.head.appendChild(st);

  function FR() { return d.documentElement.lang === 'fr'; }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} sync(); }
  function cardInfo(c) {
    var im = c.querySelector('img'), v = c.querySelector('video'), name = txt(c.querySelector('h3'));
    var img = im ? im.getAttribute('src') : (v ? v.getAttribute('poster') : '');
    var dl = c.querySelector('a.btn:not([href="#request"]),h3 a[href^="#"]:not([href="#fabrics"]):not([href="#gold"])');
    return { id: name + '|' + img, name: name, img: img, detail: txt(c.querySelector('.wt')), link: dl ? dl.getAttribute('href') : '' };
  }
  function has(id) { return W.some(function (x) { return x.id === id; }); }
  function sync() {
    var n = d.getElementById('wlCount'); if (n) n.textContent = W.length;
    d.querySelectorAll('[data-wish]').forEach(function (b) {
      var c = b.closest('.p,article.mx-product'); if (!c) return;
      var on = has(cardInfo(c).id); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Save to wishlist');
    });
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-wish]'); if (!b) return;
    e.preventDefault();
    var c = b.closest('.p,article.mx-product'); if (!c) return;
    var it = cardInfo(c);
    if (has(it.id)) W = W.filter(function (x) { return x.id !== it.id; }); else W.unshift(it);
    save();
    if (location.hash === '#wishlist') renderWish();
  });

  // ---- wishlist page
  function renderWish() {
    var g = d.getElementById('mdWg'), act = d.getElementById('mdWa'), msg = d.getElementById('mdWr');
    g.innerHTML = W.map(function (x, i) {
      return '<div class="p"><div class="im">' + (x.img ? '<img src="' + esc(x.img) + '" alt="' + esc(x.name) + '" loading="lazy">' : '') + '<button class="w" type="button" aria-label="Remove from wishlist" aria-pressed="true" data-wish><svg><use href="#h"/></svg></button></div>' +
        '<h3>' + esc(x.name) + '</h3>' + (x.detail ? '<p class="wt">' + esc(x.detail) + '</p>' : '') +
        (x.link ? '<a class="btn" href="' + esc(x.link) + '" style="margin-bottom:8px">View Details</a>' : '') + '<a class="btn" href="#request">Place Request</a><button class="md-rm" type="button" data-rm="' + i + '">Remove</button></div>';
    }).join('');
    act.hidden = !W.length;
    msg.textContent = W.length ? (W.length + (FR() ? (W.length > 1 ? ' pièces enregistrées' : ' pièce enregistrée') : (W.length > 1 ? ' saved pieces' : ' saved piece'))) : 'Tap the heart on any piece to save it here. Your wishlist is kept on this device.';
  }
  d.addEventListener('click', function (e) {
    var r = e.target.closest('[data-rm]'); if (r) { W.splice(+r.getAttribute('data-rm'), 1); save(); renderWish(); return; }
    if (e.target.closest('#mdWreq') && window.mdSetItem && W.length) {
      setTimeout(function () { window.mdSetItem({ name: 'Wishlist (' + W.length + ')', detail: W.map(function (x) { return x.name; }).join('; '), img: W[0].img }); }, 0);
    }
  });

  // ---- search
  var pool = null;
  function buildPool() {
    if (pool) return pool;
    var seen = {}; pool = [];
    ['gg', 'fg'].forEach(function (id) {
      var g = d.getElementById(id); if (!g) return;
      g.querySelectorAll('.p').forEach(function (c) {
        var k = cardInfo(c).id; if (seen[k]) return; seen[k] = 1;
        pool.push({ el: c, hay: norm(txt(c.querySelector('h3')) + ' ' + (c.getAttribute('data-t') || '') + ' ' + (id === 'gg' ? 'gold jewelry bijoux or' : 'fabric tissu')) });
      });
    });
    return pool;
  }
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function search() {
    var q = norm(d.getElementById('mdQ').value.trim()), g = d.getElementById('mdSg'), sr = d.getElementById('mdSr');
    if (!q) { g.innerHTML = ''; sr.textContent = 'Type a name, colour or material.'; return; }
    var words = q.split(/\s+/), hits = buildPool().filter(function (p) { return words.every(function (w) { return p.hay.indexOf(w) >= 0; }); });
    g.innerHTML = '';
    hits.slice(0, 60).forEach(function (p) { var c = p.el.cloneNode(true); c.style.display = ''; g.appendChild(c); });
    sr.textContent = hits.length ? hits.length + (FR() ? ' résultat' + (hits.length > 1 ? 's' : '') : (hits.length > 1 ? ' results' : ' result')) : 'No results. Try another word, or send Mai a shopping request.';
    if (window.mdScanVideos) window.mdScanVideos();
    sync();
  }
  var qi = d.getElementById('mdQ'); if (qi) qi.addEventListener('input', search);
  function esc(s) { var x = d.createElement('div'); x.textContent = s == null ? '' : String(s); return x.innerHTML; }

  window.mdExtra = function (k) {
    if (k === 'wishlist') renderWish();
    if (k === 'search') { search(); setTimeout(function () { var i = d.getElementById('mdQ'); i && i.focus(); }, 50); }
  };
  sync();
  if (location.hash === '#wishlist' || location.hash === '#search') window.mdExtra(location.hash.slice(1));
})();
