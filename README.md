# Portfolio Tracker

Investment portfolio tracker. Monitors positions across multiple brokers and accounts. Positions are imported manually via CSV exports, and valuations are fetched from Yahoo Finance.

Built with Next.js, SQLite (via Drizzle ORM), and shadcn/ui.

## Features

- Import positions from Boursobank (CSV) and IBKR (transaction history CSV)
- Live valuations via Yahoo Finance
- Multi-currency support with EUR conversion
- Geographic exposure breakdown using ETF country weights
- Portfolio charts and analytics

## Prerequisites

- [Node.js](https://nodejs.org/) 24+ (LTS)
- [pnpm](https://pnpm.io/) 10+

## Getting Started

```bash
# Install dependencies
pnpm install

# Initialize the database
pnpm db:push

# Seed brokers and accounts
pnpm db:seed

# Start the dev server
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Usage

1. Navigate to the import page in the UI
2. Select a broker and account
3. Upload a CSV export from your broker
4. The dashboard will display your positions with live valuations

### Supported Brokers

- **Boursobank** — CSV import replaces all positions for the target account
- **IBKR** — Transaction history import; positions are computed from stored transactions using weighted-average cost

### CSV Formats

- **Boursobank**: Semicolon-separated, French number format. Columns: Code ISIN, Designation, Quantite, PRU
- **IBKR**: Standard CSV. Columns: Symbol, Description, Quantity, Cost Price, Currency

## Project Structure

```
src/
  app/          Next.js App Router pages and API routes
  components/   React components (shadcn/ui in ui/)
  db/           Drizzle schema, connection, seed
  lib/          Business logic (yahoo-finance, portfolio, currencies, csv-parsers)
  types/        Shared TypeScript types
data/           SQLite database (gitignored)
drizzle/        Generated migrations
```

## Database Commands

| Command | Description |
|---|---|
| `pnpm db:push` | Push schema to SQLite |
| `pnpm db:seed` | Seed brokers and accounts |
| `pnpm db:studio` | Open Drizzle Studio |

## License

[Apache 2.0](LICENSE)
