/* Mai Deluxe Private List — shared helpers (Netlify Blobs store + Resend email). */
import crypto from 'node:crypto';
const SITE = process.env.URL || 'https://mai-deluxe.com';

async function store() {
  if (globalThis.__MD_STORE) return globalThis.__MD_STORE;
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'mai-private-list', consistency: 'strong' });
}
const keyFor = email => 'sub/' + crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex').slice(0, 32);
const token = () => crypto.randomBytes(18).toString('base64url');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function listSubscribers(st) {
  const { blobs } = await st.list({ prefix: 'sub/' });
  const out = await Promise.all(blobs.map(b => st.get(b.key, { type: 'json' })));
  return out.filter(s => s && s.status === 'active');
}

function configured() { return !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM); }

/* Brand email shell (inline styles for email clients) */
function shell({ lang, preheader, heading, bodyHtml, cta, unsubUrl }) {
  const fr = lang === 'fr';
  const addr = process.env.MAIL_POSTAL_ADDRESS ? `<br>${esc(process.env.MAIL_POSTAL_ADDRESS)}` : '';
  return `<!doctype html><html lang="${fr ? 'fr' : 'en'}"><body style="margin:0;background:#f4efe6;font-family:Georgia,'Times New Roman',serif;color:#171717">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#faf9f5;border:1px solid #e2dacb">
<tr><td style="background:#080808;padding:22px;text-align:center"><img src="${SITE}/assets/img-5b020a8220.png" width="220" alt="Mai Deluxe" style="display:inline-block;max-width:220px;height:auto"></td></tr>
<tr><td style="padding:32px 28px 8px"><h1 style="margin:0 0 14px;font-size:26px;font-weight:normal;color:#080808">${heading}</h1>${bodyHtml}</td></tr>
${cta ? `<tr><td style="padding:10px 28px 30px"><a href="${cta.url}" style="display:inline-block;background:#caa45b;color:#080808;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;padding:14px 26px">${esc(cta.label)}</a></td></tr>` : ''}
<tr><td style="padding:18px 28px 26px;border-top:1px solid #e2dacb;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#56524e">
WhatsApp: <a href="https://wa.me/16142600116" style="color:#8a6a2e">+1 (614) 260-0116</a> · <a href="mailto:hello@mai-deluxe.com" style="color:#8a6a2e">hello@mai-deluxe.com</a><br>
${fr ? 'Vous recevez ce courriel car vous avez rejoint la Liste privée Mai Deluxe sur mai-deluxe.com.' : 'You are receiving this email because you joined the Mai Deluxe Private List on mai-deluxe.com.'}
<br><a href="${unsubUrl}" style="color:#8a6a2e">${fr ? 'Se désabonner' : 'Unsubscribe'}</a>${addr}
</td></tr></table></td></tr></table></body></html>`;
}

async function send(messages) {
  // messages: [{to, subject, html, text, unsubUrl}] — Resend batch API (max 100 per call)
  if (!configured() || !messages.length) return { sent: 0, skipped: messages.length };
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map(m => ({
      from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text,
      reply_to: process.env.MAIL_REPLY_TO || 'hello@mai-deluxe.com',
      headers: { 'List-Unsubscribe': `<${m.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
    }));
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(chunk)
    });
    if (r.ok) sent += chunk.length; else console.error('resend', r.status, await r.text());
  }
  return { sent };
}
const unsubUrl = t => `${SITE}/unsubscribe?t=${encodeURIComponent(t)}`;
export { store, keyFor, token, esc, listSubscribers, configured, shell, send, unsubUrl, SITE };
