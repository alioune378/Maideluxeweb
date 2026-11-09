# Mai Deluxe – private staging preview

Static front-end preview of the Mai Deluxe storefront (homepage, two pilot product pages, Studio demo, request form).

**Not live commerce.** Cart, checkout, wishlist, forms and the Studio demo are not connected to Shopify or any database yet.

## Deploy
1. Push this folder to a private GitHub repository.
2. Netlify → Add new site → Import an existing project → GitHub → pick the repo.
3. Build command: (leave empty). Publish directory: `.`
4. Keep the site on its free `*.netlify.app` address. Do not add a custom domain until launch approval.

Search engines are blocked (robots.txt, meta tag and X-Robots-Tag header). For real access control, use Netlify's password protection (paid plan) or share the link only privately.
