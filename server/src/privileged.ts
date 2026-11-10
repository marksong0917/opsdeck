// Privileged host handlers for the Tina Ops Board.
//
// These run on the host (not in the action sandbox) so the board can
// reach the user's connected accounts through their official CLIs:
//   - Spotify: /opt/hatch/bin/spotify-api (now-playing / devices read,
//     pause / resume / skip / previous / set-volume control)
//   - Google Calendar: /opt/hatch/bin/hatch_gws_cli calendar events list
// The daemon routes those CLI calls through the artifact's declared
// connector grants (spotify access.read + playback.control,
// google_calendar events.list + calendar_list.list); the handlers only
// shape the CLI JSON into the small typed payloads the actions return.

import { spawnSync } from "node:child_process";
import {
  definePrivilegedContracts,
  definePrivilegedHandlers,
  z,
} from "@hatch/space-sdk";

type SpotifyState = {
  connected: boolean;
  isPlaying: boolean;
  trackName: string | null;
  artistName: string | null;
  contextName: string | null;
  progressMs: number | null;
  durationMs: number | null;
  deviceName: string | null;
  deviceId: string | null;
  volumePercent: number | null;
  devices: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    volumePercent: number | null;
  }[];
};

type CalendarEvent = {
  id: string;
  title: string;
  startMs: number | null;
  endMs: number | null;
  allDay: boolean;
  // For all-day events: the plain calendar date (YYYY-MM-DD), no timezone.
  startDate: string | null;
  location: string;
};

export const privileged = definePrivilegedContracts({
  spotifyState: {
    request: z.object({}),
    response: z.object({
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
    }),
    capabilities: ["spotify.access.read"],
    timeoutMs: 30_000,
  },
  spotifyControl: {
    request: z.object({
      command: z.enum(["pause", "resume", "skip", "previous", "setVolume"]),
      volumePercent: z.number().int().min(0).max(100).nullable(),
      deviceId: z.string().nullable(),
    }),
    response: z.object({ ok: z.boolean() }),
    capabilities: ["spotify.playback.control"],
    timeoutMs: 30_000,
  },
  calendarToday: {
    request: z.object({ timeMin: z.string(), timeMax: z.string() }),
    response: z.object({
      connected: z.boolean(),
      events: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          startMs: z.number().nullable(),
          endMs: z.number().nullable(),
          allDay: z.boolean(),
          startDate: z.string().nullable(),
          location: z.string(),
        }),
      ),
    }),
    capabilities: ["google_calendar.events.list", "google_calendar.calendar_list.list"],
    timeoutMs: 30_000,
  },
});

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Runs a connector CLI and parses its single JSON document from stdout.
 * Returns null on any failure (non-zero exit, timeout, unparseable). */
function runCliJson(bin: string, args: string[]): Json | null {
  try {
    const result = spawnSync(bin, args, {
      encoding: "utf8",
      timeout: 25_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (result.error || result.status !== 0 || typeof result.stdout !== "string") {
      return null;
    }
    const raw = result.stdout.trim();
    if (!raw) return null;
    try {
      return asRecord(JSON.parse(raw));
    } catch {
      // Some CLI modes print one JSON object per line; take the last
      // parseable line.
      const lines = raw.split("\n").filter((l) => l.trim().length > 0);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = asRecord(JSON.parse(lines[i] ?? ""));
          if (parsed) return parsed;
        } catch {
          // keep scanning
        }
      }
      return null;
    }
  } catch {
    return null;
  }
}

const SPOTIFY_BIN = "/opt/hatch/bin/spotify-api";
const GWS_BIN = "/opt/hatch/bin/hatch_gws_cli";

