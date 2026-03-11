# DCA-2 — Investment Portfolio Tracker

## Project Overview

Personal investment portfolio tracker. Monitors positions across Boursobank (1 PEA, 1 CTO) and IBKR (1 CTO). Positions imported manually via CSV. Valuations from Yahoo Finance.

## Tech Stack

- **Runtime**: Node 24 via `nvm use --lts`
- **Framework**: Next.js (App Router) with TypeScript
- **Database**: SQLite via Drizzle ORM + better-sqlite3
- **Styling**: Tailwind CSS + shadcn/ui
- **Market Data**: yahoo-finance2 (npm)
- **CSV Parsing**: papaparse
- **Package Manager**: pnpm

## Project Structure

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (shadcn/ui in `ui/`)
- `src/db/` — Drizzle schema (`schema.ts`), connection (`index.ts`), seed (`seed.ts`)
- `src/lib/` — Business logic: `yahoo-finance.ts`, `portfolio.ts`, `currencies.ts`, `format.ts`, `csv-parsers/`
- `src/types/` — Shared TypeScript types
- `data/` — SQLite database file (gitignored)
- `drizzle/` — Generated migrations

## Database

6 tables: `brokers`, `accounts`, `instruments`, `positions`, `prices`, `transactions`.

- Dates stored as ISO 8601 text strings
- Yahoo Finance ticker format (e.g. `MC.PA` for Euronext Paris)
- Boursobank CSV import **replaces** all positions for the target account
- IBKR imports transaction history; positions are **computed** from stored transactions (weighted-average cost)
- IBKR transaction import is additive (deduplicates on date+type+symbol+quantity+netAmount)

### Commands

- `pnpm db:push` — push schema to SQLite
- `pnpm db:seed` — seed brokers + accounts
- `pnpm db:studio` — open Drizzle Studio

## Architecture Decisions

- Server components by default; client components only for interactivity (sorting, forms, buttons)
- Data revalidation via `router.refresh()` after mutations (no React Query)
- ISIN-to-ticker resolution via `yahoo-finance2.search()` for Boursobank imports
- Multi-currency: instruments store native currency; dashboard converts to EUR for totals
- **GBp normalization**: UK instruments returned by Yahoo Finance in pence (GBp/GBX) are normalized to pounds (GBP) by dividing prices by 100
- Number formatting uses `fr-FR` locale

## Code Style

- Use comments sparingly. Only comment complex code.
