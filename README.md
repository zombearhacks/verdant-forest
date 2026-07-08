# Verdant Forest

Food forest / companion-planting planner. Next.js + TypeScript, Neon Postgres, Drizzle ORM.

Planning/spec source of truth lives in Mike's Obsidian vault (`Coding/Projects/FoodForest`), not here — this repo is the build.

## Commands

You generally don't need to run these yourself — tell Claude Code what you want (reseed, review a page, run tests) and it'll run the right one. This is here for reference.

| Command | What it does |
|---|---|
| `pnpm dev` | Local dev server, hot reload — `localhost:3000` |
| `pnpm build && pnpm start` | Production build, run locally — closest to what Netlify deploys |
| `pnpm test` | Run the engine's vitest suite |
| `pnpm db:generate` | Generate a new migration from schema changes (`src/lib/db/schema.ts`) |
| `pnpm db:migrate` | Apply pending migrations to Neon |
| `pnpm db:seed` | Re-run the idempotent seed loader against `data/*.csv` — safe to re-run any time, upserts only |
| `pnpm lint` | ESLint |

## Deploys

Netlify auto-publish is **off** (free-tier credits are capped) — pushing to `main` does not deploy. Deploys are manual, triggered from the Netlify dashboard, and only happen at milestone boundaries. See decision #24 in the vault's Decision Log.

## Project layout

- `src/lib/db/` — Drizzle schema, client, DB→engine adapter
- `src/lib/engine/` — pure companion-planting logic (zone gate, co-habitability, niche, functional score, region fit, pairing, guild builder), no DB calls, one vitest file per function
- `src/app/` — Next.js App Router pages
- `data/` — seed CSVs, version-controlled
- `scripts/seed.ts` — the seed loader
