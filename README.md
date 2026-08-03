This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Cart Embed Quick Start

Use the Prado embed script from your storefront host page:

```html
<script
	src="https://cdn.pradocommerce.com/cart.js"
	data-store-id="YOUR_STORE_ID"
	data-api-key="YOUR_PUBLISHABLE_KEY"
	data-api-host="https://api.pradocommerce.com"
	defer
></script>
```

Use these HTML attributes in your storefront UI:

```html
<button data-prado-add="VARIANT_ID" data-prado-qty="1">Add to Cart</button>
<button data-prado-cart-toggle>Open Cart</button>
<span data-prado-cart-count>0</span>
```

Local development URLs:

- Script: `http://localhost:3000/cart.js`
- API host: `http://localhost:3000`
- Example page: `http://localhost:3000/embed-example.html`

There is a complete sample storefront file at `public/embed-example.html`.

## Supabase Project Setup

Prado Commerce is now Supabase-ready for storing users, stores, and products.

1. Copy `.env.local.example` to `.env.local`.
2. Add your Supabase project URL, API keys, and Postgres connection strings.
3. Generate Prisma client:

```bash
npm run db:generate
```

4. Apply migrations to your Supabase database:

```bash
npm run db:migrate
```

Detailed guide: `docs/supabase-setup.md`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
