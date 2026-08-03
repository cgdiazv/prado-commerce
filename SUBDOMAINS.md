# Prado Commerce Subdomain Topology

## Production Roles

- `pradocommerce.com`:
  - Platform marketing and account signup.
- `app.pradocommerce.com`:
  - Merchant admin UX (`/stores`, `/products`).
- `api.pradocommerce.com`:
  - Core edge API surface (`/api/*`).
- `cdn.pradocommerce.com`:
  - Embed script delivery (`/cart.js`).

## Current Next.js Routing Behavior

Implemented in `middleware.ts`:

- `app.*` + `/` rewrites to `/stores`
- `api.*` + `/` rewrites to `/api/health`
- `api.*` blocks non-`/api/*` paths with `404`
- `cdn.*` + `/` rewrites to `/cart.js`
- all other hosts follow normal app routing

## Local Testing (Windows)

1. Run app:

```powershell
npm run dev
```

2. Add host entries to `C:\Windows\System32\drivers\etc\hosts`:

```text
127.0.0.1 pradocommerce.local
127.0.0.1 app.pradocommerce.local
127.0.0.1 api.pradocommerce.local
127.0.0.1 cdn.pradocommerce.local
```

3. Visit:

- `http://pradocommerce.local:3000`
- `http://app.pradocommerce.local:3000`
- `http://api.pradocommerce.local:3000`
- `http://cdn.pradocommerce.local:3000`
