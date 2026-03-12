# DCA-2 — Investment Portfolio Tracker

## Project Overview

Personal investment portfolio tracker. Monitors positions across Boursobank (1 PEA, 1 CTO) and IBKR (1 CTO). Positions imported manually via CSV. Valuations from Yahoo Finance. Includes Value Averaging tracking, geographic/asset class exposure analysis, and DCA investment suggestions.

## Tech Stack

- **Runtime**: Node 24 via `nvm use --lts`
- **Framework**: Next.js (App Router) with TypeScript
- **Database**: SQLite via Drizzle ORM + better-sqlite3
- **Styling**: Tailwind CSS + shadcn/ui + CSS design tokens
- **Charts**: Recharts
- **Icons**: lucide-react
- **Toasts**: sonner
- **Market Data**: yahoo-finance2 (npm)
- **CSV Parsing**: papaparse
- **Package Manager**: pnpm

## Project Structure

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (shadcn/ui in `ui/`)
- `src/db/` — Drizzle schema (`schema.ts`), connection (`index.ts`), seed (`seed.ts`)
- `src/lib/` — Business logic (see below)
- `src/types/` — Shared TypeScript types
- `config/` — Runtime configuration (`targets.json` for allocation targets)
- `scripts/` — Utility scripts (`fix-gbp-pence.ts`, `recompute-positions.ts`)
- `data/` — SQLite database file (gitignored)
- `drizzle/` — Generated migrations

### Key lib modules

- `yahoo-finance.ts` — Yahoo Finance API integration
- `portfolio.ts` — Portfolio computation (positions → valuations)
- `currencies.ts` — FX rate fetching and conversion
- `format.ts` — Number/currency formatting (`fr-FR` locale)
- `value-averaging.ts` — VA config management and target calculations
- `va-calculations.ts` — VA progress helpers (variance, month/funding/contribution progress, chart data)
- `snapshots.ts` — Daily position snapshot recording with EUR conversion
- `exposure.ts` — Geographic and asset class classification (ETF name pattern matching)
- `dca-suggestions.ts` — DCA investment suggestions based on allocation targets
- `targets.ts` — Load/validate allocation targets from `config/targets.json`
- `msci.ts` — MSCI factsheet PDF parsing for ETF country weights
- `account-sparklines.ts` — Account sparkline history from snapshots
- `positions.ts` — Position computation helpers
- `csv-parsers/` — Boursobank and IBKR CSV parsers

## Pages & API Routes

**Pages:**
- `/` — Dashboard: portfolio summary chart, VA widget, exposure charts, accounts overview, positions
- `/import` — CSV import for positions (Boursobank) and transactions (IBKR)
- `/accounts/[accountId]` — Account detail with positions table

**API routes:**
- `POST /api/import` — Import positions from CSV
- `POST /api/import-transactions` — Import IBKR transactions
- `POST /api/prices/refresh` — Refresh instrument prices from Yahoo Finance
- `POST /api/va-config` — Save Value Averaging configuration
- `POST /api/etf-weights` — Fetch and cache ETF country weights

## Database

10 tables: `brokers`, `accounts`, `instruments`, `positions`, `prices`, `fxRates`, `transactions`, `vaConfig`, `positionSnapshots`, `etfCountryWeights`.

- Dates stored as ISO 8601 text strings
- Yahoo Finance ticker format (e.g. `MC.PA` for Euronext Paris)
- Boursobank CSV import **replaces** all positions for the target account
- IBKR imports transaction history; positions are **computed** from stored transactions (weighted-average cost)
- IBKR transaction import is additive (deduplicates on date+type+symbol+quantity+netAmount)
- `positionSnapshots` stores daily EUR-converted values for portfolio history charts
- `etfCountryWeights` caches geographic breakdown per ETF (sourced from MSCI factsheets)
- `vaConfig` stores Value Averaging parameters (startDate, monthlyIncrement, initialValue)

### Commands

- `pnpm db:push` — push schema to SQLite
- `pnpm db:seed` — seed brokers + accounts
- `pnpm db:studio` — open Drizzle Studio
- `pnpm fix-gbp` — normalize GBP pence prices
- `pnpm recompute-positions` — recompute positions from transactions

## Architecture Decisions

- Server components by default; client components only for interactivity (sorting, forms, buttons)
- Data revalidation via `router.refresh()` after mutations (no React Query)
- ISIN-to-ticker resolution via `yahoo-finance2.search()` for Boursobank imports
- Multi-currency: instruments store native currency; dashboard converts to EUR for totals
- **GBp normalization**: UK instruments returned by Yahoo Finance in pence (GBp/GBX) are normalized to pounds (GBP) by dividing prices by 100
- Dashboard uses Card-based layout with CSS design token variables for theming
- `config/targets.json` defines allocation targets (geography + market cap) driving DCA suggestions
- Geographic exposure computed from ETF country weights (MSCI) with fallback to name-pattern classification

## Testing

- **Framework**: Vitest (`pnpm test` to run, `pnpm test:watch` for watch mode)
- Tests live next to source files (e.g. `positions.ts` → `positions.test.ts`)
- Extract business logic into pure functions (no DB/network) so they are easily testable
- Always write unit tests for new or modified business logic in `src/lib/`
- Before committing, always run `pnpm test` and verify all tests pass

## Code Style

- Use comments sparingly. Only comment complex code.
