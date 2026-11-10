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

const sectionEnum = z.enum(["decisions", "today", "deadlines", "lanes", "china"]);

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
  alerts: z.array(z.string()),
  fetchedAt: z.string(),
  stale: z.boolean(),
});

type WeatherPayload = Omit<z.infer<typeof weatherShape>, "fetchedAt" | "stale">;

const WEATHER_TTL_MS = 60 * 60 * 1000;

const STATUS_TTL_MS = 10 * 60 * 1000;

// Example monitored sites — replace these with your own.
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
      "Returns today's Toronto weather for the board header, refreshing from the weather source when the cached snapshot is older than an hour and falling back to the stale snapshot (flagged stale) when a refresh fails.",
    request: z.object({}),
    response: z.object({ weather: weatherShape.nullable() }),
    handler: async (ctx): Promise<{ weather: z.infer<typeof weatherShape> | null }> => {
      const db = ctx.db<typeof schema>();
      const cachedRows = await db
        .select()
        .from(schema.weatherCache)
        .where(eq(schema.weatherCache.id, 1))
        .limit(1);
      const cached = cachedRows[0];
      let cachedPayload: WeatherPayload | null = null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached.payload) as WeatherPayload;
          // A snapshot with no temperature is a failed lookup, not data:
          // never serve it as if it were real weather.
          if (parsed.temperature !== null) cachedPayload = parsed;
        } catch {
          cachedPayload = null;
        }
      }
      if (
        cached &&
        cachedPayload &&
        Date.now() - cached.fetchedAt.getTime() < WEATHER_TTL_MS
      ) {
        return {
          weather: { ...cachedPayload, fetchedAt: cached.fetchedAt.toISOString(), stale: false },
        };
      }
      try {
        const result = await ctx.tool.weather("Toronto weather today", {
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
          alerts: w.alerts ?? [],
        };
        const now = new Date();
        await db
          .insert(schema.weatherCache)
          .values({ id: 1, payload: JSON.stringify(payload), fetchedAt: now })
          .onConflictDoUpdate({
            target: schema.weatherCache.id,
            set: { payload: JSON.stringify(payload), fetchedAt: now },
          });
        return { weather: { ...payload, fetchedAt: now.toISOString(), stale: false } };
      } catch {
        if (cached && cachedPayload) {
          return {
            weather: {
              ...cachedPayload,
              fetchedAt: cached.fetchedAt.toISOString(),
              stale: true,
            },
          };
        }
        return { weather: null };
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
      "Returns all open board items grouped by section, plus the board's last-updated timestamp.",
    request: z.object({}),
    response: z.object({
      decisions: z.array(itemShape),
      today: z.array(itemShape),
      deadlines: z.array(itemShape),
      lanes: z.array(itemShape),
      china: z.array(itemShape),
      updatedAt: z.string().nullable(),
      tinaStatus: z.string(),
      doneToday: z.array(z.string()),
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
      let doneToday: string[] = [];
      if (metaRow?.doneToday) {
        try {
          const parsed: unknown = JSON.parse(metaRow.doneToday);
          if (Array.isArray(parsed)) {
            doneToday = parsed.filter(
              (entry): entry is string => typeof entry === "string",
            );
          }
        } catch {
          doneToday = [];
        }
      }
      return {
        decisions: items.filter((i) => i.section === "decisions"),
        today: items.filter((i) => i.section === "today"),
        deadlines: items.filter((i) => i.section === "deadlines"),
        lanes: items.filter((i) => i.section === "lanes"),
        china: items.filter((i) => i.section === "china"),
        updatedAt: metaRow ? metaRow.updatedAt.toISOString() : null,
        tinaStatus: metaRow?.tinaStatus || "待命，随时喊我",
        doneToday,
        lastVerdict,
      };
    },
  }),

  updateBoardPulse: defineAction({
    description:
      "Updates Tina's one-line live status line and/or today's completed-items list shown on the board; omitted fields are left unchanged.",
    request: z.object({
      tinaStatus: z.string().min(1).optional(),
      doneToday: z.array(z.string()).optional(),
    }),
    response: okResponse,
    handler: async (ctx, args): Promise<z.infer<typeof okResponse>> => {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      const fields: { tinaStatus?: string; doneToday?: string } = {};
      if (args.tinaStatus !== undefined) fields.tinaStatus = args.tinaStatus;
      if (args.doneToday !== undefined)
        fields.doneToday = JSON.stringify(args.doneToday);
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

  addItem: defineAction({
    description:
      "Adds one item to a board section (decisions, today, deadlines, lanes, or china) and returns its id.",
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
        { section: "lanes", lane: "Outreach", title: "Supplier quote — waiting for reply", status: "Waiting", },
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
