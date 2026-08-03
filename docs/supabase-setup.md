# Supabase Setup For Prado Commerce

This project uses Prisma and PostgreSQL. Supabase provides the PostgreSQL database and optional auth APIs.

## 1) Create the Supabase project

1. Go to https://supabase.com/dashboard/projects.
2. Click **New project**.
3. Name it `prado-commerce`.
4. Set a strong database password and choose your region.
5. Wait for provisioning to complete.

## 2) Collect connection values

In Supabase Dashboard:

1. Open **Project Settings > API** and copy:
- `Project URL`
- `anon public key`
- `service_role key`

2. Open **Project Settings > Database** and copy:
- `Connection string` (Direct)
- `Connection string` (Transaction/Pooler)

## 3) Configure local env

1. Copy `.env.local.example` to `.env.local`.
2. Fill in all placeholder values from your Supabase project.

Recommended setup:
- `DATABASE_URL`: Supabase pooler URL for app queries.
- `DIRECT_URL`: direct database URL for migrations.

## 4) Install dependencies and generate Prisma client

```bash
npm install
npm run db:generate
```

## 5) Apply schema to Supabase

```bash
npm run db:migrate
```

If your database is empty and you just want to sync quickly:

```bash
npm run db:push
```

## 6) Verify core data models

After migration, Supabase should include core Prisma-managed tables for:
- `MerchantUser`
- `Store`
- `Product`
- `ProductVariant`
- plus cart/order/account request tables

## Notes

- Login flow now persists merchant users in `MerchantUser` and links existing stores by owner email.
- Existing `Store.ownerId` remains for backward compatibility while `ownerUserId` is now available as a proper relation.
