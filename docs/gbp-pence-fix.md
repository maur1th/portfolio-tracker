# GBp (Pence) to GBP (Pounds) Fix

## Problem

Yahoo Finance returns UK market prices in **pence (GBp/GBX)** rather than pounds (GBP). The system was storing the currency as `GBp` and not converting prices, leading to massive display errors. For example, the gold ETC showed:

- PRU: 63.80 "GBP" (actually pence)
- Price: 7147 "GBP" (actually pence)
- Displayed as if you paid £63.80 but it's worth £7,147 per unit!

## Solution

### 1. Migration Script (`scripts/fix-gbp-pence.ts`)

Converts existing data:

- Changes instrument currency from `GBp` → `GBP`
- Divides all prices by 100
- Divides all position PRUs by 100
- Divides all transaction prices by 100 (if currency is GBp/GBX)

**Run once**: `pnpm fix-gbp`

### 2. Yahoo Finance Normalization (`src/lib/yahoo-finance.ts`)

Added `normalizeCurrency()` function that converts `GBp` and `GBX` to `GBP`.

Updated functions:

- `lookupInstrument()`: Normalizes currency when creating instruments
- `fetchPrices()`: Divides price by 100 when Yahoo returns GBp/GBX

### 3. Transaction Import Fix (`src/app/api/import-transactions/route.ts`)

- Normalizes GBp/GBX prices to GBP when importing IBKR transactions
- Divides price by 100
- Changes `priceCurrency` to `GBP`

### 4. Position Calculation Improvement

Enhanced to use `grossAmount` (actual paid amount) instead of `quantity × price` when available, as IBKR's listed price can differ from the execution price.

**Recompute positions**: `pnpm recompute-positions`

## Result

Gold ETC now shows correct values:

- PRU: £73.03 (paid £3,651.27 for 50 units)
- Current price: £71.47
- Loss: -2.13% (£77.77)

All future UK instruments will be automatically normalized to GBP.
