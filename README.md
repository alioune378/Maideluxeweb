# Mai Deluxe — mai-deluxe.com

Static storefront (index.html + i18n.js for French) hosted on Netlify, with request forms, search, a device-saved wishlist and the **Private List** email automation.

## Private List automation (Netlify Functions + Netlify Blobs + Resend)
- `submission-created.mjs` — runs on every Private List sign-up: saves the subscriber (email, interests, language) and sends the welcome email in English or French. Duplicate sign-ups update interests without a second welcome.
- `deploy-succeeded.mjs` — runs after every production deploy: compares the published site with the previous version and emails subscribers (filtered by their interests) about **new products**, **new prices**, a new **Next Trip** announcement, new announcement-bar news, and new entries in `updates.json`. The first run only records a baseline. Nothing is ever sent twice; deploy previews never send.
- `unsubscribe.mjs` — one-click unsubscribe link included in every email (`/unsubscribe?t=…`).

### To announce something that is not a product (travel, special finds, news)
Add an entry to `updates.json` and deploy:
```json
[{ "id": "dubai-dec-2026", "type": "travel", "title": { "en": "Mai is going to Dubai", "fr": "Mai part à Dubaï" }, "text": { "en": "10–18 December. Send your requests before 8 December.", "fr": "Du 10 au 18 décembre. Envoyez vos demandes avant le 8 décembre." }, "link": "#travels" }]
```
`type`: `travel` · `special` · `gold` · `fabrics` · `news` (news goes to everyone). Use a new `id` each time.

### Required Netlify environment variables
- `RESEND_API_KEY` — Resend API key (domain mai-deluxe.com verified in Resend)
- `MAIL_FROM` — e.g. `Mai Deluxe <hello@mai-deluxe.com>`
- `MAIL_POSTAL_ADDRESS` — business mailing address or P.O. box (required by CAN-SPAM in marketing emails)
- optional `LIST_AUTOSEND=off` to pause update emails

Without the email variables, subscribers are still saved and no email is sent.
