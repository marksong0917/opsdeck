import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// One row per board item. `section` is one of:
//   "decisions" | "today" | "deadlines" | "lanes" | "china"
//   | "jason" | "money" | "growth"
// ("china" = page 3, the 回国待办 China-trip checklist; its rows stay
// open when ticked done — completion is the `status` field, "done",
// not `closedAt`, so a ticked row remains visible struck through.)
// v1.9.0 sections (the plain-TEXT column needs no SQL migration):
//   "jason"  = the 待拍板 page (waiting-on-decision list): dueDate is
//     the day the ask was raised (drag days = today − dueDate), and
//     `status` carries a hard date as an ISO date string when the item
//     has one. Closed rows surface in getBoard as this Toronto week's
//     本周已清 strip instead of disappearing.
//   "money"  = the CFO page (page retired in v1.9.1; the data
//     pipeline stays): lane is "ar" （应收） or "ap" （应付）, dueDate
//     is the due date. The CAD amount lives in the numeric `amount`
//     column since v1.9.2 (migration 0010) — `status` carried it as a
//     plain decimal string (e.g. "4267.50") before that, and the
//     QB-room feed backfills `amount` from the ledger.
//   "growth" = the 增长 page: lane groups rows ("founding" | "funnel"
//     | "outreach"); values are feed-written strings shown as-is.
// `lane` groups items in the "lanes" section (and is free text elsewhere).
// `dueDate` is an ISO date string (YYYY-MM-DD) or null.
// A row is closed when `closedAt` is set; closed rows stay in the table
// but are not returned by getBoard (except the jason 本周已清 strip).
export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  section: text("section", {
    enum: [
      "decisions",
      "today",
      "deadlines",
      "lanes",
      "china",
      "jason",
      "money",
      "growth",
    ],
  }).notNull(),
  lane: text("lane").notNull().default(""),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  status: text("status").notNull().default(""),
  // Numeric amount (v1.9.2): the money rows' CAD amount as a real
  // number. Optional — null for every other section's rows.
  amount: real("amount"),
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
// "office-server") are written by recordServerCheck when Tina inspects a box
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
  // Toronto date (YYYY-MM-DD) the current done_today list belongs to,
  // stamped by every write (updateBoardPulse / appendDoneToday). ""
  // means unstamped (pre-v1.8.0 rows). The stamp is what lets
  // archiveDoneToday file a list under its own day even when the
  // nightly reset runs after midnight, and lets getBoard stop calling
  // a stale list "today".
  doneDate: text("done_date").notNull().default(""),
  // JSON array of archived done-today buckets, one per Toronto date:
  // [{ date: "YYYY-MM-DD", items: string[] }], newest first, kept for
  // 7 days by the archiveDoneToday action.
  doneHistory: text("done_history").notNull().default("[]"),
});
