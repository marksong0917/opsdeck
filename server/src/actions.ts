// Actions for the Tina Ops Board.
//
// The board is maintained by Tina (the user's agent) through these
// actions; the client only reads. There is no external data feed —
// every row is written explicitly by an add/update/close call, or by
// the one-time seed_board action that imports the brief's real items.

import { defineAction, z, type Ctx, type ActionsModule } from "@hatch/space-sdk";
import { asc, eq, isNull } from "drizzle-orm";
import * as schema from "./schema";
import { privileged } from "@space/privileged";

const sectionEnum = z.enum([
  "decisions",
  "today",
  "deadlines",
  "lanes",
  "china",
  "jason",
  "money",
  "growth",
]);

const verdictEnum = z.enum(["yes", "no"]);

const itemShape = z.object({
  id: z.number(),
  section: sectionEnum,
  lane: z.string(),
  title: z.string(),
  detail: z.string(),
  status: z.string(),
  dueDate: z.string().nullable(),
  verdict: z.string(),
  sort: z.number(),
  // v1.9.0: per-item stamps so each new page can show its own
  // 数据更新时间 (the newest updatedAt among its rows) and the
  // decisions page can date its 本周已清 rows (additive fields).
  closedAt: z.string().nullable(),
  updatedAt: z.string(),
});

type ItemRow = typeof schema.items.$inferSelect;

function toItem(row: ItemRow): z.infer<typeof itemShape> {
  return {
    id: row.id,
    section: row.section,
    lane: row.lane,
    title: row.title,
    detail: row.detail,
    status: row.status,
    dueDate: row.dueDate,
    verdict: row.verdict,
    sort: row.sort,
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function touchMeta(
  ctx: Ctx,
  verdict?: { itemId: number; verdict: "yes" | "no" },
): Promise<void> {
  const db = ctx.db<typeof schema>();
  const now = new Date();
  const verdictFields = verdict
    ? {
        lastVerdictItemId: verdict.itemId,
        lastVerdict: verdict.verdict,
        lastVerdictAt: now,
      }
    : {};
  await db
    .insert(schema.boardMeta)
    .values({ id: 1, updatedAt: now, ...verdictFields })
    .onConflictDoUpdate({
      target: schema.boardMeta.id,
      set: { updatedAt: now, ...verdictFields },
    });
}

const okResponse = z.object({ ok: z.literal(true) });

const doneHistoryShape = z.array(
  z.object({ date: z.string(), items: z.array(z.string()) }),
);

type DoneHistory = z.infer<typeof doneHistoryShape>;

function parseDoneHistory(raw: string | undefined | null): DoneHistory {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is { date: string; items: string[] } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { date?: unknown }).date === "string" &&
        Array.isArray((entry as { items?: unknown }).items) &&
        (entry as { items: unknown[] }).items.every(
          (i) => typeof i === "string",
        ),
    );
  } catch {
    return [];
  }
}

function parseStringList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (entry): entry is string => typeof entry === "string",
      );
    }
  } catch {
    // fall through
  }
  return [];
}

