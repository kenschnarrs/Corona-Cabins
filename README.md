# Cabañas Corona

## Website for Corona Cabins, a family-owned cabins spot in the Mexican countryside.

* Lugar para vacacionar o simplemente descansar de la ciudad. Ubicadas en Carichi, Chihuahua a 43 minutos de Bacabureahi (aguas termales).

### Cabaña Grande de 2 pisos (1800 pesos por noche) 

* 3 habitaciones
* 4 camas matrimoniales
* 1 baño (toallas, jabón, papel higiénico)
* Terraza pequeña
* Cocina (microondas, estufa, refrigerador, calentador de agua, platos, tazas, sartenes, cuchillos)
* Calentón de leña

### Cabaña Mediana one story?? (1200 pesos por noche)

* 2 habitaciones
* 3 camas matrimoniales
* 1 baño (elementos básicos, toallas, jabón, papel) 
* Cocina (utensilios de cocina, los básicos, platos, vasos, tazas, sartenes, comal, refrigerador, microondas)
* Calentón de leña

### Cabaña Pequeña de 2 pisos (850 pesos por noche)

* 1 habitación
* 2 camas matrimoniales
* Terraza
* 1 baño
* Cocina (elementos básicos, comal, sartenes, platos, refrigerador, microondas)
* Calentón de leña

### Exteriores

* Asadores
* Área infantil
* Estacionamiento privado

Check in: 1 PM
Check out: 12 PM

## Development setup

1. Install Node 22 (see `engines` in `package.json`) and run `npm install`.
2. Copy `.env.example` to `.env` and fill in the values. In production and
   preview, these live as protected Vercel environment variables - never in
   source control.
3. Apply database migrations with `npm run db:migrate` (uses
   `prisma migrate deploy` against `POSTGRES_URL_NON_POOLING`).
4. Optionally seed cabin data with `npm run seed`.
5. Run `npm run dev`, or validate with `npm run typecheck` and `npm run build`.

### Database migrations

Schema changes go through versioned Prisma migrations in `prisma/migrations`:

- Create a migration locally with `npm run db:migrate:dev -- --name <change>`.
- Apply migrations to an environment with `npm run db:migrate`
  (`prisma migrate deploy`). Run this as an explicit deploy step, not during
  `next build`, so preview builds never mutate the production database.
- Never edit the schema with `prisma db push`; it bypasses migration history.

### Authentication and admin access

- Sign-in uses Google OAuth via NextAuth and is restricted to the emails in
  the `ADMIN_EMAIL_ALLOWLIST` environment variable (comma-separated),
  enforced server-side in the NextAuth `signIn` callback and on admin pages.
- `NEXTAUTH_SECRET` must be a stable value from protected environment
  configuration so sessions survive redeploys.
- No credentials, secrets, or admin email addresses belong in this
  repository.

## Phase 1: public site (this branch)

- The home page is the one-page landing from the approved mockup: hero,
  three cabin cards, experience section, and footer. `/select` redirects to
  `/#cabins`.
- Cabin cards and detail pages are fed from the live database. Card names
  and prices come straight from Postgres; amenity chips are built from the
  `has_kitchen`, `has_wood_stove`, and `has_terrace` boolean columns added
  by the `cabin_amenities` migration (run `npm run db:migrate` to apply).
- Spanish is the default language with an English toggle. UI strings and
  per-cabin marketing copy live in `lib/i18n/es.json` and `lib/i18n/en.json`;
  `npm test` checks the two dictionaries stay in sync.
- Photos are labeled temporary placeholders (`Foto temporal` / `Temporary
  photo`) from `lib/placeholders.ts` until real property photos are supplied.
  Once a cabin has a Primary image in the database, that image is shown
  instead (Phase 2 wires uploads).
- The UI is plain Tailwind; the NextUI dependency was removed in this phase.
