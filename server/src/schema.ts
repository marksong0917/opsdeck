import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// One row per board item. `section` is one of:
//   "decisions" | "today" | "deadlines" | "lanes" | "china"
// ("china" = page 3, the China-trip checklist; its rows stay
// open when ticked done — completion is the `status` field, "done",
// not `closedAt`, so a ticked row remains visible struck through.)
// `lane` groups items in the "lanes" section (and is free text elsewhere).
// `dueDate` is an ISO date string (YYYY-MM-DD) or null.
// A row is closed when `closedAt` is set; closed rows stay in the table
// but are not returned by getBoard.
export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  section: text("section", {
    enum: ["decisions", "today", "deadlines", "lanes", "china"],
  }).notNull(),
  lane: text("lane").notNull().default(""),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  status: text("status").notNull().default(""),
  dueDate: text("due_date"),
  // Mark's verdict on a "decisions" item, set when he taps 是/否 on the
  // board: "yes" | "no" | "" (not answered yet). Distinguishes
  // "answered and closed" from "dismissed without answering".
  verdict: text("verdict").notNull().default(""),
  sort: integer("sort").notNull().default(0),
  closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Latest reachability check per key. Website rows (key = domain) are
// written by the getStatus action's live probes; server rows (key =
// "office-server") are written by recordServerCheck when the assistant inspects a box
// that has no public endpoint. status: "up" | "down".
export const siteChecks = sqliteTable("site_checks", {
  key: text("key").primaryKey(),
  status: text("status").notNull().default(""),
  httpStatus: integer("http_status"),
  detail: text("detail").notNull().default(""),
  checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull(),
});

// Single-row table (id = 1) caching the latest Toronto weather snapshot
// fetched through ctx.tool.weather, so page loads stay fast and a failed
// refresh can fall back to the stale snapshot labeled with its fetch time.
export const weatherCache = sqliteTable("weather_cache", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
});

// Single-row table (id = 1) caching the latest CAD→CNY rate fetched
// from open.er-api.com, so header loads stay fast and a failed refresh
// can fall back to the stale snapshot flagged as such.
export const fxCache = sqliteTable("fx_cache", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
});

// Single-row table (id = 1) holding the board's last-updated instant,
// plus the most recent decision Mark answered on the board itself, so
// Tina can report it back in chat even after the item has scrolled off.
export const boardMeta = sqliteTable("board_meta", {
  id: integer("id").primaryKey(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  lastVerdictItemId: integer("last_verdict_item_id"),
  lastVerdict: text("last_verdict").notNull().default(""),
  lastVerdictAt: integer("last_verdict_at", { mode: "timestamp_ms" }),
  // Tina's one-line live status shown under the header, maintained by
  // Tina through updateBoardPulse.
  tinaStatus: text("tina_status").notNull().default("待命，随时喊我"),
  // JSON array of short one-line entries: what Tina finished today.
  doneToday: text("done_today").notNull().default("[]"),
  // JSON array of archived done-today buckets, one per Toronto date:
  // [{ date: "YYYY-MM-DD", items: string[] }], newest first, kept for
  // 7 days by the archiveDoneToday action.
  doneHistory: text("done_history").notNull().default("[]"),
});