/** Toronto calendar date (YYYY-MM-DD) for an instant. */
function torontoDateKey(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

type BoardMetaRow = typeof schema.boardMeta.$inferSelect;

async function loadMetaRow(ctx: Ctx): Promise<BoardMetaRow | undefined> {
  const db = ctx.db<typeof schema>();
  const meta = await db
    .select()
    .from(schema.boardMeta)
    .where(eq(schema.boardMeta.id, 1))
    .limit(1);
  return meta[0];
}

type DoneState = {
  doneToday: string[];
  doneDate: string;
  history: DoneHistory;
};

/** Parse the done-today state out of a board_meta row. */
function doneStateFromMeta(metaRow: BoardMetaRow | undefined): DoneState {
  return {
    doneToday: parseStringList(metaRow?.doneToday),
    doneDate: metaRow?.doneDate ?? "",
    history: parseDoneHistory(metaRow?.doneHistory),
  };
}

/** Merge a finished day's list into its own history bucket, then drop
 * buckets older than the 7-day window (today plus the 6 previous
 * Toronto days; date keys compare correctly as YYYY-MM-DD strings). */
function rollIntoHistory(state: DoneState, todayKey: string): DoneHistory {
  const history = state.history.map((b) => ({
    date: b.date,
    items: [...b.items],
  }));
  if (state.doneToday.length > 0 && state.doneDate) {
    const existing = history.find((b) => b.date === state.doneDate);
    if (existing) {
      existing.items = [...existing.items, ...state.doneToday];
    } else {
      history.unshift({ date: state.doneDate, items: [...state.doneToday] });
    }
  }
  const cutoff = new Date(`${todayKey}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 6);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return history
    .filter((b) => b.date >= cutoffKey)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Normalize done state for "now": a done_today list stamped with a past
 * Toronto date is a finished day — it moves into history under its own
 * date instead of still being presented (or archived) as today's. An
 * unstamped list (doneDate "", written before the stamp existed) is
 * adopted as today's, so no recorded completion is ever dropped.
 */
function rollStaleDone(state: DoneState, todayKey: string): DoneState {
  if (state.doneDate && state.doneDate !== todayKey) {
    return {
      doneToday: [],
      doneDate: todayKey,
      history: rollIntoHistory(state, todayKey),
    };
  }
  return { ...state, doneDate: state.doneDate || todayKey };
}

/** Persist a done state onto the board_meta row (insert-or-update). */
async function saveDoneState(ctx: Ctx, state: DoneState): Promise<void> {
  const db = ctx.db<typeof schema>();
  const now = new Date();
  const fields = {
    doneToday: JSON.stringify(state.doneToday),
    doneDate: state.doneDate,
    doneHistory: JSON.stringify(state.history),
  };
  await db
    .insert(schema.boardMeta)
    .values({ id: 1, updatedAt: now, ...fields })
    .onConflictDoUpdate({
      target: schema.boardMeta.id,
      set: { updatedAt: now, ...fields },
    });
}

const forecastDayShape = z.object({
  date: z.string().nullable(),
  summary: z.string().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  precipitationChance: z.number().nullable(),
});

const weatherShape = z.object({
  location: z.string(),
  temperature: z.number().nullable(),
  unit: z.string(),
  description: z.string(),
  feelsLike: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  humidity: z.number().nullable(),
  precipitationChance: z.number().nullable(),
  wind: z.string().nullable(),
  sunrise: z.string().nullable(),
  sunset: z.string().nullable(),
  tomorrowSummary: z.string().nullable(),
  tomorrowHigh: z.number().nullable(),
  tomorrowLow: z.number().nullable(),
  uvIndex: z.number().nullable(),
  uvDescription: z.string().nullable(),
  airQualityIndex: z.number().nullable(),
  airQualityDescription: z.string().nullable(),
  forecast: z.array(forecastDayShape),
  alerts: z.array(z.string()),
  fetchedAt: z.string(),
  stale: z.boolean(),
});

const fxShape = z.object({
  rate: z.number(),
  inverse: z.number(),
  sourceDate: z.string().nullable(),
  sourceUpdatedUtc: z.string().nullable(),
  fetchedAt: z.string(),
  stale: z.boolean(),
});

type FxPayload = Omit<z.infer<typeof fxShape>, "fetchedAt" | "stale">;

const FX_TTL_MS = 6 * 60 * 60 * 1000;
const FX_URL = "https://open.er-api.com/v6/latest/CAD";

type WeatherPayload = Omit<z.infer<typeof weatherShape>, "fetchedAt" | "stale">;

const WEATHER_TTL_MS = 60 * 60 * 1000;

const STATUS_TTL_MS = 10 * 60 * 1000;

const SITE_DEFS = [
  { key: "example.com", label: "Main website", url: "https://example.com/" },
  { key: "shop.example.com", label: "Online store", url: "https://shop.example.com/" },
  { key: "app.example.com", label: "Web app", url: "https://app.example.com/" },
  { key: "blog.example.com", label: "Blog", url: "https://blog.example.com/" },
] as const;

const siteStatusShape = z.object({
  key: z.string(),
  label: z.string(),
  url: z.string(),
  status: z.enum(["up", "down", "unknown"]),
  httpStatus: z.number().nullable(),
  checkedAt: z.string().nullable(),
});

const serverStatusShape = z.object({
  key: z.string(),
  label: z.string(),
  sub: z.string(),
  status: z.enum(["up", "down", "unknown"]),
  mode: z.enum(["live", "inspection"]),
  checkedAt: z.string().nullable(),
  detail: z.string(),
});

const statusResponse = z.object({
  sites: z.array(siteStatusShape),
  servers: z.array(serverStatusShape),
  checkedAt: z.string().nullable(),
});

type SiteCheckRow = typeof schema.siteChecks.$inferSelect;

async function probeSiteOnce(
  url: string,
): Promise<{ up: boolean; httpStatus: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "TinaOpsBoard/1.0 (status check)" },
    });
    // We only need the status line; don't download the body.
    controller.abort();
    // Redirects are followed above, so the final status decides:
    // any 2xx/3xx counts as up.
    return { up: res.status >= 200 && res.status < 400, httpStatus: res.status };
  } catch {
    return { up: false, httpStatus: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A single failed probe is usually a transient network blip, not an
 * outage: retry once after a short pause. Only a site that fails the
 * retry as well may be marked down, so the board never shows red from
 * one hiccup.
 */
async function probeSite(
  url: string,
): Promise<{ up: boolean; httpStatus: number | null }> {
  const first = await probeSiteOnce(url);
  if (first.up) return first;
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return probeSiteOnce(url);
}

export const Actions = {
  getStatus: defineAction({
    description:
      "Returns live up/down status for the four public websites (probed over HTTPS with redirects followed, 2xx/3xx counts as up, one automatic retry before a site may be marked down, re-probed when the last check is over 10 minutes old) plus server status: the Mini PC follows the main site probe, and the office server shows the assistant's latest recorded inspection. All timestamps are instants the client renders in Toronto time.",
    request: z.object({ force: z.boolean().default(false) }),
    response: statusResponse,
    handler: async (ctx, args): Promise<z.infer<typeof statusResponse>> => {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.siteChecks);
      const byKey = new Map<string, SiteCheckRow>(rows.map((r) => [r.key, r]));
      const freshestSiteAt = SITE_DEFS.reduce<number | null>((acc, def) => {
        const at = byKey.get(def.key)?.checkedAt.getTime() ?? null;
        return at !== null && (acc === null || at < acc) ? at : acc;
      }, null);
      const stale =
        args.force ||
        freshestSiteAt === null ||
        Date.now() - freshestSiteAt > STATUS_TTL_MS;

      if (stale) {
        const now = new Date();
        const probed = await Promise.all(
          SITE_DEFS.map(async (def) => {
            const result = await probeSite(def.url);
            return { def, ...result };
          }),
        );
        for (const p of probed) {
          const status = p.up ? "up" : "down";
          await db
            .insert(schema.siteChecks)
            .values({
              key: p.def.key,
              status,
              httpStatus: p.httpStatus,
              detail: "",
              checkedAt: now,
            })
            .onConflictDoUpdate({
              target: schema.siteChecks.key,
              set: { status, httpStatus: p.httpStatus, detail: "", checkedAt: now },
            });
          byKey.set(p.def.key, {
            key: p.def.key,
            status,
            httpStatus: p.httpStatus,
            detail: "",
            checkedAt: now,
          });
        }
      }

      const toSiteStatus = (
        row: SiteCheckRow | undefined,
      ): "up" | "down" | "unknown" =>
        row?.status === "up" ? "up" : row?.status === "down" ? "down" : "unknown";

      const sites = SITE_DEFS.map((def) => {
        const row = byKey.get(def.key);
        return {
          key: def.key,
          label: def.label,
          url: def.url,
          status: toSiteStatus(row),
          httpStatus: row?.httpStatus ?? null,
          checkedAt: row ? row.checkedAt.toISOString() : null,
        };
      });

      const mainSite = byKey.get("example.com");
      const officeServer = byKey.get("office-server");
      const servers: z.infer<typeof serverStatusShape>[] = [
        {
          key: "mini-pc",
          label: "Mini PC",
          sub: "home-office mini PC",
          status: toSiteStatus(mainSite),
          mode: "live",
          checkedAt: mainSite ? mainSite.checkedAt.toISOString() : null,
          detail: "Inferred from the main site public endpoint",
        },
        {
          key: "office-server",
          label: "Office server",
          sub: "办公室服务器",
          status: toSiteStatus(officeServer),
          mode: "inspection",
          checkedAt: officeServer ? officeServer.checkedAt.toISOString() : null,
          detail: officeServer?.detail ?? "",
        },
      ];

      const allTimes = [
        ...sites.map((s) => s.checkedAt),
        ...servers.map((s) => s.checkedAt),
      ].filter((t): t is string => t !== null);
      return {
        sites,
        servers,
        checkedAt: allTimes.length > 0 ? allTimes.sort().at(-1) ?? null : null,
      };
    },
  }),

  recordServerCheck: defineAction({
    description:
      "Records Tina's latest inspection result for a server with no public endpoint (office-server), shown on the board's server status card as a 巡检 (inspection) status.",
    request: z.object({
      key: z.enum(["office-server"]),
      status: z.enum(["up", "down"]),
      detail: z.string().default(""),
    }),
    response: okResponse,
    handler: async (ctx, args): Promise<z.infer<typeof okResponse>> => {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      await db
        .insert(schema.siteChecks)
        .values({
          key: args.key,
          status: args.status,
          httpStatus: null,
          detail: args.detail,
          checkedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.siteChecks.key,
          set: {
            status: args.status,
            httpStatus: null,
            detail: args.detail,
            checkedAt: now,
          },
        });
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getWeather: defineAction({
    description:
      "Returns today's weather for Toronto (id 1) and the destination city (id 2) for the board header, refreshing each city from the weather source when its cached snapshot is older than an hour and falling back to the stale snapshot (flagged stale) when a refresh fails.",
    request: z.object({}),
    response: z.object({
      weather: weatherShape.nullable(),
      destination: weatherShape.nullable(),
    }),
    handler: async (
      ctx,
    ): Promise<{
      weather: z.infer<typeof weatherShape> | null;
      destination: z.infer<typeof weatherShape> | null;
    }> => {
      const loadCity = async (
        cacheId: number,
        query: string,
      ): Promise<z.infer<typeof weatherShape> | null> => {
        const db = ctx.db<typeof schema>();
        const cachedRows = await db
          .select()
          .from(schema.weatherCache)
          .where(eq(schema.weatherCache.id, cacheId))
          .limit(1);
        const cached = cachedRows[0];
        let cachedPayload: WeatherPayload | null = null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached.payload) as Partial<WeatherPayload> &
              WeatherPayload;
            if (parsed.temperature !== null && parsed.temperature !== undefined) {
              // Snapshots cached before v1.6.0 lack forecast/UV/AQI —
              // normalize so the response schema always holds.
              cachedPayload = {
                ...parsed,
                uvIndex: parsed.uvIndex ?? null,
                uvDescription: parsed.uvDescription ?? null,
                airQualityIndex: parsed.airQualityIndex ?? null,
                airQualityDescription: parsed.airQualityDescription ?? null,
                forecast: Array.isArray(parsed.forecast) ? parsed.forecast : [],
              };
            }
          } catch {
            cachedPayload = null;
          }
        }
        if (
          cached &&
          cachedPayload &&
          // Snapshots cached before v1.6.0 carry no forecast array —
          // treat those as expired so the 7-day forecast lands on the
          // first load after the upgrade instead of an hour later.
          cachedPayload.forecast.length > 0 &&
          Date.now() - cached.fetchedAt.getTime() < WEATHER_TTL_MS
        ) {
          return {
            ...cachedPayload,
            fetchedAt: cached.fetchedAt.toISOString(),
            stale: false,
          };
        }
        try {
          const result = await ctx.tool.weather(query, {
            language_code: "en",
          });
          const w = result.content;
          if (w.conditions.temperature === null) {
            throw new Error("weather lookup returned no conditions");
          }
          const today = w.forecast_days[0];
          const tomorrow = w.forecast_days[1];
          const payload: WeatherPayload = {
            location: w.location,
            temperature: w.conditions.temperature,
            unit: w.conditions.unit,
            description: w.conditions.description,
            feelsLike: w.conditions.feels_like ?? null,
            high: w.conditions.high ?? today?.high ?? null,
            low: w.conditions.low ?? today?.low ?? null,
            humidity: w.conditions.humidity_percent ?? null,
            precipitationChance:
              w.conditions.precipitation_chance ?? today?.precipitation_chance ?? null,
            wind: w.conditions.wind ?? null,
            sunrise: w.conditions.sunrise ?? null,
            sunset: w.conditions.sunset ?? null,
            tomorrowSummary: tomorrow?.summary ?? null,
            tomorrowHigh: tomorrow?.high ?? null,
            tomorrowLow: tomorrow?.low ?? null,
            uvIndex: w.conditions.uv_index ?? null,
            uvDescription: w.conditions.uv_description ?? null,
            airQualityIndex: w.conditions.air_quality_index ?? null,
            airQualityDescription: w.conditions.air_quality_description ?? null,
            forecast: (w.forecast_days ?? []).slice(0, 7).map((d) => ({
              date: d.date ?? null,
              summary: d.summary ?? null,
              high: d.high ?? null,
              low: d.low ?? null,
              precipitationChance: d.precipitation_chance ?? null,
            })),
            alerts: w.alerts ?? [],
          };
          const now = new Date();
          await db
            .insert(schema.weatherCache)
            .values({ id: cacheId, payload: JSON.stringify(payload), fetchedAt: now })
            .onConflictDoUpdate({
              target: schema.weatherCache.id,
              set: { payload: JSON.stringify(payload), fetchedAt: now },
            });
          return { ...payload, fetchedAt: now.toISOString(), stale: false };
        } catch {
          if (cached && cachedPayload) {
            return {
              ...cachedPayload,
              fetchedAt: cached.fetchedAt.toISOString(),
              stale: true,
            };
          }
          return null;
        }
      };
      const [toronto, destination] = await Promise.all([
        loadCity(1, "Toronto weather today"),
        loadCity(2, "Destination City weather today"),
      ]);
      return { weather: toronto, destination };
    },
  }),

  getFx: defineAction({
    description:
      "Returns the latest CAD→CNY exchange rate from open.er-api.com (ExchangeRate-API free endpoint, no key), cached for 6 hours in fx_cache; on refresh failure returns the stale cached rate flagged stale, or null when no rate has ever been fetched.",
    request: z.object({}),
    response: z.object({ fx: fxShape.nullable() }),
    handler: async (ctx): Promise<{ fx: z.infer<typeof fxShape> | null }> => {
      const db = ctx.db<typeof schema>();
      const cachedRows = await db
        .select()
        .from(schema.fxCache)
        .where(eq(schema.fxCache.id, 1))
        .limit(1);
      const cached = cachedRows[0];
      let cachedPayload: FxPayload | null = null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached.payload) as FxPayload;
          if (typeof parsed.rate === "number" && parsed.rate > 0) {
            cachedPayload = parsed;
          }
        } catch {
          cachedPayload = null;
        }
      }
      if (
        cached &&
        cachedPayload &&
        Date.now() - cached.fetchedAt.getTime() < FX_TTL_MS
      ) {
        return {
          fx: {
            ...cachedPayload,
            fetchedAt: cached.fetchedAt.toISOString(),
            stale: false,
          },
        };
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        let data: unknown;
        try {
          const res = await fetch(FX_URL, {
            signal: controller.signal,
            headers: { "user-agent": "TinaOpsBoard/1.0 (fx check)" },
          });
          if (!res.ok) throw new Error(`fx fetch ${res.status}`);
          data = await res.json();
        } finally {
          clearTimeout(timer);
        }
        const rec =
          typeof data === "object" && data !== null
            ? (data as Record<string, unknown>)
            : null;
        const rates =
          typeof rec?.rates === "object" && rec.rates !== null
            ? (rec.rates as Record<string, unknown>)
            : null;
        const rate = typeof rates?.CNY === "number" ? rates.CNY : null;
        if (!rec || rec.result !== "success" || rate === null || rate <= 0) {
          throw new Error("fx payload missing CNY rate");
        }
        const updatedUtc =
          typeof rec.time_last_update_utc === "string"
            ? rec.time_last_update_utc
            : null;
        const payload: FxPayload = {
          rate,
          inverse: 1 / rate,
          sourceDate: updatedUtc
            ? (() => {
                const d = new Date(updatedUtc);
                return Number.isNaN(d.getTime())
                  ? null
                  : d.toISOString().slice(0, 10);
              })()
            : null,
          sourceUpdatedUtc: updatedUtc,
        };
        const now = new Date();
        await db
          .insert(schema.fxCache)
          .values({ id: 1, payload: JSON.stringify(payload), fetchedAt: now })
          .onConflictDoUpdate({
            target: schema.fxCache.id,
            set: { payload: JSON.stringify(payload), fetchedAt: now },
          });
        return { fx: { ...payload, fetchedAt: now.toISOString(), stale: false } };
      } catch {
        if (cached && cachedPayload) {
          return {
            fx: {
              ...cachedPayload,
              fetchedAt: cached.fetchedAt.toISOString(),
              stale: true,
            },
          };
        }
        return { fx: null };
      }
    },
  }),

  getSpotify: defineAction({
    description:
      "Returns the user's live Spotify state (connection, now-playing track/artist, active device and volume, all devices) read through the Spotify connector.",
    request: z.object({}),
    response: z.object({
      spotify: z
        .object({
          connected: z.boolean(),
          isPlaying: z.boolean(),
          trackName: z.string().nullable(),
          artistName: z.string().nullable(),
          contextName: z.string().nullable(),
          progressMs: z.number().nullable(),
          durationMs: z.number().nullable(),
          deviceName: z.string().nullable(),
          deviceId: z.string().nullable(),
          volumePercent: z.number().nullable(),
          devices: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              type: z.string(),
              isActive: z.boolean(),
              volumePercent: z.number().nullable(),
            }),
          ),
        })
        .nullable(),
    }),
    privileged: [privileged.spotifyState],
    handler: async (ctx) => {
      try {
        const spotify = await ctx.executePrivileged(privileged.spotifyState, {});
        return { spotify };
      } catch {
        return { spotify: null };
      }
    },
  }),

  spotifyControl: defineAction({
    description:
      "Controls the user's Spotify playback (pause, resume, skip, previous, or set volume) through the Spotify connector and returns the refreshed playback state.",
    request: z.object({
      command: z.enum(["pause", "resume", "skip", "previous", "setVolume"]),
      volumePercent: z.number().int().min(0).max(100).nullable().default(null),
      deviceId: z.string().nullable().default(null),
    }),
    response: z.object({ ok: z.boolean() }),
    privileged: [privileged.spotifyControl],
    handler: async (ctx, args): Promise<{ ok: boolean }> => {
      try {
        return await ctx.executePrivileged(privileged.spotifyControl, {
          command: args.command,
          volumePercent: args.volumePercent,
          deviceId: args.deviceId,
        });
      } catch {
        return { ok: false };
      }
    },
  }),

  getBoard: defineAction({
    description:
      "Returns all open board items grouped by section (including the v1.9.0 jason/money/growth pages), plus this Toronto week's cleared jason rows for the 待拍板 page's 本周已清 strip, and the board's last-updated timestamp.",
    request: z.object({}),
    response: z.object({
      decisions: z.array(itemShape),
      today: z.array(itemShape),
      deadlines: z.array(itemShape),
      lanes: z.array(itemShape),
      china: z.array(itemShape),
      // v1.9.0 pages: 待拍板 (waiting-on-decision), CFO (money in/out),
      // 增长 (growth). jasonCleared = jason rows closed inside the
      // current Toronto week (Mon 00:00 Toronto → now).
      jasonOpen: z.array(itemShape),
      jasonCleared: z.array(itemShape),
      money: z.array(itemShape),
      growth: z.array(itemShape),
      updatedAt: z.string().nullable(),
      tinaStatus: z.string(),
      doneToday: z.array(z.string()),
      doneHistory: doneHistoryShape,
      lastVerdict: z
        .object({
          itemId: z.number(),
          title: z.string(),
          verdict: verdictEnum,
          at: z.string(),
        })
        .nullable(),
    }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.items)
        .where(isNull(schema.items.closedAt))
        .orderBy(asc(schema.items.sort), asc(schema.items.id));
      const meta = await db
        .select()
        .from(schema.boardMeta)
        .where(eq(schema.boardMeta.id, 1))
        .limit(1);
      const items = rows.map(toItem);
      const metaRow = meta[0];
      let lastVerdict: {
        itemId: number;
        title: string;
        verdict: "yes" | "no";
        at: string;
      } | null = null;
      if (
        metaRow?.lastVerdictItemId != null &&
        metaRow.lastVerdictAt != null &&
        (metaRow.lastVerdict === "yes" || metaRow.lastVerdict === "no")
      ) {
        const answered = await db
          .select({ title: schema.items.title })
          .from(schema.items)
          .where(eq(schema.items.id, metaRow.lastVerdictItemId))
          .limit(1);
        if (answered[0]) {
          lastVerdict = {
            itemId: metaRow.lastVerdictItemId,
            title: answered[0].title,
            verdict: metaRow.lastVerdict,
            at: metaRow.lastVerdictAt.toISOString(),
          };
        }
      }
      // A done list stamped with a past date is presented under its
      // own day in history, never as today's (read-side normalization;
      // the stored row is repaired by the next done write / archive).
      const todayKey = torontoDateKey(new Date());
      const doneState = rollStaleDone(doneStateFromMeta(metaRow), todayKey);
      // Today's archive bucket holds the same day's completions: the
      // archive action may run mid-day (it moves the whole list into
      // the bucket and clears done_today), but those items were still
      // completed TODAY — they display in 今日已完成 for the whole day
      // and only become history at day rollover. So the response folds
      // the bucket back into doneToday (bucket items first — they were
      // completed before anything still on the live list) and drops
      // the bucket from the history response, which keeps page 4 from
      // counting them twice when it merges the two.
      const todayBucket = doneState.history.find((b) => b.date === todayKey);
      const doneTodayMerged = todayBucket
        ? [
            ...todayBucket.items,
            ...doneState.doneToday.filter(
              (i) => !todayBucket.items.includes(i),
            ),
          ]
        : doneState.doneToday;
      const doneHistoryOut = doneState.history.filter(
        (b) => b.date !== todayKey,
      );
      // Deadlines render in pure chronological order — dueDate
      // ascending, soonest first — regardless of the stored sort
      // values; undated items keep their stored order at the end.
      const deadlines = items
        .filter((i) => i.section === "deadlines")
        .sort((a, b) => {
          if (a.dueDate && b.dueDate) {
            return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.id - b.id;
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return a.sort - b.sort || a.id - b.id;
        });
      // v1.9.0 — 待拍板 page: open jason rows are already in the main
      // (open-only) query; the page sorts them by drag days itself.
      // Cleared rows need a second look: jason rows closed inside the
      // current Toronto week (Monday 00:00 Toronto → now) form the
      // 本周已清 strip, newest closure first. Week membership is
      // decided by comparing Toronto date keys, so no UTC-offset math
      // can leak a Sunday-evening closure into the wrong week.
      const mondayKey = (() => {
        const today = new Date(`${todayKey}T12:00:00Z`);
        const offset = (today.getUTCDay() + 6) % 7; // days since Monday
        today.setUTCDate(today.getUTCDate() - offset);
        return today.toISOString().slice(0, 10);
      })();
      const jasonAll = await db
        .select()
        .from(schema.items)
        .where(eq(schema.items.section, "jason"));
      const jasonCleared = jasonAll
        .filter(
          (r) =>
            r.closedAt !== null && torontoDateKey(r.closedAt) >= mondayKey,
        )
        .sort(
          (a, b) =>
            (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0),
        )
        .map(toItem);
      return {
        decisions: items.filter((i) => i.section === "decisions"),
        today: items.filter((i) => i.section === "today"),
        deadlines,
        lanes: items.filter((i) => i.section === "lanes"),
        china: items.filter((i) => i.section === "china"),
        jasonOpen: items.filter((i) => i.section === "jason"),
        jasonCleared,
        money: items.filter((i) => i.section === "money"),
        growth: items.filter((i) => i.section === "growth"),
        updatedAt: metaRow ? metaRow.updatedAt.toISOString() : null,
        tinaStatus: metaRow?.tinaStatus || "待命，随时喊我",
        doneToday: doneTodayMerged,
        doneHistory: doneHistoryOut,
        lastVerdict,
      };
    },
  }),

  updateBoardPulse: defineAction({
    description:
      "Updates Tina's one-line live status line and/or today's completed-items list shown on the board; omitted fields are left unchanged. Passing doneToday REPLACES the whole list and stamps it with today's Toronto date — to log a single completion without resending the list, use appendDoneToday instead. A stale list stamped with a past date is first filed into history under its own date, never silently kept or dropped.",
    request: z.object({
      tinaStatus: z.string().min(1).optional(),
      doneToday: z.array(z.string()).optional(),
    }),
    response: okResponse,
    handler: async (ctx, args): Promise<z.infer<typeof okResponse>> => {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      const todayKey = torontoDateKey(now);
      const state = rollStaleDone(
        doneStateFromMeta(await loadMetaRow(ctx)),
        todayKey,
      );
      if (args.doneToday !== undefined) {
        state.doneToday = args.doneToday;
        state.doneDate = todayKey;
      }
      const fields: {
        tinaStatus?: string;
        doneToday: string;
        doneDate: string;
        doneHistory: string;
      } = {
        doneToday: JSON.stringify(state.doneToday),
        doneDate: state.doneDate,
        doneHistory: JSON.stringify(state.history),
      };
      if (args.tinaStatus !== undefined) fields.tinaStatus = args.tinaStatus;
      await db
        .insert(schema.boardMeta)
        .values({ id: 1, updatedAt: now, ...fields })
        .onConflictDoUpdate({
          target: schema.boardMeta.id,
          set: { updatedAt: now, ...fields },
        });
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  appendDoneToday: defineAction({
    description:
      "Appends one or more completed-item lines to today's done list — the write-back path for logging a completion the moment it happens, without resending the whole list. Entries already on the list are skipped. A stale list stamped with a past date is first filed into history under its own date. Returns today's full list after the append and how many entries were actually added.",
    request: z.object({ entries: z.array(z.string().min(1)).min(1) }),
    response: z.object({ doneToday: z.array(z.string()), added: z.number() }),
    handler: async (
      ctx,
      args,
    ): Promise<{ doneToday: string[]; added: number }> => {
      const todayKey = torontoDateKey(new Date());
      const state = rollStaleDone(
        doneStateFromMeta(await loadMetaRow(ctx)),
        todayKey,
      );
      // Dedupe against today's archive bucket too: an entry archived
      // earlier today is already done today and must not land twice.
      const bucketItems =
        state.history.find((b) => b.date === todayKey)?.items ?? [];
      let added = 0;
      for (const entry of args.entries) {
        const line = entry.trim();
        if (
          line &&
          !state.doneToday.includes(line) &&
          !bucketItems.includes(line)
        ) {
          state.doneToday.push(line);
          added += 1;
        }
      }
      state.doneDate = todayKey;
      await saveDoneState(ctx, state);
      ctx.invalidateQueries();
      return { doneToday: state.doneToday, added };
    },
  }),

  archiveDoneToday: defineAction({
    description:
      "Archives the current done-today list into the done-history bucket for the list's own stamped Toronto date (merging into that date's bucket if one already exists), clears done-today, and drops history buckets older than 7 days (today plus the 6 previous days are kept). The nightly reset runs at 00:07 — already the next day — so the bucket follows the list's date stamp, not the run time; unstamped lists file under today. Returns the archived count and the history after pruning.",
    request: z.object({}),
    response: z.object({
      archived: z.number(),
      history: doneHistoryShape,
    }),
    handler: async (ctx): Promise<{ archived: number; history: DoneHistory }> => {
      const todayKey = torontoDateKey(new Date());
      const state = doneStateFromMeta(await loadMetaRow(ctx));
      const archived = state.doneToday.length;
      const history = rollIntoHistory(
        { ...state, doneDate: state.doneDate || todayKey },
        todayKey,
      );
      await saveDoneState(ctx, { doneToday: [], doneDate: todayKey, history });
      ctx.invalidateQueries();
      return { archived, history };
    },
  }),

  addItem: defineAction({
    description:
      "Adds one item to a board section (decisions, today, deadlines, lanes, china, jason, money, or growth) and returns its id. Feed conventions for the v1.9.0 pages: jason rows carry the ask date in dueDate and an optional hard date as an ISO date in status; money rows use lane \"ar\"/\"ap\", the due date in dueDate, and the CAD amount as a plain decimal string in status; growth rows group by lane (\"founding\"/\"funnel\"/\"outreach\") with the feed's value string in status.",
    request: z.object({
      section: sectionEnum,
      title: z.string().min(1),
      detail: z.string().default(""),
      lane: z.string().default(""),
      status: z.string().default(""),
      dueDate: z.string().nullable().default(null),
      sort: z.number().int().default(0),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const result = await db
        .insert(schema.items)
        .values({
          section: args.section,
          title: args.title,
          detail: args.detail,
          lane: args.lane,
          status: args.status,
          dueDate: args.dueDate,
          sort: args.sort,
        })
        .returning({ id: schema.items.id });
      const inserted = result[0];
      if (!inserted) throw new Error("addItem: insert returned no rows");
      await touchMeta(ctx);
      ctx.invalidateQueries();
      return { id: inserted.id };
    },
  }),

  updateItem: defineAction({
    description:
      "Updates fields of one existing board item by id; omitted fields are left unchanged.",
    request: z.object({
      id: z.number().int().positive(),
      section: sectionEnum.optional(),
      title: z.string().min(1).optional(),
      detail: z.string().optional(),
      lane: z.string().optional(),
      status: z.string().optional(),
      dueDate: z.string().nullable().optional(),
      sort: z.number().int().optional(),
    }),
    response: okResponse,
    handler: async (ctx, args): Promise<z.infer<typeof okResponse>> => {
      const db = ctx.db<typeof schema>();
      const { id, ...fields } = args;
      await db
        .update(schema.items)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(schema.items.id, id));
      await touchMeta(ctx);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  applyV172BoardUpdates: defineAction({
    description:
      "One-time v1.7.2 board data update: marks today item 47 (15:30 QB 浏览器下午场) as blocked with its deferral note, and refreshes the Foxuma lane item 17 to the 0.369-live / 0.370-in-build wording. Each write is guarded by the item's current text, so re-running it after the board has moved on changes nothing. Returns the ids actually updated.",
    request: z.object({}),
    response: z.object({ updated: z.array(z.number()) }),
    handler: async (ctx): Promise<{ updated: number[] }> => {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.items)
        .where(isNull(schema.items.closedAt));
      const byId = new Map(rows.map((r) => [r.id, r]));
      const updated: number[] = [];
      const now = new Date();

      const item47 = byId.get(47);
      if (
        item47 &&
        item47.section === "today" &&
        item47.title.includes("15:30") &&
        item47.status !== "blocked"
      ) {
        await db
          .update(schema.items)
          .set({
            status: "blocked",
            detail: "验证码未取得 · 残单顺延明天",
            updatedAt: now,
          })
          .where(eq(schema.items.id, 47));
        updated.push(47);
      }

      const item17 = byId.get(17);
      if (
        item17 &&
        item17.section === "lanes" &&
        item17.title.includes("0.368")
      ) {
        await db
          .update(schema.items)
          .set({
            title: "Foxuma 队列定版推进（0.369 已上线 · 0.370 在建）",
            detail:
              "0.364–0.368 连上五版：通知清扫 + Trash purge、工资条修复、员工档案结构、lead 生命周期、Files UX。0.369 已上线，0.370 在建（Q3-B 分拣免确认）。Q2 发票补链至 70 条。后排：测试账号隐藏 → 邮箱证明 + 退订 → 分享同事 → Settings 大合并",
            updatedAt: now,
          })
          .where(eq(schema.items.id, 17));
        updated.push(17);
      }

      if (updated.length > 0) {
        await touchMeta(ctx);
        ctx.invalidateQueries();
      }
      return { updated };
    },
  }),

  applyV180DoneBackfill: defineAction({
    description:
      "One-time v1.8.0 safety net for the 2026-11-13 done-today gap: that morning's completions (the 09:30 QB special trip, PO 261108) were first recorded only in board prose. Each is appended to done_today ONLY if no existing entry — on the live list or in today's archive bucket — already covers it (matched by its TVH amount / 261108 marker); the QB entry is composed from the today item's own current text and the 261108 entry from Tina's status line, so re-running changes nothing once the board has moved on. Returns the entries added.",
    request: z.object({}),
    response: z.object({ added: z.array(z.string()) }),
    handler: async (ctx): Promise<{ added: string[] }> => {
      const db = ctx.db<typeof schema>();
      const todayKey = torontoDateKey(new Date());
      const metaRow = await loadMetaRow(ctx);
      const state = rollStaleDone(doneStateFromMeta(metaRow), todayKey);
      // Everything already credited with today's completions: the live
      // list plus today's archive bucket (getBoard presents them as
      // one list, so coverage is checked against the union).
      const covered = [
        ...state.doneToday,
        ...(state.history.find((b) => b.date === todayKey)?.items ?? []),
      ];
      const isCovered = (marker: string) =>
        covered.some((entry) => entry.includes(marker));
      const added: string[] = [];
      const rows = await db
        .select()
        .from(schema.items)
        .where(isNull(schema.items.closedAt));
      const qbItem = rows.find(
        (r) =>
          r.section === "today" &&
          r.title.includes("09:30") &&
          `${r.title} ${r.detail}`.includes("提前办完"),
      );
      if (qbItem && !isCovered("TVH")) {
        const name = qbItem.title.replace(/^\d{1,2}:\d{2}\s*/, "").trim();
        const entry = (
          qbItem.detail ? `${name} · ${qbItem.detail}` : `${name}已办完`
        ).slice(0, 140);
        state.doneToday.push(entry);
        added.push(entry);
      }
      if (
        (metaRow?.tinaStatus ?? "").includes("261108 已办完") &&
        !isCovered("261108")
      ) {
        const entry = "261108 已办完";
        state.doneToday.push(entry);
        added.push(entry);
      }
      if (added.length > 0) {
        state.doneDate = todayKey;
        await saveDoneState(ctx, state);
        ctx.invalidateQueries();
      }
      return { added };
    },
  }),

  applyV190GrowthSeed: defineAction({
    description:
      "One-time v1.9.0 seed for the 增长 page: inserts the single verified Founding fact (10 seats total, a demo tenant — Maple & Grain — holds seat 1, 9 remaining) as a growth row in lane \"founding\". Guarded — if any growth row already exists it changes nothing, so the Foxuma room's live feed always wins over the seed. Returns how many rows were seeded.",
    request: z.object({}),
    response: z.object({ seeded: z.number() }),
    handler: async (ctx): Promise<{ seeded: number }> => {
      const db = ctx.db<typeof schema>();
      const existing = await db
        .select({ id: schema.items.id })
        .from(schema.items)
        .where(eq(schema.items.section, "growth"))
        .limit(1);
      if (existing.length > 0) return { seeded: 0 };
      await db.insert(schema.items).values({
        section: "growth",
        lane: "founding",
        title: "Founding 名额",
        detail: "共 10 个名额 · Maple & Grain（演示租户）已占 1",
        status: "余 9",
        dueDate: null,
        sort: 0,
      });
      await touchMeta(ctx);
      ctx.invalidateQueries();
      return { seeded: 1 };
    },
  }),

  toggleChinaDone: defineAction({
    description:
      "Toggles one 'china' (page 3 回国待办) item between done and open by setting its status to \"done\" or clearing it; the row stays on the list either way.",
    request: z.object({
      id: z.number().int().positive(),
      done: z.boolean(),
    }),
    response: okResponse,
    handler: async (ctx, args): Promise<z.infer<typeof okResponse>> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.items)
        .set({ status: args.done ? "done" : "", updatedAt: new Date() })
        .where(eq(schema.items.id, args.id));
      await touchMeta(ctx);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  closeItem: defineAction({
    description:
      "Closes one board item by id so it no longer appears on the board.",
    request: z.object({ id: z.number().int().positive() }),
    response: okResponse,
    handler: async (ctx, args): Promise<z.infer<typeof okResponse>> => {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      await db
        .update(schema.items)
        .set({ closedAt: now, updatedAt: now })
        .where(eq(schema.items.id, args.id));
      await touchMeta(ctx);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  answerDecision: defineAction({
    description:
      "Records Mark's yes/no answer on a 'decisions' item from the board UI, closes the item, and notes it as the board's latest verdict.",
    request: z.object({
      id: z.number().int().positive(),
      verdict: verdictEnum,
    }),
    response: okResponse,
    handler: async (ctx, args): Promise<z.infer<typeof okResponse>> => {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      await db
        .update(schema.items)
        .set({ verdict: args.verdict, closedAt: now, updatedAt: now })
        .where(eq(schema.items.id, args.id));
      await touchMeta(ctx, { itemId: args.id, verdict: args.verdict });
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  undoDecision: defineAction({
    description:
      "Undoes Mark's verdict on a decision item: clears the verdict, reopens the item on the board, and clears the board's latest-verdict note if it pointed at this item.",
    request: z.object({ id: z.number().int().positive() }),
    response: okResponse,
    handler: async (ctx, args): Promise<z.infer<typeof okResponse>> => {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      await db
        .update(schema.items)
        .set({ verdict: "", closedAt: null, updatedAt: now })
        .where(eq(schema.items.id, args.id));
      const meta = await db
        .select()
        .from(schema.boardMeta)
        .where(eq(schema.boardMeta.id, 1))
        .limit(1);
      if (meta[0]?.lastVerdictItemId === args.id) {
        await db
          .update(schema.boardMeta)
          .set({ lastVerdictItemId: null, lastVerdict: "", lastVerdictAt: null })
          .where(eq(schema.boardMeta.id, 1));
      }
      await touchMeta(ctx);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getLastVerdict: defineAction({
    description:
      "Returns the most recent decision Mark answered on the board (item id, title, verdict, and when), or null if he has not answered any yet.",
    request: z.object({}),
    response: z.object({
      verdict: z
        .object({
          itemId: z.number(),
          title: z.string(),
          verdict: verdictEnum,
          at: z.string(),
        })
        .nullable(),
    }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const meta = await db
        .select()
        .from(schema.boardMeta)
        .where(eq(schema.boardMeta.id, 1))
        .limit(1);
      const metaRow = meta[0];
      const itemId = metaRow?.lastVerdictItemId ?? null;
      const at = metaRow?.lastVerdictAt ?? null;
      const lv = metaRow?.lastVerdict ?? "";
      if (itemId == null || at == null || (lv !== "yes" && lv !== "no")) {
        return { verdict: null };
      }
      const answered = await db
        .select({ title: schema.items.title })
        .from(schema.items)
        .where(eq(schema.items.id, itemId))
        .limit(1);
      if (!answered[0]) return { verdict: null };
      const verdictValue: "yes" | "no" = lv === "yes" ? "yes" : "no";
      return {
        verdict: {
          itemId,
          title: answered[0].title,
          verdict: verdictValue,
          at: at.toISOString(),
        },
      };
    },
  }),

  replaceTodaySchedule: defineAction({
    description:
      "Replaces the whole 'today' section with the given list of timed items, closing the previous ones.",
    request: z.object({
      items: z.array(
        z.object({
          title: z.string().min(1),
          detail: z.string().default(""),
          status: z.string().default(""),
        }),
      ),
    }),
    response: z.object({ count: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      await db
        .update(schema.items)
        .set({ closedAt: now, updatedAt: now })
        .where(eq(schema.items.section, "today"));
      for (const [index, item] of args.items.entries()) {
        await db.insert(schema.items).values({
          section: "today",
          title: item.title,
          detail: item.detail,
          status: item.status,
          sort: index,
        });
      }
      await touchMeta(ctx);
      ctx.invalidateQueries();
      return { count: args.items.length };
    },
  }),

  seedBoard: defineAction({
    description:
      "One-time import of demo items so a fresh board shows its layout; a no-op if the board already has items. Replace the demo seeds with your own.",
    request: z.object({}),
    response: z.object({ seeded: z.number() }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const existing = await db
        .select({ id: schema.items.id })
        .from(schema.items)
        .limit(1);
      if (existing.length > 0) return { seeded: 0 };

      type Seed = {
        section: z.infer<typeof sectionEnum>;
        title: string;
        detail?: string;
        lane?: string;
        status?: string;
        dueDate?: string;
      };
      const seeds: Seed[] = [
        // Decisions waiting on you (demo data)
        {
          section: "decisions",
          title: "Approve the new website launch",
          detail: "Demo item — your Muse replaces these seeds with your real work.",
        },
        {
          section: "decisions",
          title: "Pick the Q1 marketing budget",
          detail: "Demo item",
        },
        // Today's schedule (demo data)
        { section: "today", title: "09:00 Morning checks", detail: "Inbox + calendar", status: "Done" },
        { section: "today", title: "10:30 Team meeting notes", status: "In progress" },
        { section: "today", title: "14:00 Afternoon status probe" },
        { section: "today", title: "17:30 Evening briefing" },
        // Deadlines within 14 days (demo data)
        { section: "deadlines", title: "Quarterly tax filing", detail: "Accountant prepares", dueDate: "2026-12-15" },
        { section: "deadlines", title: "Backup restore drill", detail: "Assistant runs it", dueDate: "2026-12-20" },
        { section: "deadlines", title: "Certificate renewal", dueDate: "2026-12-31" },
        // Open items by lane (demo data)
        { section: "lanes", lane: "Bookkeeping", title: "Match this week's bank feed", detail: "Demo item" },
        { section: "lanes", lane: "Product", title: "Next release train queued", detail: "Demo item" },
        { section: "lanes", lane: "Outreach", title: "Supplier quote — waiting for reply", status: "Waiting" },
        // Waiting-on-decision page (demo data; dueDate = the day the ask was raised)
        { section: "jason", title: "Quote approval for the demo kitchen job", detail: "Demo item — waiting on the decision-maker.", dueDate: "2026-12-01" },
        { section: "jason", title: "Confirm the delivery-date change", detail: "Demo item", dueDate: "2026-12-05" },
        // CFO page (demo data; status = the amount as a plain decimal string)
        { section: "money", lane: "ar", title: "INV-1001 · Maple & Grain", detail: "Demo receivable", status: "1250.00", dueDate: "2026-12-20" },
        { section: "money", lane: "ar", title: "INV-1002 · Demo Customer", detail: "Demo receivable", status: "480.00", dueDate: "2026-12-22" },
        { section: "money", lane: "ap", title: "Payroll remittance", detail: "Demo payable", status: "860.00", dueDate: "2026-12-15" },
        // Growth founding demo row lives in applyV190GrowthSeed — no growth
        // rows here, so that guarded seed can still land its demo row.
        // Trip page checklist (demo data)
        { section: "china", title: "Book the airport transfer", detail: "Demo item" },
        { section: "china", title: "Get a travel eSIM", detail: "Demo item" },
        { section: "china", title: "Pack gifts for family", detail: "Demo item" },
      ];

      for (const [index, seed] of seeds.entries()) {
        await db.insert(schema.items).values({
          section: seed.section,
          title: seed.title,
          detail: seed.detail ?? "",
          lane: seed.lane ?? "",
          status: seed.status ?? "",
          dueDate: seed.dueDate ?? null,
          sort: index,
        });
      }
      await touchMeta(ctx);
      ctx.invalidateQueries();
      return { seeded: seeds.length };
    },
  }),
} satisfies ActionsModule;