export const privilegedHandlers = definePrivilegedHandlers(privileged, {
  spotifyState() {
    const empty: SpotifyState = {
      connected: false,
      isPlaying: false,
      trackName: null,
      artistName: null,
      contextName: null,
      progressMs: null,
      durationMs: null,
      deviceName: null,
      deviceId: null,
      volumePercent: null,
      devices: [],
    };
    const status = runCliJson(SPOTIFY_BIN, ["status"]);
    if (!status || status.status !== "connected") return empty;

    const devicesJson = runCliJson(SPOTIFY_BIN, ["devices"]);
    const devicesBody = asRecord(devicesJson?.body) ?? devicesJson;
    const rawDevices = Array.isArray(devicesBody?.devices) ? devicesBody.devices : [];
    const devices: SpotifyState["devices"] = [];
    for (const raw of rawDevices) {
      const d = asRecord(raw);
      if (!d) continue;
      const id = str(d.id);
      if (!id) continue;
      devices.push({
        id,
        name: str(d.name) ?? id,
        type: str(d.type) ?? "",
        isActive: d.is_active === true,
        volumePercent: num(d.volume_percent),
      });
    }
    const activeDevice = devices.find((d) => d.isActive) ?? null;
    // When playback is paused Spotify reports no active device; fall
    // back to the first known device so the card can still name the
    // device and show/target its volume.
    const displayDevice = activeDevice ?? devices[0] ?? null;

    const now = runCliJson(SPOTIFY_BIN, ["now-playing"]);
    if (!now || now.ok === false) {
      return { ...empty, connected: true, devices };
    }
    const item = asRecord(now.item);
    const creators = Array.isArray(now.creators) ? now.creators : [];
    const artistNames = creators
      .map((c) => str(asRecord(c)?.name))
      .filter((n): n is string => n !== null);
    const context = asRecord(now.context);
    return {
      connected: true,
      isPlaying: now.playback_status === "PLAYING",
      trackName: item ? str(item.name) : null,
      artistName: artistNames.length > 0 ? artistNames.join(", ") : null,
      contextName: context ? str(context.name) : null,
      progressMs: num(now.progress_ms),
      durationMs: item ? num(item.duration_ms) : null,
      deviceName: displayDevice?.name ?? null,
      deviceId: displayDevice?.id ?? null,
      volumePercent: displayDevice?.volumePercent ?? null,
      devices,
    };
  },

  spotifyControl(args) {
    const argv: string[] = [args.command === "setVolume" ? "set-volume" : args.command];
    if (args.command === "setVolume") {
      if (args.volumePercent === null) return { ok: false };
      argv.push("--volume-percent", String(args.volumePercent));
      if (args.deviceId) argv.push("--target-device-id", args.deviceId);
    }
    const result = runCliJson(SPOTIFY_BIN, argv);
    if (result !== null && result.ok !== false) return { ok: true };
    if (args.command !== "resume") return { ok: false };
    // Resume 404s when Spotify has no active Connect device (the usual
    // paused-and-idle state). Fall back to starting the current context
    // on the target device, which wakes it and resumes the same queue.
    const now = runCliJson(SPOTIFY_BIN, ["now-playing"]);
    const contextUri = str(asRecord(now?.context)?.uri);
    if (!contextUri) return { ok: false };
    const playArgs = ["play", "--context-uri", contextUri];
    let deviceId = args.deviceId;
    if (!deviceId) {
      const devicesJson = runCliJson(SPOTIFY_BIN, ["devices"]);
      const devicesBody = asRecord(devicesJson?.body) ?? devicesJson;
      const first = Array.isArray(devicesBody?.devices)
        ? asRecord(devicesBody.devices[0])
        : null;
      deviceId = first ? str(first.id) : null;
    }
    if (deviceId) playArgs.push("--target-device-id", deviceId);
    const played = runCliJson(SPOTIFY_BIN, playArgs);
    return { ok: played !== null && played.ok !== false };
  },

  calendarToday(args) {
    const params = JSON.stringify({
      calendarId: "primary",
      timeMin: args.timeMin,
      timeMax: args.timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });
    const json = runCliJson(GWS_BIN, [
      "calendar",
      "events",
      "list",
      "--params",
      params,
      "--format",
      "json",
    ]);
    if (!json || json.ok === false) return { connected: false, events: [] };
    const rawItems: unknown[] = Array.isArray(json.items)
      ? json.items
      : Array.isArray(json.events)
        ? json.events
        : Array.isArray(asRecord(json.body)?.items)
          ? (asRecord(json.body)?.items as unknown[])
          : [];
    const events: CalendarEvent[] = [];
    for (const raw of rawItems) {
      const ev = asRecord(raw);
      if (!ev) continue;
      if (ev.status === "cancelled") continue;
      const start = asRecord(ev.start);
      const end = asRecord(ev.end);
      const startDate = str(start?.date);
      const startDateTime = str(start?.dateTime);
      const endDateTime = str(end?.dateTime);
      const allDay = startDate !== null;
      const startMs = allDay
        ? null
        : startDateTime
          ? Date.parse(startDateTime)
          : null;
      const endMs = endDateTime ? Date.parse(endDateTime) : null;
      events.push({
        id: str(ev.id) ?? `ev-${events.length}`,
        title: str(ev.summary) ?? "(无标题)",
        startMs: startMs !== null && Number.isFinite(startMs) ? startMs : null,
        endMs: endMs !== null && Number.isFinite(endMs ?? NaN) ? endMs : null,
        allDay,
        startDate: allDay ? startDate : null,
        location: str(ev.location) ?? "",
      });
    }
    return { connected: true, events };
  },
});
