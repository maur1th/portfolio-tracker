import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";

export const brokers = sqliteTable("brokers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const brokersRelations = relations(brokers, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brokerId: integer("broker_id")
    .notNull()
    .references(() => brokers.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["PEA", "CTO"] }).notNull(),
  currency: text("currency").notNull().default("EUR"),
});

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  broker: one(brokers, {
    fields: [accounts.brokerId],
    references: [brokers.id],
  }),
  positions: many(positions),
  transactions: many(transactions),
}));

export const instruments = sqliteTable("instruments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  isin: text("isin"),
  ticker: text("ticker").notNull().unique(),
  name: text("name").notNull(),
  type: text("type", { enum: ["stock", "etf", "bond", "fund"] }).notNull(),
  currency: text("currency").notNull(),
  exchange: text("exchange"),
});

export const instrumentsRelations = relations(instruments, ({ many }) => ({
  positions: many(positions),
  prices: many(prices),
  transactions: many(transactions),
}));

export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  instrumentId: integer("instrument_id")
    .notNull()
    .references(() => instruments.id),
  quantity: real("quantity").notNull(),
  avgCostPerUnit: real("avg_cost_per_unit").notNull(),
  importedAt: text("imported_at").notNull(),
});

export const positionsRelations = relations(positions, ({ one }) => ({
  account: one(accounts, {
    fields: [positions.accountId],
    references: [accounts.id],
  }),
  instrument: one(instruments, {
    fields: [positions.instrumentId],
    references: [instruments.id],
  }),
}));

export const prices = sqliteTable("prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instrumentId: integer("instrument_id")
    .notNull()
    .references(() => instruments.id),
  price: real("price").notNull(),
  date: text("date").notNull(),
  fetchedAt: text("fetched_at").notNull(),
});

export const pricesRelations = relations(prices, ({ one }) => ({
  instrument: one(instruments, {
    fields: [prices.instrumentId],
    references: [instruments.id],
  }),
}));

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  instrumentId: integer("instrument_id").references(() => instruments.id),
  date: text("date").notNull(),
  transactionType: text("transaction_type").notNull(),
  symbol: text("symbol"),
  description: text("description").notNull(),
  quantity: real("quantity"),
  price: real("price"),
  priceCurrency: text("price_currency"),
  grossAmount: real("gross_amount"),
  commission: real("commission"),
  netAmount: real("net_amount").notNull(),
  importedAt: text("imported_at").notNull(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  instrument: one(instruments, {
    fields: [transactions.instrumentId],
    references: [instruments.id],
  }),
}));

export const vaConfig = sqliteTable("va_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startDate: text("start_date").notNull(),
  monthlyIncrement: real("monthly_increment").notNull(),
  initialValue: real("initial_value").notNull(),
  createdAt: text("created_at").notNull(),
});

export const positionSnapshots = sqliteTable("position_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  instrumentId: integer("instrument_id")
    .notNull()
    .references(() => instruments.id),
  quantity: real("quantity").notNull(),
  avgCostPerUnit: real("avg_cost_per_unit").notNull(),
  price: real("price").notNull(),
  valueEur: real("value_eur").notNull(),
  costEur: real("cost_eur").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  createdAt: text("created_at").notNull(),
});

export const positionSnapshotsRelations = relations(positionSnapshots, ({ one }) => ({
  account: one(accounts, {
    fields: [positionSnapshots.accountId],
    references: [accounts.id],
  }),
  instrument: one(instruments, {
    fields: [positionSnapshots.instrumentId],
    references: [instruments.id],
  }),
}));

export const etfCountryWeights = sqliteTable("etf_country_weights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instrumentId: integer("instrument_id")
    .notNull()
    .references(() => instruments.id),
  country: text("country").notNull(),
  weight: real("weight").notNull(),
  fetchedAt: text("fetched_at").notNull(),
}, (table) => [
  unique().on(table.instrumentId, table.country),
]);

export const etfCountryWeightsRelations = relations(etfCountryWeights, ({ one }) => ({
  instrument: one(instruments, {
    fields: [etfCountryWeights.instrumentId],
    references: [instruments.id],
  }),
}));
