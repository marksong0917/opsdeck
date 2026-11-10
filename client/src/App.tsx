import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaTopScrim } from "@hatch/space-sdk/client";
import { api, type ApiResponse } from "./api";

type Board = ApiResponse<typeof api, "getBoard">;
type Item = Board["today"][number];
type Verdict = "yes" | "no";
type BusyKind = "done" | "delete" | "save" | "dismiss";

/** Board display preferences: theme mode + UI language. Both persist in
 * localStorage ("ops-board-theme" / "ops-board-lang"); the theme defaults
 * to following the OS, the language to Chinese. `activeLang` is set by
 * App on every render before any child renders, so the plain helper
 * functions below can localize without prop drilling. */
type Lang = "zh" | "en";
type ThemeMode = "system" | "light" | "dark";

let activeLang: Lang = "zh";

const STR = {
  zh: {
    loading: "加载中…",
    loadFailed: "看板加载失败",
    retry: "重试",
    boardTitle: "Tina 工作台",
    refresh: "↻ 刷新",
    refreshing: "刷新中…",
    refreshAria: "刷新看板数据",
    updatedAt: "数据更新于",
    torontoTimeSuffix: " · 多伦多时间",
    statDecisions: "待拍板",
    statToday: "今日定时",
    statDue14: "14 天到期",
    statOpen: "开放事项",
    heroNoneNote: "没有等拍板的事，Tina 都盯着呢",
    offWorkPrefix: "下班 18:00",
    offDone: "已下班",
    toronto: "多伦多",
    beijing: "北京",
    weatherToday: "多伦多",
    wxHigh: "高",
    wxLow: "低",
    feelsLike: "体感",
    precip: "降水",
    windLabel: "风",
    tomorrow: "明日",
    staleData: "上次数据",
    weatherLoading: "多伦多天气加载中…",
    weatherUnavailable: "多伦多天气暂时取不到",
    tinaNow: "Tina 正在",
    quickLinks: "快捷入口",
    opensNewWindow: "（新窗口打开）",
    doneToday: "今日已完成",
    doneTodayEmpty: "今天的完成记录还没上来，Tina 正在推进中。",
    decisionsTitle: "待 Mark 拍板",
    decisionsEmpty: "暂时没有等你决定的事，Tina 都盯着呢，放心忙你的。",
    recentVerdict: "最近拍板",
    undo: "撤销",
    undoing: "撤销中…",
    markDecided: "Mark 已拍板",
    approved: "✓ 已通过",
    rejected: "✗ 已否决",
    torontoTimeParen: "（多伦多时间）",
    yes: "✓ 是",
    no: "✗ 否",
    submitting: "提交中…",
    shelve: "搁置",
    shelveConfirm: "确认搁置？",
    shelving: "搁置中…",
    answerFailed: "没提交成功，拍板还没记下。",
    todayTitle: "今日定时与动态",
    torontoTime: "多伦多时间",
    todayEmpty: "今天没有排定的事项，难得清闲。",
    nextUp: "下一项",
    deadlinesTitle: "未来 14 天到期",
    deadlinesEmpty: "未来 14 天没有到期的事项，都在轨道上。",
    farTitle: "14 天后到期",
    farEmpty: "14 天后暂时没有到期的事项，都在近处盯着呢。",
    noDate: "未定日期",
    dueTodayChip: "今天到期",
    lanesTitle: "各 Lane 开放事项",
    addNew: "+ 新增",
    collapse: "收起",
    addItemAria: "新增开放事项",
    edit: "编辑",
    done: "✓ 完成",
    processing: "处理中…",
    delete: "删除",
    deleting: "删除中…",
    deleteConfirm: "确认删除？",
    formTitleAria: "事项标题",
    formDetailAria: "事项说明",
    formStatusAria: "事项状态",
    titlePh: "标题",
    detailPh: "说明（可空）",
    statusPh: "状态（可空，如：等待中）",
    save: "保存",
    cancel: "取消",
    add: "添加",
    adding: "添加中…",
    otherLaneOption: "其他（新 Lane）",
    newLaneAria: "新 Lane 名称",
    newLanePh: "新 Lane 名称（可空，默认「其他」）",
    errAdd: "没添加成功，再试一次。",
    errSave: "没保存成功，再试一次。",
    errProcess: "没处理成功，再试一次。",
    tabsAria: "看板分页",
    page1: "第 1 页 · 工作台",
    page3: "第 3 页 · 回国待办",
    chinaTitle: "回国待办",
    chinaTripLine: "20XX-XX-XX 出发 · 目的地 · 20XX-XX-XX 回程",
    chinaEmpty: "还没有回国待办",
    chinaAddItemAria: "新增回国待办",
    chinaMarkDone: "标记完成",
    chinaMarkUndone: "取消完成",
    chinaProgress: "已完成",
    statusDetail: "状态详情",
    recheck: "↻ 重新检测",
    recheckAria: "重新检测状态",
    statusFootnote:
      "网站与 Mini PC 每 10 分钟自动检测一次（Mini PC 经主站公开入口判断）；办公室服务器没有公开入口，显示的是助理最近一次巡检记录。",
    siteStatus: "网站状态",
    serverStatus: "服务器状态",
    checkingSites: "正在检测各站点…",
    readingServers: "正在读取服务器状态…",
    checking: "检测中…",
    statusNormal: "正常",
    statusDownWord: "无法访问",
    statusUnknown: "未知",
    liveWord: "实时",
    inspectionWord: "巡检",
    noRecord: "暂无记录",
    torontoParen: "（多伦多）",
    viewStatusAria: "查看状态详情",
    statusLabel: "状态",
    footer: "由 Tina 维护 · 汇报在 Main，看板在这里",
    portfolioLink: "作品集",
    themeAria: "显示模式",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    langAria: "语言 / Language",
    spotifyLabel: "Spotify",
    spotifyLoading: "Spotify 加载中…",
    spotifyUnavailable: "Spotify 暂时取不到",
    spotifyNotConnected: "Spotify 未连接",
    spotifyIdle: "现在没在播放",
    spotifyPlayingOn: "播放中",
    spotifyPausedOn: "已暂停",
    prevTrack: "上一首",
    nextTrack: "下一首",
    playLabel: "播放",
    pauseLabel: "暂停",
    volumeLabel: "音量",
    versionWord: "版本",
  },
  en: {
    loading: "Loading…",
    loadFailed: "Board failed to load",
    retry: "Retry",
    boardTitle: "Tina Workbench",
    refresh: "↻ Refresh",
    refreshing: "Refreshing…",
    refreshAria: "Refresh board data",
    updatedAt: "Updated",
    torontoTimeSuffix: " · Toronto time",
    statDecisions: "To decide",
    statToday: "Today's schedule",
    statDue14: "Due in 14 days",
    statOpen: "Open items",
    heroNoneNote: "Nothing waiting — Tina has it covered",
    offWorkPrefix: "Off work 18:00",
    offDone: "Done for the day",
    toronto: "Toronto",
    beijing: "Beijing",
    weatherToday: "Toronto",
    wxHigh: "High",
    wxLow: "Low",
    feelsLike: "Feels",
    precip: "Precip",
    windLabel: "Wind",
    tomorrow: "Tomorrow",
    staleData: "last known",
    weatherLoading: "Loading Toronto weather…",
    weatherUnavailable: "Toronto weather unavailable",
    tinaNow: "Tina is",
    quickLinks: "Quick links",
    opensNewWindow: "(opens in a new window)",
    doneToday: "Done today",
    doneTodayEmpty: "Nothing logged yet — Tina is on it.",
    decisionsTitle: "Awaiting Mark's call",
    decisionsEmpty: "Nothing needs your decision right now.",
    recentVerdict: "Latest call",
    undo: "Undo",
    undoing: "Undoing…",
    markDecided: "Mark decided",
    approved: "✓ Approved",
    rejected: "✗ Rejected",
    torontoTimeParen: "(Toronto time)",
    yes: "✓ Yes",
    no: "✗ No",
    submitting: "Submitting…",
    shelve: "Shelve",
    shelveConfirm: "Shelve it?",
    shelving: "Shelving…",
    answerFailed: "Couldn't submit — your call wasn't recorded.",
    todayTitle: "Today's schedule & activity",
    torontoTime: "Toronto time",
    todayEmpty: "Nothing scheduled today.",
    nextUp: "Next",
    deadlinesTitle: "Due in the next 14 days",
    deadlinesEmpty: "Nothing due in the next 14 days.",
    farTitle: "Due after 14 days",
    farEmpty: "Nothing due beyond 14 days for now.",
    noDate: "No date",
    dueTodayChip: "Due today",
    lanesTitle: "Open items by lane",
    addNew: "+ Add",
    collapse: "Collapse",
    addItemAria: "Add an open item",
    edit: "Edit",
    done: "✓ Done",
    processing: "Working…",
    delete: "Delete",
    deleting: "Deleting…",
    deleteConfirm: "Confirm delete?",
    formTitleAria: "Item title",
    formDetailAria: "Item details",
    formStatusAria: "Item status",
    titlePh: "Title",
    detailPh: "Details (optional)",
    statusPh: "Status (optional, e.g. Waiting)",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    adding: "Adding…",
    otherLaneOption: "Other (new lane)",
    newLaneAria: "New lane name",
    newLanePh: "New lane name (optional)",
    errAdd: "Couldn't add it — try again.",
    errSave: "Couldn't save — try again.",
    errProcess: "Couldn't do that — try again.",
    tabsAria: "Board pages",
    page1: "Page 1 · Workbench",
    page3: "Page 3 · China Trip",
    chinaTitle: "China Trip",
    chinaTripLine: "Depart 20XX-XX-XX · Destination · Return 20XX-XX-XX",
    chinaEmpty: "No China trip to-dos yet",
    chinaAddItemAria: "Add a China trip to-do",
    chinaMarkDone: "Mark done",
    chinaMarkUndone: "Mark not done",
    chinaProgress: "done",
    statusDetail: "Status detail",
    recheck: "↻ Re-check",
    recheckAria: "Re-check status",
    statusFootnote:
      "Sites and the Mini PC are checked every 10 minutes (the Mini PC is judged via the main site's public entry); the office server has no public entry, so the assistant's latest inspection record is shown.",
    siteStatus: "Websites",
    serverStatus: "Servers",
    checkingSites: "Checking sites…",
    readingServers: "Reading server status…",
    checking: "Checking…",
    statusNormal: "OK",
    statusDownWord: "Unreachable",
    statusUnknown: "Unknown",
    liveWord: "Live",
    inspectionWord: "Inspection",
    noRecord: "No record yet",
    torontoParen: "(Toronto)",
    viewStatusAria: "View status details",
    statusLabel: "Status",
    footer: "Maintained by Tina · Reports in Main, the board lives here",
    portfolioLink: "Portfolio",
    themeAria: "Display theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    langAria: "语言 / Language",
    spotifyLabel: "Spotify",
    spotifyLoading: "Loading Spotify…",
    spotifyUnavailable: "Spotify unavailable right now",
    spotifyNotConnected: "Spotify not connected",
    spotifyIdle: "Nothing playing right now",
    spotifyPlayingOn: "Playing",
    spotifyPausedOn: "Paused",
    prevTrack: "Previous track",
    nextTrack: "Next track",
    playLabel: "Play",
    pauseLabel: "Pause",
    volumeLabel: "Volume",
    versionWord: "Version",
  },
} as const;

type StrKey = keyof (typeof STR)["zh"];

/** Current UI string for a key, in the active language. */
function t(key: StrKey): string {
  return STR[activeLang][key];
}

/** Lane names are stored data keys; only their display is localized. */
function laneDisplay(lane: string): string {
  if (activeLang === "zh") return lane;
  const map: Record<string, string> = {
    外联: "Outreach",
    设备与机器: "Equipment",
    其他: "Other",
  };
  return map[lane] ?? lane;
}

/** Intl locale for the active language. */
function uiLocale(): string {
  return activeLang === "zh" ? "zh-CN" : "en-US";
}


/** Board release version, bumped by Tina on each shipped edit.
 * v1.0 = one-screen workbench (CRUD + status + weather/clocks);
 * v1.1 = theme/language toggles + expandable hero;
 * v1.2 = Spotify card + today's calendar + phone overflow fix;
 * v1.2.1 = calendar merge removed at the owner's direction (board items only);
 * v1.2.2 = page-2 two-column layout, one-line header weather, compact
 * header stat strip;
 * v1.2.3 = weather condition words + item status pills follow the UI
 * language; page 2 goes full-width when nothing is due after 14 days;
 * v1.2.4 = footer gets a row of quick links to the owner's personal projects
 * (portfolio, GitHub, Typebook, FoxShare);
 * v1.3.0 = page 3 "China Trip" checklist: a check-off list backed by the
 * new "china" item section; ticking a row sets status "done" in place. */
const BOARD_VERSION = "v1.3.0";
const BOARD_VERSION_DATE = "2026-11-10";

const LANE_ORDER = ["Bookkeeping", "Product", "General Ops", "Outreach", "Devices", "Servers"];

const LANE_DOT: Record<string, string> = {
  Bookkeeping: "#0f766e",
  Product: "#1d6fb8",
  "General Ops": "#64748b",
  Outreach: "#b45309",
  Devices: "#0891b2",
  Servers: "#be3455",
};

/** Small 16px stroke icons (Lucide-style paths), one accent color per lane. */
function SvgIcon({
  color,
  className,
  size,
  children,
}: {
  color?: string;
  className?: string;
  size?: number;
  children: ReactNode;
}) {
  return (
    <svg
      width={size ?? 16}
      height={size ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "mt-1 shrink-0"}
    >
      {children}
    </svg>
  );
}

type SectionKind = "decisions" | "today" | "deadlines" | "lanes" | "sites" | "servers" | "china";

function SectionGlyph({
  kind,
  color,
  size,
}: {
  kind: SectionKind;
  color?: string;
  size?: number;
}) {
  const c = color ?? "var(--accent)";
  const s = size ?? 16;
  if (kind === "decisions") {
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" x2="4" y1="22" y2="15" />
      </SvgIcon>
    );
  }
  if (kind === "today") {
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </SvgIcon>
    );
  }
  if (kind === "deadlines") {
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </SvgIcon>
    );
  }
  if (kind === "sites") {
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </SvgIcon>
    );
  }
  if (kind === "servers") {
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <rect x="2" y="2" width="20" height="8" rx="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" />
        <line x1="6" x2="6.01" y1="6" y2="6" />
        <line x1="6" x2="6.01" y1="18" y2="18" />
      </SvgIcon>
    );
  }
  if (kind === "china") {
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </SvgIcon>
    );
  }
  return (
    <SvgIcon color={c} size={s} className="shrink-0">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </SvgIcon>
  );
}

/** Feishu-style module tile: soft tinted rounded square + colored glyph. */
const TILE_STYLE: Record<SectionKind, { bg: string; fg: string }> = {
  decisions: {
    bg: "color-mix(in srgb, var(--accent) 13%, transparent)",
    fg: "var(--accent)",
  },
  today: { bg: "rgba(59,130,246,0.13)", fg: "#3b82f6" },
  deadlines: { bg: "rgba(217,119,6,0.14)", fg: "#d97706" },
  lanes: { bg: "rgba(139,92,246,0.13)", fg: "#8b5cf6" },
  sites: { bg: "rgba(8,145,178,0.13)", fg: "#0891b2" },
  servers: { bg: "rgba(190,52,85,0.12)", fg: "#be3455" },
  china: { bg: "rgba(220,38,38,0.11)", fg: "#dc2626" },
};

function SectionTile({ kind }: { kind: SectionKind }) {
  const tile = TILE_STYLE[kind];
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: tile.bg }}
    >
      <SectionGlyph kind={kind} color={tile.fg} size={14} />
    </span>
  );
}

const CARD_CLASS =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_16px_rgba(16,24,40,0.05)] [@media(max-height:949px)]:py-1.5";

function LaneGlyph({ lane }: { lane: string }) {
  // Row glyphs stay single-accent; color lives in the header tiles,
  // status pills, and the lane group dots.
  const color = "var(--accent)";
  switch (lane) {
    case "Bookkeeping":
      return (
        <SvgIcon color={color}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </SvgIcon>
      );
    case "Product":
      return (
        <SvgIcon color={color}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </SvgIcon>
      );
    case "General Ops":
      return (
        <SvgIcon color={color}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </SvgIcon>
      );
    case "外联":
      return (
        <SvgIcon color={color}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </SvgIcon>
      );
    case "设备与机器":
      return (
        <SvgIcon color={color}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M9 2v2" />
          <path d="M15 2v2" />
          <path d="M9 20v2" />
          <path d="M15 20v2" />
          <path d="M2 9h2" />
          <path d="M2 15h2" />
          <path d="M20 9h2" />
          <path d="M20 15h2" />
        </SvgIcon>
      );
    case "Servers":
      return (
        <SvgIcon color={color}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </SvgIcon>
      );
    default:
      return (
        <span
          aria-hidden="true"
          className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      );
  }
}

/** Timeline rows carry no lane; infer a glyph from the row's own words. */
function TodayGlyph({ item }: { item: Item }) {
  if (item.lane) return <LaneGlyph lane={item.lane} />;
  const hay = `${item.title} ${item.detail}`;
  if (/QB|发票|QuickBooks/i.test(hay)) return <LaneGlyph lane="Bookkeeping" />;
  if (hay.includes("外联")) return <LaneGlyph lane="外联" />;
  if (/CNC|分拣|里程/.test(hay)) return <LaneGlyph lane="设备与机器" />;
  return (
    <SvgIcon color="var(--dim)">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </SvgIcon>
  );
}

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (activeLang === "en") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(d);
  }
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${month}月${day}日 ${weekdays[d.getDay()] ?? ""}`;
}

/** Toronto's calendar date (YYYY-MM-DD) right now — the board's "today"
 * always follows Toronto, wherever the viewing device happens to be. */
function torontoTodayKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function daysUntil(iso: string): number {
  const today = new Date(`${torontoTodayKey(new Date())}T00:00:00`);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function splitTime(title: string): { time: string | null; rest: string } {
  const match = /^(\d{1,2}:\d{2})\s+(.+)$/.exec(title);
  if (!match) return { time: null, rest: title };
  return { time: match[1] ?? null, rest: match[2] ?? title };
}

function timeToMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight right now in Toronto, for timeline states. */
function torontoNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** The workday ends at 18:00 in the owner's timezone. Live off-work state for the header. */function offWorkState(now: Date): { off: boolean; label: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const remaining = 18 * 3600 - (get("hour") * 3600 + get("minute") * 60 + get("second"));
  if (remaining <= 0) return { off: true, label: t("offDone") };
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  if (activeLang === "en") {
    const countdown =
      hours > 0 ? `${hours} h ${minutes} min left` : `${minutes} min left`;
    return { off: false, label: `Working · ${countdown}` };
  }
  const countdown =
    hours > 0 ? `还差 ${hours} 小时 ${minutes} 分` : `还差 ${minutes} 分`;
  return { off: false, label: `上班中 · ${countdown}` };
}

function formatTorontoTime(d: Date): string {
  return d.toLocaleString(uiLocale(), {
    timeZone: "America/Toronto",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Live clock face (HH:MM:SS) for one fixed IANA timezone. */
function formatClockTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(uiLocale(), {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** Short date label (M月D日 周X) for one fixed IANA timezone. */
function formatZoneDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(uiLocale(), {
    timeZone,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

function WeatherGlyph() {
  return (
    <SvgIcon color="#f5b942" size={15} className="shrink-0">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </SvgIcon>
  );
}

type Weather = ApiResponse<typeof api, "getWeather">["weather"];

/** The weather source reports condition phrases in English; map the
 * common ones to Chinese for the board, falling back to the raw text. */
const WX_ZH: Record<string, string> = {
  Fair: "晴",
  Sunny: "晴",
  Clear: "晴",
  "Mostly Clear": "晴朗",
  "Mostly Sunny": "晴间多云",
  "Partly Cloudy": "多云间晴",
  "Mostly Cloudy": "多云",
  Cloudy: "多云",
  Overcast: "阴",
  Rain: "雨",
  "Light Rain": "小雨",
  "Heavy Rain": "大雨",
  Showers: "阵雨",
  "PM Showers": "午后阵雨",
  Snow: "雪",
  "Light Snow": "小雪",
  Thunderstorm: "雷阵雨",
  Thunderstorms: "雷阵雨",
  Fog: "雾",
  Mist: "薄雾",
  Wind: "有风",
  Windy: "大风",
  "Sunny/Wind": "晴·有风",
};

/**
 * Chinese label for an English weather condition phrase. Tries an exact
 * match, then a case-insensitive one, then translates each part of a
 * slash combo ("Sunny/Wind" → "晴·有风"); anything unmapped stays raw.
 */
function wxZh(description: string): string {
  const exact = WX_ZH[description];
  if (exact) return exact;
  const lower = description.toLowerCase();
  for (const [key, value] of Object.entries(WX_ZH)) {
    if (key.toLowerCase() === lower) return value;
  }
  if (description.includes("/")) {
    const parts = description.split("/").map((part) => part.trim());
    const translated = parts.map((part) => {
      const hit = Object.entries(WX_ZH).find(
        ([key]) => key.toLowerCase() === part.toLowerCase(),
      );
      return hit ? hit[1] : null;
    });
    if (translated.every((part): part is string => part !== null)) {
      return translated.join("·");
    }
  }
  return description;
}

function fmtTemp(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}°`;
}

/**
 * Top-right header block: live Toronto + Beijing clocks side by side,
 * with Toronto's weather for today underneath. Ticks every second.
 */
function HeaderClockWeather({
  weather,
  weatherPending,
  onRetryWeather,
}: {
  weather: Weather;
  weatherPending: boolean;
  onRetryWeather: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const work = offWorkState(now);

  return (
    <div className="w-full min-w-0 text-left sm:w-auto sm:shrink-0 sm:text-right">
      <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 sm:justify-end">
        <span
          className={
            work.off
              ? "max-w-full rounded-full bg-[var(--header-chip)] px-2 py-0.5 text-[11px] font-medium leading-snug text-[var(--header-dim)]"
              : "max-w-full rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium leading-snug text-emerald-700 dark:text-emerald-300"
          }
        >
          <span
            aria-hidden="true"
            className={
              work.off
                ? "mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--header-dim)] align-middle"
                : "mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 align-middle motion-reduce:animate-none dark:bg-emerald-400"
            }
          />
          {t("offWorkPrefix")} · {work.label}
        </span>
        <span className="text-[11px] text-[var(--header-dim)]">
          {t("toronto")} {formatZoneDate(now, "America/Toronto")}{" "}
          <span className="text-sm font-bold tabular-nums text-[var(--header-text)]">
            {formatClockTime(now, "America/Toronto")}
          </span>
        </span>
        <span className="border-l border-[var(--header-border)] pl-3 text-[11px] text-[var(--header-dim)]">
          {t("beijing")} {formatZoneDate(now, "Asia/Shanghai")}{" "}
          <span className="text-sm font-bold tabular-nums text-[var(--header-text)]">
            {formatClockTime(now, "Asia/Shanghai")}
          </span>
        </span>
      </div>
      <div className="mt-1">
        {weather ? (
          <p
            className="flex flex-nowrap items-center justify-start gap-x-1.5 whitespace-nowrap text-xs tabular-nums text-[var(--header-dim)] sm:justify-end"
            title={[
              weather.feelsLike !== null
                ? `${t("feelsLike")} ${fmtTemp(weather.feelsLike)}`
                : null,
              weather.precipitationChance !== null
                ? `${t("precip")} ${Math.round(weather.precipitationChance)}%`
                : null,
              weather.wind ? `${t("windLabel")} ${weather.wind}` : null,
            ]
              .filter((part): part is string => part !== null)
              .join(" · ")}
          >
            <WeatherGlyph />
            <span className="font-medium text-[var(--header-text)]">{t("weatherToday")}</span>
            <span className="text-sm font-bold tabular-nums text-[var(--header-text)]">
              {fmtTemp(weather.temperature)}
            </span>
            <span className="text-[var(--header-text)]">
              {activeLang === "zh"
                ? wxZh(weather.description)
                : weather.description}
            </span>
            <span>
              {weather.high !== null || weather.low !== null
                ? `· ${t("wxHigh")} ${fmtTemp(weather.high)} ${t("wxLow")} ${fmtTemp(weather.low)}`
                : ""}
              {weather.tomorrowHigh !== null && weather.tomorrowLow !== null
                ? ` · ${t("tomorrow")} ${Math.round(weather.tomorrowLow)}–${Math.round(weather.tomorrowHigh)}°`
                : weather.tomorrowHigh !== null || weather.tomorrowLow !== null
                  ? ` · ${t("tomorrow")} ${fmtTemp(weather.tomorrowLow)}~${fmtTemp(weather.tomorrowHigh)}`
                  : ""}
              {weather.stale ? ` · ${t("staleData")}` : ""}
              {weather.alerts.length > 0 ? ` · ⚠ ${weather.alerts.join("；")}` : ""}
            </span>
          </p>
        ) : weatherPending ? (
          <p className="text-xs text-[var(--header-dim)] sm:text-right">{t("weatherLoading")}</p>
        ) : (
          <p className="text-xs text-[var(--header-dim)] sm:text-right">
            {t("weatherUnavailable")}
            <button
              type="button"
              onClick={onRetryWeather}
              aria-label={t("retry")}
              className="ml-2 font-medium text-[var(--header-text)] underline underline-offset-2"
            >
              {t("retry")}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

const QUICK_LINKS: {
  label: string;
  href: string;
  bg: string;
  glyph: ReactNode;
}[] = [
  {
    label: "Hub",
    href: "https://app.example.com/",
    bg: "rgba(15,118,110,0.13)",
    glyph: (
      <SvgIcon color="#0f766e" size={18} className="shrink-0">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </SvgIcon>
    ),
  },
  {
    label: "QuickBooks",
    href: "https://qbo.intuit.com",
    bg: "rgba(44,160,28,0.13)",
    glyph: (
      <SvgIcon color="#2ca01c" size={18} className="shrink-0">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </SvgIcon>
    ),
  },
  {
    label: "Gmail",
    href: "https://mail.google.com",
    bg: "rgba(234,67,53,0.12)",
    glyph: (
      <SvgIcon color="#ea4335" size={18} className="shrink-0">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </SvgIcon>
    ),
  },
  {
    label: "Drive",
    href: "https://drive.google.com",
    bg: "rgba(249,171,0,0.15)",
    glyph: (
      <SvgIcon color="#d9930d" size={18} className="shrink-0">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </SvgIcon>
    ),
  },
  {
    label: "App",
    href: "https://app.example.com",
    bg: "rgba(29,111,184,0.13)",
    glyph: (
      <SvgIcon color="#1d6fb8" size={18} className="shrink-0">
        <path d="M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z" />
        <path d="M9 21v-8h6v8" />
      </SvgIcon>
    ),
  },
];

/** Slim strip under the header: Tina's live status line + quick links. */
function TinaPulseStrip({ tinaStatus }: { tinaStatus: string }) {
  return (
    <div className={`${CARD_CLASS} mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 [@media(max-height:949px)]:mt-1.5`}>
      <p className="flex min-w-0 items-center gap-2 text-sm text-[var(--text)]">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none"
        />
        <span className="shrink-0 font-medium text-[var(--dim)]">{t("tinaNow")}</span>
        <span className="truncate font-medium">{tinaStatus}</span>
      </p>
      <nav aria-label={t("quickLinks")} className="ml-auto min-w-0">
        <ul className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {QUICK_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${link.label} ${t("opensNewWindow")}`}
                className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-[var(--bg)]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ backgroundColor: link.bg }}
                >
                  {link.glyph}
                </span>
                <span className="text-[13px] font-medium text-[var(--text)]">{link.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Compact strip of what Tina finished today (from board_meta.done_today). */
function DoneTodayStrip({ items }: { items: string[] }) {
  return (
    <div className={`${CARD_CLASS} mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 [@media(max-height:949px)]:mt-1.5`}>
      <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[var(--text)]">
        <SvgIcon color="var(--accent)" size={14} className="shrink-0">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </SvgIcon>
        {t("doneToday")}
      </span>
      {items.length === 0 ? (
        <span className="truncate text-[13px] text-[var(--dim)]">
          {t("doneTodayEmpty")}
        </span>
      ) : (
        <ul className="flex min-w-0 flex-wrap items-center gap-1">
          {items.map((entry) => (
            <li
              key={entry}
              className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
            >
              ✓ {entry}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type SpotifyState = ApiResponse<typeof api, "getSpotify">["spotify"];

function SpotifyGlyph() {
  return (
    <SvgIcon color="#1db954" size={16} className="shrink-0">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 10.5c2.7-.8 5.5-.6 8 .7" />
      <path d="M8.2 13.3c2.2-.6 4.4-.4 6.4.7" />
      <path d="M8.4 16c1.7-.5 3.4-.3 5 .6" />
    </SvgIcon>
  );
}

/**
 * Slim Spotify strip under the Tina pulse row: now-playing (track /
 * artist / device) with previous / play-pause / next buttons and a
 * volume slider. Polls every 45 s; every control refetches the state
 * immediately after it lands. Quiet empty states when Spotify is not
 * connected or nothing is playing.
 */
function SpotifyStrip({
  state,
  pending,
  controlPending,
  onControl,
  onRetry,
}: {
  state: SpotifyState | undefined;
  pending: boolean;
  controlPending: boolean;
  onControl: (args: {
    command: "pause" | "resume" | "skip" | "previous" | "setVolume";
    volumePercent: number | null;
    deviceId: string | null;
  }) => void;
  onRetry: () => void;
}) {
  const [volume, setVolume] = useState<number | null>(null);
  const serverVolume = state?.volumePercent ?? null;
  useEffect(() => {
    if (!controlPending) setVolume(serverVolume);
  }, [serverVolume, controlPending]);
  const shownVolume = volume ?? serverVolume ?? 0;
  const hasTrack = Boolean(state?.connected && state.trackName);
  const btnCls =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text)] transition hover:bg-[var(--bg)] active:scale-95 motion-reduce:transition-none disabled:opacity-40";

  return (
    <div
      aria-label={t("spotifyLabel")}
      className={`${CARD_CLASS} mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 [@media(max-height:949px)]:mt-1.5`}
    >
      <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[var(--text)]">
        <SpotifyGlyph />
        {t("spotifyLabel")}
      </span>
      {state === undefined && pending ? (
        <span className="text-[13px] text-[var(--dim)]">{t("spotifyLoading")}</span>
      ) : state === null || state === undefined ? (
        <span className="flex items-center gap-2 text-[13px] text-[var(--dim)]">
          {t("spotifyUnavailable")}
          <button
            type="button"
            onClick={onRetry}
            className="font-medium text-[var(--text)] underline underline-offset-2"
          >
            {t("retry")}
          </button>
        </span>
      ) : !state.connected ? (
        <span className="text-[13px] text-[var(--dim)]">{t("spotifyNotConnected")}</span>
      ) : !hasTrack ? (
        <span className="min-w-0 truncate text-[13px] text-[var(--dim)]">
          {t("spotifyIdle")}
          {state.devices.length > 0
            ? ` · ${state.devices.map((d) => d.name).join("、")}`
            : ""}
        </span>
      ) : (
        <>
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-hidden="true"
              className={
                state.isPlaying
                  ? "h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#1db954] motion-reduce:animate-none"
                  : "h-2 w-2 shrink-0 rounded-full bg-[var(--dim)]"
              }
            />
            <span className="min-w-0 truncate text-sm text-[var(--text)]">
              <span className="font-medium">{state.trackName}</span>
              {state.artistName ? (
                <span className="text-[var(--dim)]"> · {state.artistName}</span>
              ) : null}
              {state.deviceName ? (
                <span className="text-[var(--dim)]">
                  {" "}
                  · {state.isPlaying ? t("spotifyPlayingOn") : t("spotifyPausedOn")} ·{" "}
                  {state.deviceName}
                </span>
              ) : null}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              disabled={controlPending}
              onClick={() =>
                onControl({ command: "previous", volumePercent: null, deviceId: null })
              }
              aria-label={t("prevTrack")}
              className={btnCls}
            >
              <SvgIcon size={17} className="shrink-0">
                <polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none" />
                <line x1="5" x2="5" y1="19" y2="5" />
              </SvgIcon>
            </button>
            <button
              type="button"
              disabled={controlPending}
              onClick={() =>
                onControl({
                  command: state.isPlaying ? "pause" : "resume",
                  volumePercent: null,
                  deviceId: null,
                })
              }
              aria-label={state.isPlaying ? t("pauseLabel") : t("playLabel")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1db954] text-white shadow-sm transition hover:brightness-110 active:scale-95 motion-reduce:transition-none disabled:opacity-40"
            >
              {state.isPlaying ? (
                <SvgIcon size={17} className="shrink-0">
                  <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
                  <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
                </SvgIcon>
              ) : (
                <SvgIcon size={17} className="shrink-0">
                  <polygon points="7 4 20 12 7 20 7 4" fill="currentColor" stroke="none" />
                </SvgIcon>
              )}
            </button>
            <button
              type="button"
              disabled={controlPending}
              onClick={() =>
                onControl({ command: "skip", volumePercent: null, deviceId: null })
              }
              aria-label={t("nextTrack")}
              className={btnCls}
            >
              <SvgIcon size={17} className="shrink-0">
                <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none" />
                <line x1="19" x2="19" y1="5" y2="19" />
              </SvgIcon>
            </button>
          </span>
          {serverVolume !== null ? (
            <span className="flex shrink-0 items-center gap-1.5">
              <SvgIcon color="var(--dim)" size={15} className="shrink-0">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </SvgIcon>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={shownVolume}
                disabled={controlPending}
                onChange={(e) => setVolume(Number(e.target.value))}
                onPointerUp={() =>
                  onControl({
                    command: "setVolume",
                    volumePercent: shownVolume,
                    deviceId: state.deviceId,
                  })
                }
                onKeyUp={() =>
                  onControl({
                    command: "setVolume",
                    volumePercent: shownVolume,
                    deviceId: state.deviceId,
                  })
                }
                aria-label={t("volumeLabel")}
                className="w-20 accent-[#1db954] sm:w-28"
              />
              <span className="w-8 text-xs tabular-nums text-[var(--dim)]">
                {shownVolume}%
              </span>
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

type StatusData = ApiResponse<typeof api, "getStatus">;
type StatusKind = "up" | "down" | "unknown";

function StatusDot({ status }: { status: StatusKind }) {
  const cls =
    status === "up"
      ? "bg-emerald-500"
      : status === "down"
        ? "bg-[#dc2626]"
        : "bg-[var(--dim)]";
  return <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
}

function StatusWord({ status }: { status: StatusKind }) {
  if (status === "up")
    return <span className="shrink-0 text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("statusNormal")}</span>;
  if (status === "down")
    return <span className="shrink-0 text-sm font-semibold text-[#b91c1c] dark:text-[#f87171]">{t("statusDownWord")}</span>;
  return <span className="shrink-0 text-sm text-[var(--dim)]">{t("statusUnknown")}</span>;
}

/** Site/server labels come from the server in Chinese for a couple of
 * entries; localize the display by key (the data itself stays as stored). */
function siteDisplayLabel(site: { key: string; label: string }): string {
  if (activeLang === "en" && site.key === "example.com") return "Main Website";
  return site.label;
}

function serverDisplaySub(server: { key: string; sub: string }): string {
  if (server.key === "office-server") return activeLang === "zh" ? "办公室服务器" : "Office server";
  return server.sub;
}

function serverDisplayDetail(server: { key: string; detail: string }): string {
  if (server.key === "mini-pc") {
    return activeLang === "zh" ? "经主站公开入口判断" : "Judged via the main site public entry";
  }
  return server.detail;
}

/** Compact 网站状态 + 服务器状态 cards (live probes / Tina inspections). */
function StatusCards({
  data,
  pending,
  checking,
}: {
  data: StatusData | undefined;
  pending: boolean;
  checking: boolean;
}) {
  return (
    <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
      <section aria-label={t("siteStatus")} className={`${CARD_CLASS} min-w-0`}>
        <SectionHeading
          icon={<SectionTile kind="sites" />}
          hint={
            checking
              ? t("checking")
              : data?.checkedAt
                ? activeLang === "zh"
                  ? `${formatTorontoTime(new Date(data.checkedAt))} 检测`
                  : `Checked ${formatTorontoTime(new Date(data.checkedAt))}`
                : undefined
          }
        >
          {t("siteStatus")}
        </SectionHeading>
        {pending && !data ? (
          <p className="py-2 text-sm text-[var(--dim)]">{t("checkingSites")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {(data?.sites ?? []).map((site) => (
              <li key={site.key} className="flex items-center gap-2.5 py-1.5">
                <StatusDot status={site.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium leading-snug text-[var(--text)]">
                    {siteDisplayLabel(site)}
                  </p>
                  <p className="truncate text-xs text-[var(--dim)]">
                    {site.key}
                    {site.httpStatus !== null ? ` · HTTP ${site.httpStatus}` : ""}
                  </p>
                </div>
                <StatusWord status={site.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t("serverStatus")} className={`${CARD_CLASS} min-w-0`}>
        <SectionHeading icon={<SectionTile kind="servers" />}>{t("serverStatus")}</SectionHeading>
        {pending && !data ? (
          <p className="py-2 text-sm text-[var(--dim)]">{t("readingServers")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {(data?.servers ?? []).map((server) => (
              <li key={server.key} className="py-1.5">
                <div className="flex items-center gap-2.5">
                  <StatusDot status={server.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium leading-snug text-[var(--text)]">
                      {server.label}
                      <span className="ml-2 text-xs font-normal text-[var(--dim)]">
                        {serverDisplaySub(server)}
                      </span>
                    </p>
                    <p className="text-xs leading-snug text-[var(--dim)]">
                      {server.mode === "live" ? `${t("liveWord")} · ` : `${t("inspectionWord")} · `}
                      {server.checkedAt
                        ? `${formatTorontoTime(new Date(server.checkedAt))} ${t("torontoParen")}`
                        : t("noRecord")}
                      {server.detail ? ` · ${serverDisplayDetail(server)}` : ""}
                    </p>
                  </div>
                  <StatusWord status={server.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Compact status summary chip for the header: "状态 X/6" over the four
 * websites + Mini PC + office server. Green and quiet when everything is up,
 * red with the down targets' names when anything is down. Opens the
 * full status detail view.
 */
function StatusChip({
  data,
  pending,
  checking,
  onOpen,
}: {
  data: StatusData | undefined;
  pending: boolean;
  checking: boolean;
  onOpen: () => void;
}) {
  const targets = data ? [...data.sites, ...data.servers] : [];
  const upCount = targets.filter((t) => t.status === "up").length;
  const downNames = targets
    .filter((t) => t.status === "down")
    .map((t) => ("url" in t ? siteDisplayLabel(t) : t.label));
  const hasUnknown = targets.some((t) => t.status === "unknown");
  // While a (re)check is in flight, keep the last known count but render
  // it neutrally as 检测中 — a check in progress must never flash red.
  if (data && checking) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("viewStatusAria")}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[var(--header-chip)] px-3 text-xs font-medium text-[var(--header-text)] transition hover:brightness-125 active:scale-[0.98] motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--header-dim)] motion-reduce:animate-none"
        />
        {`${t("statusLabel")} ${upCount}/6 · ${t("checking")}`}
      </button>
    );
  }
  const cls =
    downNames.length > 0
      ? "bg-[#dc2626]/20 text-[#b91c1c] dark:text-[#fca5a5]"
      : !data
        ? "bg-[var(--header-chip)] text-[var(--header-dim)]"
        : hasUnknown
          ? "bg-[var(--header-chip)] text-[var(--header-text)]"
          : "bg-emerald-400/15 text-emerald-700 dark:text-emerald-300";
  const dotCls =
    downNames.length > 0
      ? "bg-[#f87171]"
      : !data
        ? "bg-[var(--header-dim)]"
        : hasUnknown
          ? "bg-[var(--header-dim)]"
          : "bg-emerald-400";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("viewStatusAria")}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition hover:brightness-125 active:scale-[0.98] motion-reduce:transition-none ${cls}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      {!data
        ? pending
          ? `${t("statusLabel")} ${t("checking")}`
          : `${t("statusLabel")} —`
        : downNames.length > 0
          ? activeLang === "zh"
            ? `状态 ${upCount}/6 · ${downNames.join("、")} 无法访问`
            : `Status ${upCount}/6 · ${downNames.join(", ")} unreachable`
          : hasUnknown
            ? activeLang === "zh"
              ? `状态 ${upCount}/6 · 含待确认`
              : `Status ${upCount}/6 · some unconfirmed`
            : activeLang === "zh"
              ? "状态 6/6 · 全部正常"
              : "Status 6/6 · all OK"}
    </button>
  );
}

type BoardPage = "main" | "more" | "china";

/** Page switch: page 1 = one-screen workbench, page 2 = later deadlines +
 * status detail, page 3 = 回国待办 (China Trip checklist). */
function PageTabs({
  page,
  farCount,
  chinaCount,
  onChange,
}: {
  page: BoardPage;
  farCount: number;
  chinaCount: number;
  onChange: (page: BoardPage) => void;
}) {
  const tabCls = (active: boolean) =>
    active
      ? "h-7 whitespace-nowrap rounded-full bg-[var(--accent)] px-3 text-[13px] font-semibold text-white shadow-sm transition"
      : "h-7 whitespace-nowrap rounded-full px-3 text-[13px] font-medium text-[var(--dim)] transition hover:text-[var(--text)]";
  return (
    <div className="mt-2">
      <div
        role="tablist"
        aria-label={t("tabsAria")}
        className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={page === "main"}
          aria-label={t("page1")}
          onClick={() => onChange("main")}
          className={tabCls(page === "main")}
        >
          <span className="sm:hidden">{activeLang === "zh" ? "工作台" : "Workbench"}</span>
          <span className="hidden sm:inline">{t("page1")}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={page === "more"}
          aria-label={
            activeLang === "zh"
              ? `第 2 页 · 更远到期${farCount > 0 ? ` ${farCount}` : ""} + 状态详情`
              : `Page 2 · Later${farCount > 0 ? ` ${farCount}` : ""} + Status`
          }
          onClick={() => onChange("more")}
          className={tabCls(page === "more")}
        >
          <span className="sm:hidden">{activeLang === "zh" ? "状态详情" : "Status"}</span>
          <span className="hidden sm:inline">
            {activeLang === "zh"
              ? `第 2 页 · 更远到期${farCount > 0 ? ` ${farCount}` : ""} + 状态详情`
              : `Page 2 · Later${farCount > 0 ? ` ${farCount}` : ""} + Status`}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={page === "china"}
          aria-label={t("page3")}
          onClick={() => onChange("china")}
          className={tabCls(page === "china")}
        >
          <span className="sm:hidden">
            {activeLang === "zh"
              ? `回国待办${chinaCount > 0 ? ` ${chinaCount}` : ""}`
              : `China Trip${chinaCount > 0 ? ` ${chinaCount}` : ""}`}
          </span>
          <span className="hidden sm:inline">
            {activeLang === "zh"
              ? `第 3 页 · 回国待办${chinaCount > 0 ? ` ${chinaCount}` : ""}`
              : `Page 3 · China Trip${chinaCount > 0 ? ` ${chinaCount}` : ""}`}
          </span>
        </button>
      </div>
    </div>
  );
}

/** One page-3 checklist row: a real checkbox toggles done in place —
 * done rows stay listed, greyed and struck through, and can be unticked. */
function ChinaRow({
  item,
  pending,
  onToggle,
}: {
  item: Item;
  pending: boolean;
  onToggle: (done: boolean) => void;
}) {
  const done = item.status === "done";
  return (
    <li
      id={`board-item-${item.id}`}
      className="flex scroll-mt-24 items-start gap-3 py-2.5"
    >
      <input
        type="checkbox"
        checked={done}
        disabled={pending}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`${done ? t("chinaMarkUndone") : t("chinaMarkDone")}：${item.title}`}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent)] disabled:opacity-50"
      />
      <div className={`min-w-0 flex-1 ${done ? "opacity-55" : ""}`}>
        <p
          className={`text-[15px] font-medium leading-snug text-[var(--text)] ${
            done ? "line-through decoration-[var(--dim)]" : ""
          }`}
        >
          {item.title}
        </p>
        {item.detail ? (
          <p
            className={`mt-0.5 text-sm leading-relaxed text-[var(--dim)] ${
              done ? "line-through" : ""
            }`}
          >
            {item.detail}
          </p>
        ) : null}
        {item.dueDate ? (
          <p className="mt-0.5 text-xs tabular-nums text-[var(--dim)]">
            {formatDateLabel(item.dueDate)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** Add form for page 3: title + optional detail, same habit as the lanes form. */
function AddChinaForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (fields: { title: string; detail: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  return (
    <form
      className="mb-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({ title: title.trim(), detail: detail.trim() });
      }}
    >
      <input
        aria-label={t("formTitleAria")}
        className={INPUT_CLASS}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("titlePh")}
      />
      <input
        aria-label={t("formDetailAria")}
        className={INPUT_CLASS}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder={t("detailPh")}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || pending}
          className="h-10 flex-1 rounded-lg bg-[var(--accent)] text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? t("adding") : t("add")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-medium text-[var(--text)]"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Deadline items as ONE line per item (date · title · note inline · countdown),
 * shared by page 1 (≤14 天） and page 2 (>14 天）. Items arrive sorted by due
 * date from the server (sort order), so render them flat. */
function DeadlineGroups({ items }: { items: Item[] }) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {items.map((item) => {
        const left = item.dueDate ? daysUntil(item.dueDate) : null;
        return (
          <li
            key={item.id}
            id={`board-item-${item.id}`}
            className="flex scroll-mt-24 items-center gap-2 py-[5px] [@media(max-height:949px)]:py-[3px]"
          >
            <span className="w-[86px] shrink-0 text-xs font-semibold tabular-nums text-[var(--text)]">
              {item.dueDate ? formatDateLabel(item.dueDate) : t("noDate")}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
              <span className="font-medium">{item.title}</span>
              {item.detail ? (
                <span className="text-[var(--dim)]"> · {item.detail}</span>
              ) : null}
            </span>
            <StatusPill status={item.status} />
            {/* Fixed-width right-aligned slot: the countdown chip's right
                edge (and the pill just left of it) lines up on every row,
                whether the chip is a pill or plain text, or absent. */}
            <span className="flex w-[84px] shrink-0 items-center justify-end">
              {left !== null ? <DeadlineChip left={left} /> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** System status labels Tina stamps on items; these render in the UI
 * language (the item's own title/detail text is never translated). */
const STATUS_LABELS: Record<string, { zh: string; en: string }> = {
  等待中: { zh: "等待中", en: "Waiting" },
  进行中: { zh: "进行中", en: "In progress" },
};

function StatusPill({ status }: { status: string }) {
  if (!status) return null;
  let cls = "bg-[var(--bg)] text-[var(--dim)]";
  if (status === "进行中") {
    cls = "bg-blue-600/10 text-blue-700 dark:text-blue-300";
  } else if (/完成|已发|已录/.test(status)) {
    cls = "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300";
  } else if (/注意|异常|过期|卡/.test(status)) {
    cls = "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  const label = STATUS_LABELS[status]?.[activeLang] ?? status;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {status === "进行中" ? "● " : ""}
      {label}
    </span>
  );
}

function SectionHeading({
  children,
  hint,
  icon,
  action,
}: {
  children: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-1 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--text)]">
        {icon}
        {children}
      </h2>
      {hint || action ? (
        <div className="flex items-center gap-2">
          {hint ? <span className="text-xs text-[var(--dim)]">{hint}</span> : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg)]"
      >
        <SvgIcon color="var(--dim)" size={20} className="shrink-0">
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </SvgIcon>
      </span>
      <p className="text-sm leading-relaxed text-[var(--dim)]">{text}</p>
    </div>
  );
}

/** Compact one-row empty state for narrow cards (e.g. page 2's side column). */
function EmptyLineCompact({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-left">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg)]"
      >
        <SvgIcon color="var(--dim)" size={15} className="shrink-0">
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </SvgIcon>
      </span>
      <p className="text-[13px] leading-snug text-[var(--dim)]">{text}</p>
    </div>
  );
}

function VerdictMark({ verdict }: { verdict: Verdict }) {
  return verdict === "yes" ? (
    <span className="font-semibold text-[var(--accent)]">{t("approved")}</span>
  ) : (
    <span className="font-semibold text-[#b91c1c] dark:text-[#f87171]">{t("rejected")}</span>
  );
}

function DeadlineChip({ left }: { left: number }) {
  if (left < 0) {
    return (
      <span className="rounded-full bg-[#b91c1c] px-2 py-0.5 text-xs font-medium text-white">
        {activeLang === "zh" ? `已过期 ${-left} 天` : `${-left} d overdue`}
      </span>
    );
  }
  if (left === 0) {
    return (
      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">
        {t("dueTodayChip")}
      </span>
    );
  }
  if (left <= 3) {
    return (
      <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-xs font-medium text-[#92400e] dark:bg-[#451a03] dark:text-[#fcd34d]">
        {activeLang === "zh" ? `还有 ${left} 天` : `in ${left} days`}
      </span>
    );
  }
  return (
    <span className="text-xs text-[var(--dim)]">
      {activeLang === "zh" ? `还有 ${left} 天` : `in ${left} days`}
    </span>
  );
}

function DecisionItem({
  item,
  answered,
  pending,
  failed,
  undoPending,
  dismissArmed,
  dismissPending,
  onAnswer,
  onRetry,
  onUndo,
  onDismiss,
}: {
  item: Item;
  answered: { verdict: Verdict; at: Date } | null;
  pending: boolean;
  failed: boolean;
  undoPending: boolean;
  dismissArmed: boolean;
  dismissPending: boolean;
  onAnswer: (verdict: Verdict) => void;
  onRetry: () => void;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <li id={`board-item-${item.id}`} className="scroll-mt-24 py-3 first:pt-1 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-medium leading-relaxed text-[var(--text)]">{item.title}</p>
        <StatusPill status={item.status} />
      </div>
      {item.detail ? (
        <p className="mt-1 text-[15px] leading-relaxed text-[var(--dim)]">{item.detail}</p>
      ) : null}

      {answered ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2.5">
          <p className="text-[15px] text-[var(--text)]">
            {t("markDecided")}：<VerdictMark verdict={answered.verdict} />
            <span className="ml-2 text-sm text-[var(--dim)]">
              {formatTorontoTime(answered.at)} {t("torontoTimeParen")}
            </span>
          </p>
          <button
            type="button"
            disabled={undoPending}
            onClick={onUndo}
            aria-label={`${t("undo")}：${item.title}`}
            className="shrink-0 text-sm font-medium text-[var(--dim)] underline underline-offset-2 transition-opacity disabled:opacity-50"
          >
            {undoPending ? t("undoing") : t("undo")}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={pending || dismissPending}
              onClick={() => onAnswer("yes")}
              aria-label={`${activeLang === "zh" ? "同意" : "Approve"}：${item.title}`}
              className="h-12 flex-1 rounded-xl bg-[var(--accent)] text-base font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50"
            >
              {pending ? t("submitting") : t("yes")}
            </button>
            <button
              type="button"
              disabled={pending || dismissPending}
              onClick={() => onAnswer("no")}
              aria-label={`${activeLang === "zh" ? "否决" : "Reject"}：${item.title}`}
              className="h-12 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-base font-semibold text-[var(--text)] transition hover:bg-[var(--bg)] active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50"
            >
              {t("no")}
            </button>
            <button
              type="button"
              disabled={pending || dismissPending}
              onClick={onDismiss}
              aria-label={
                dismissArmed
                  ? `${activeLang === "zh" ? "确认搁置" : "Confirm shelve"}：${item.title}`
                  : `${t("shelve")}：${item.title}`
              }
              className={
                dismissArmed
                  ? "h-12 shrink-0 rounded-xl border border-[#b91c1c] bg-[#b91c1c]/10 px-4 text-base font-semibold text-[#b91c1c] transition disabled:opacity-50 dark:text-[#f87171]"
                  : "h-12 shrink-0 rounded-xl px-3 text-base font-medium text-[var(--dim)] underline-offset-2 transition hover:underline disabled:opacity-50"
              }
            >
              {dismissPending ? t("shelving") : dismissArmed ? t("shelveConfirm") : t("shelve")}
            </button>
          </div>
          {failed ? (
            <div
              role="alert"
              className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#b91c1c] px-3 py-2 text-sm text-[#b91c1c] dark:text-[#f87171]"
            >
              <span>{t("answerFailed")}</span>
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                {t("retry")}
              </button>
            </div>
          ) : null}
        </>
      )}
    </li>
  );
}

function HeaderStat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5 py-0.5">
      <span
        className={
          accent
            ? "text-base font-bold tabular-nums leading-none text-[var(--header-accent)]"
            : "text-base font-bold tabular-nums leading-none text-[var(--header-text)]"
        }
      >
        {value}
      </span>
      <span className="text-[11px] leading-none text-[var(--header-dim)]">{label}</span>
    </div>
  );
}

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-[15px] text-[var(--text)] placeholder:text-[var(--dim)]";

const SMALL_BTN_CLASS =
  "h-7 rounded-md px-2 text-[13px] font-medium text-[var(--dim)] transition hover:bg-[var(--bg)] hover:text-[var(--text)] disabled:opacity-50";

/** One open lane item with inline edit / done / delete controls. */
function LaneRow({
  item,
  busy,
  deleteArmed,
  onArmDelete,
  onDelete,
  onDone,
  onSave,
}: {
  item: Item;
  busy: "done" | "delete" | "save" | null;
  deleteArmed: boolean;
  onArmDelete: () => void;
  onDelete: () => void;
  onDone: () => void;
  onSave: (fields: { title: string; detail: string; status: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [detail, setDetail] = useState(item.detail);
  const [status, setStatus] = useState(item.status);

  const openEditor = () => {
    setTitle(item.title);
    setDetail(item.detail);
    setStatus(item.status);
    setEditing(true);
  };

  if (editing) {
    return (
      <li id={`board-item-${item.id}`} className="scroll-mt-24 py-2">
        <div className="space-y-2">
          <input
            aria-label={t("formTitleAria")}
            className={INPUT_CLASS}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePh")}
          />
          <input
            aria-label={t("formDetailAria")}
            className={INPUT_CLASS}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={t("detailPh")}
          />
          <input
            aria-label={t("formStatusAria")}
            className={INPUT_CLASS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder={t("statusPh")}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!title.trim()}
              onClick={() => {
                onSave({ title: title.trim(), detail: detail.trim(), status: status.trim() });
                setEditing(false);
              }}
              className="h-10 flex-1 rounded-lg bg-[var(--accent)] text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-medium text-[var(--text)]"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li id={`board-item-${item.id}`} className="scroll-mt-24 py-[3px] [@media(max-height:949px)]:py-[1px]">
      {/* Collapsed: ONE line — glyph + title + status pill. Detail and the
          编辑/完成/删除 controls appear only when the row is expanded. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? t("collapse") : activeLang === "zh" ? "展开" : "Expand"}：${item.title}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-medium text-[var(--text)]"
        >
          <span className="flex shrink-0 items-center [&>svg]:mt-0">
            <LaneGlyph lane={item.lane} />
          </span>
          <span className="truncate">{item.title}</span>
          <span aria-hidden="true" className="shrink-0 text-xs text-[var(--dim)]">
            {expanded ? "▾" : "▸"}
          </span>
        </button>
        <StatusPill status={item.status} />
      </div>
      {expanded ? (
        <div className="pb-1 pl-[22px]">
          {item.detail ? (
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--dim)]">{item.detail}</p>
          ) : null}
          <div className="mt-0.5 flex items-center gap-1">
            <button
              type="button"
              onClick={openEditor}
              aria-label={`${t("edit")}：${item.title}`}
              className={SMALL_BTN_CLASS}
            >
              {t("edit")}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={onDone}
              aria-label={`${activeLang === "zh" ? "标为完成" : "Mark done"}：${item.title}`}
              className={SMALL_BTN_CLASS}
            >
              {busy === "done" ? t("processing") : t("done")}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={deleteArmed ? onDelete : onArmDelete}
              aria-label={
                deleteArmed
                  ? `${activeLang === "zh" ? "确认删除" : "Confirm delete"}：${item.title}`
                  : `${t("delete")}：${item.title}`
              }
              className={
                deleteArmed
                  ? "h-8 rounded-md border border-[#b91c1c] bg-[#b91c1c]/10 px-2 text-sm font-semibold text-[#b91c1c] transition disabled:opacity-50 dark:text-[#f87171]"
                  : SMALL_BTN_CLASS
              }
            >
              {busy === "delete" ? t("deleting") : deleteArmed ? t("deleteConfirm") : t("delete")}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Add-item form for the lanes section: lane picker + title + detail. */
function AddLaneForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (fields: { lane: string; title: string; detail: string }) => void;
}) {
  const [laneChoice, setLaneChoice] = useState<string>(LANE_ORDER[0] ?? "其他");
  const [customLane, setCustomLane] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const lane = laneChoice === "其他" ? customLane.trim() || "其他" : laneChoice;
  return (
    <form
      className="mb-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({ lane, title: title.trim(), detail: detail.trim() });
      }}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="new-lane-select" className="shrink-0 text-sm text-[var(--dim)]">
          Lane
        </label>
        <select
          id="new-lane-select"
          value={laneChoice}
          onChange={(e) => setLaneChoice(e.target.value)}
          className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[15px] text-[var(--text)]"
        >
          {LANE_ORDER.map((l) => (
            <option key={l} value={l}>
              {laneDisplay(l)}
            </option>
          ))}
          <option value="其他">{t("otherLaneOption")}</option>
        </select>
      </div>
      {laneChoice === "其他" ? (
        <input
          aria-label={t("newLaneAria")}
          className={INPUT_CLASS}
          value={customLane}
          onChange={(e) => setCustomLane(e.target.value)}
          placeholder={t("newLanePh")}
        />
      ) : null}
      <input
        aria-label={t("formTitleAria")}
        className={INPUT_CLASS}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("titlePh")}
      />
      <input
        aria-label={t("formDetailAria")}
        className={INPUT_CLASS}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder={t("detailPh")}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || pending}
          className="h-10 flex-1 rounded-lg bg-[var(--accent)] text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? t("adding") : t("add")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-medium text-[var(--text)]"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Header controls: theme mode （跟随系统/浅色/深色） + language （中文/English)
 * segmented switches. Both persist via App's preference state. */
function PrefsControls({
  themeMode,
  onTheme,
  lang,
  onLang,
}: {
  themeMode: ThemeMode;
  onTheme: (mode: ThemeMode) => void;
  lang: Lang;
  onLang: (lang: Lang) => void;
}) {
  const btnCls = (active: boolean) =>
    active
      ? "h-7 rounded-full bg-[var(--header-text)] px-2.5 text-xs font-semibold text-[var(--header-bg)] transition"
      : "h-7 rounded-full px-2.5 text-xs font-medium text-[var(--header-dim)] transition hover:text-[var(--header-text)]";
  const themeOptions: { mode: ThemeMode; label: string }[] = [
    { mode: "system", label: t("themeSystem") },
    { mode: "light", label: t("themeLight") },
    { mode: "dark", label: t("themeDark") },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div
        role="group"
        aria-label={t("themeAria")}
        className="flex items-center rounded-full bg-[var(--header-chip)] p-0.5"
      >
        {themeOptions.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            aria-pressed={themeMode === opt.mode}
            onClick={() => onTheme(opt.mode)}
            className={btnCls(themeMode === opt.mode)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label={t("langAria")}
        className="flex items-center rounded-full bg-[var(--header-chip)] p-0.5"
      >
        <button
          type="button"
          aria-pressed={lang === "zh"}
          onClick={() => onLang("zh")}
          className={btnCls(lang === "zh")}
        >
          中文
        </button>
        <button
          type="button"
          aria-pressed={lang === "en"}
          onClick={() => onLang("en")}
          className={btnCls(lang === "en")}
        >
          English
        </button>
      </div>
    </div>
  );
}

export function App() {
  const queryClient = useQueryClient();

  // Display preferences: theme mode + UI language, persisted in
  // localStorage. Theme "system" resolves live against the OS setting.
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const v = window.localStorage.getItem("ops-board-theme");
      return v === "light" || v === "dark" || v === "system" ? v : "system";
    } catch {
      return "system";
    }
  });
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return window.localStorage.getItem("ops-board-lang") === "en" ? "en" : "zh";
    } catch {
      return "zh";
    }
  });
  activeLang = lang;
  const [systemDark, setSystemDark] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const resolvedTheme: "light" | "dark" =
    themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    try {
      window.localStorage.setItem("ops-board-theme", themeMode);
      window.localStorage.setItem("ops-board-lang", lang);
    } catch {
      // Storage unavailable (private mode): preferences just don't persist.
    }
  }, [resolvedTheme, themeMode, lang]);
  const scrimColor = resolvedTheme === "dark" ? "#17181c" : "#fffefb";
  const board = useQuery({
    queryKey: ["board"],
    queryFn: () => api.getBoard({}),
    refetchInterval: 60_000,
  });
  const weatherQuery = useQuery({
    queryKey: ["weather"],
    queryFn: () => api.getWeather({}),
    refetchInterval: 30 * 60_000,
  });
  const statusForceRef = useRef(false);
  const statusQuery = useQuery({
    queryKey: ["status"],
    queryFn: () => {
      const force = statusForceRef.current;
      statusForceRef.current = false;
      return api.getStatus({ force });
    },
    refetchInterval: 5 * 60_000,
  });
  const spotifyQuery = useQuery({
    queryKey: ["spotify"],
    queryFn: () => api.getSpotify({}),
    refetchInterval: 45_000,
  });
  const spotifyControlMutation = useMutation({
    mutationFn: async (args: {
      command: "pause" | "resume" | "skip" | "previous" | "setVolume";
      volumePercent: number | null;
      deviceId: string | null;
    }) => await api.spotifyControl(args),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["spotify"] });
    },
  });

  /** Header refresh: board + weather refetch, status checks re-run now. */
  const refreshAll = () => {
    statusForceRef.current = true;
    void board.refetch();
    void weatherQuery.refetch();
    void statusQuery.refetch();
    void spotifyQuery.refetch();
  };
  const refreshing =
    board.isFetching || weatherQuery.isFetching || statusQuery.isFetching;

  // Board pagination: page 1 is the one-screen workbench; page 2 holds
  // deadlines due beyond 14 days plus the full status detail lists.
  const [page, setPage] = useState<BoardPage>("main");

  // Hero dropdown: lists every item behind the hero count; picking one
  // scrolls to that item's row and flashes it. Closed by default, closes
  // on outside click / Escape, and never adds height to page 1.
  const [heroOpen, setHeroOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!heroOpen) return;
    const onDown = (e: MouseEvent) => {
      if (heroRef.current && !heroRef.current.contains(e.target as Node)) {
        setHeroOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHeroOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [heroOpen]);

  const jumpToItem = (id: number) => {
    setHeroOpen(false);
    const attempt = (triesLeft: number) => {
      const el = document.getElementById(`board-item-${id}`);
      if (!el) {
        // A far-future deadline lives on page 2: switch, then retry once
        // the other page has rendered.
        if (triesLeft > 0) {
          setPage("more");
          setTimeout(() => attempt(triesLeft - 1), 120);
        }
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("item-flash");
      void (el as HTMLElement).offsetWidth;
      el.classList.add("item-flash");
      setTimeout(() => el.classList.remove("item-flash"), 1900);
    };
    requestAnimationFrame(() => attempt(1));
  };

  // A 30-second heartbeat so the header date, the timeline's
  // past/next states, and the deadline countdowns roll over on their
  // own instead of freezing at whatever time the page was opened.
  const [, setHeartbeat] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setHeartbeat((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Local record of answers tapped in this session, so the item flips to
  // its "已拍板" state the moment the tap succeeds — and stays readable
  // until the refreshed board (where the item is closed) takes over.
  const [justAnswered, setJustAnswered] = useState<
    Record<number, { verdict: Verdict; at: Date }>
  >({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [failedAttempt, setFailedAttempt] = useState<{ id: number; verdict: Verdict } | null>(
    null,
  );
  const [undoingId, setUndoingId] = useState<number | null>(null);

  const answerMutation = useMutation({
    mutationFn: async (args: { id: number; verdict: Verdict }) =>
      await api.answerDecision(args),
    onMutate: (args) => {
      setPendingId(args.id);
      setFailedAttempt(null);
    },
    onSuccess: (_result, args) => {
      setJustAnswered((prev) => ({
        ...prev,
        [args.id]: { verdict: args.verdict, at: new Date() },
      }));
    },
    onError: (_error, args) => {
      setFailedAttempt({ id: args.id, verdict: args.verdict });
    },
    onSettled: () => {
      setPendingId(null);
      void queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (id: number) => await api.undoDecision({ id }),
    onMutate: (id) => setUndoingId(id),
    onSuccess: (_result, id) => {
      setJustAnswered((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    onSettled: () => {
      setUndoingId(null);
      void queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  // CRUD state for the lanes section and the decisions 搁置 action.
  const [busy, setBusy] = useState<{ id: number; kind: BusyKind } | null>(null);
  const [deleteArmId, setDeleteArmId] = useState<number | null>(null);
  const [dismissArmId, setDismissArmId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [crudError, setCrudError] = useState<string | null>(null);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armTemporarily = (set: (value: number | null) => void, id: number) => {
    set(id);
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    armTimerRef.current = setTimeout(() => set(null), 3500);
  };

  const addMutation = useMutation({
    mutationFn: async (args: { lane: string; title: string; detail: string }) =>
      await api.addItem({
        section: "lanes",
        lane: args.lane,
        title: args.title,
        detail: args.detail,
        status: "",
        dueDate: null,
        sort: 9999,
      }),
    onMutate: () => setCrudError(null),
    onError: () => setCrudError(t("errAdd")),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (args: { id: number; title: string; detail: string; status: string }) =>
      await api.updateItem(args),
    onMutate: (args) => {
      setBusy({ id: args.id, kind: "save" });
      setCrudError(null);
    },
    onError: () => setCrudError(t("errSave")),
    onSettled: () => {
      setBusy(null);
      void queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (args: { id: number; kind: "done" | "delete" | "dismiss" }) =>
      await api.closeItem({ id: args.id }),
    onMutate: (args) => {
      setBusy({ id: args.id, kind: args.kind });
      setCrudError(null);
    },
    onError: () => setCrudError(t("errProcess")),
    onSettled: () => {
      setBusy(null);
      setDeleteArmId(null);
      setDismissArmId(null);
      void queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  // Page 3 （回国待办）: checkbox toggles + add form. Toggling only flips
  // the item's status between "done" and "" — the row never closes, so
  // done items stay visible and never touch page 1's hero count (which
  // only scans decisions/today/deadlines/lanes).
  const [showChinaAddForm, setShowChinaAddForm] = useState(false);
  const [chinaError, setChinaError] = useState<string | null>(null);
  const chinaToggleMutation = useMutation({
    mutationFn: async (args: { id: number; done: boolean }) =>
      await api.toggleChinaDone(args),
    onMutate: () => setChinaError(null),
    onError: () => setChinaError(t("errProcess")),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });
  const chinaAddMutation = useMutation({
    mutationFn: async (args: { title: string; detail: string }) =>
      await api.addItem({
        section: "china",
        lane: "",
        title: args.title,
        detail: args.detail,
        status: "",
        dueDate: null,
        sort: 9999,
      }),
    onMutate: () => setChinaError(null),
    onError: () => setChinaError(t("errAdd")),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  if (board.isPending) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SafeAreaTopScrim backgroundColor={scrimColor} />
        <p className="px-4 py-16 text-center text-sm text-[var(--dim)]">{t("loading")}</p>
      </div>
    );
  }

  if (board.error || !board.data) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SafeAreaTopScrim backgroundColor={scrimColor} />
        <div className="px-4 py-16 text-center">
          <p className="text-[15px] text-[var(--text)]">{t("loadFailed")}</p>
          <button
            type="button"
            onClick={() => board.refetch()}
            className="mt-4 h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 text-[15px] text-[var(--text)]"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  const data = board.data;

  // Pagination rule: page 1 shows deadlines due within 14 days (undated
  // ones included); anything dated beyond 14 days lives on page 2.
  const nearDeadlines = data.deadlines.filter(
    (item) => !item.dueDate || daysUntil(item.dueDate) <= 14,
  );
  const farDeadlines = data.deadlines.filter(
    (item) => item.dueDate !== null && daysUntil(item.dueDate) > 14,
  );

  // Group lane items by lane, in the canonical lane order first.
  const laneGroups = new Map<string, Item[]>();
  for (const item of data.lanes) {
    const key = item.lane || "其他";
    const group = laneGroups.get(key) ?? [];
    group.push(item);
    laneGroups.set(key, group);
  }
  const sortedLanes = [...laneGroups.keys()].sort((a, b) => {
    const ia = LANE_ORDER.indexOf(a);
    const ib = LANE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  // The latest verdict shows as a quiet line once its item has left the
  // decisions list (answered items are closed server-side).
  const lastVerdict = data.lastVerdict;
  const lastVerdictStillListed =
    lastVerdict != null && data.decisions.some((d) => d.id === lastVerdict.itemId);

  // Timeline: today's board items (crons / planned items) only, sorted
  // by Toronto time. Past/next states follow Toronto wall-clock time.
  const nowMinutes = torontoNowMinutes();
  type TLRow = {
    key: string;
    minutes: number | null;
    timeLabel: string;
    item: Item;
    order: number;
  };
  const tlRows: TLRow[] = data.today
    .map((item, i): TLRow => {
      const { time } = splitTime(item.title);
      return {
        key: `b-${item.id}`,
        minutes: time ? timeToMinutes(time) : null,
        timeLabel: time ?? "",
        item,
        order: i,
      };
    })
    .sort((a, b) => (a.minutes ?? 9999) - (b.minutes ?? 9999) || a.order - b.order);
  const nextKey =
    tlRows.find(
      (r) => r.minutes !== null && r.minutes >= 0 && r.minutes >= nowMinutes,
    )?.key ?? null;

  // Hero count: everything waiting on Mark himself — the pending
  // decisions, plus any open item whose text says it is waiting on him
  // (等 Mark …), wherever it sits on the board. The count logic is
  // unchanged; the entries list is exactly the items behind the count,
  // so the hero dropdown can name every one of them.
  const isWaitingOnMark = (i: Item) =>
    /等\s*Mark/.test(`${i.title} ${i.detail} ${i.status}`);
  const followItems = [
    ...data.today.filter(isWaitingOnMark).map((item) => ({
      item,
      tag: activeLang === "zh" ? "今日" : "Today",
      displayTitle: splitTime(item.title).rest,
    })),
    ...data.deadlines.filter(isWaitingOnMark).map((item) => ({
      item,
      tag: activeLang === "zh" ? "到期" : "Deadline",
      displayTitle: item.title,
    })),
    ...data.lanes.filter(isWaitingOnMark).map((item) => ({
      item,
      tag: laneDisplay(item.lane || "其他"),
      displayTitle: item.title,
    })),
  ];
  const followCount = followItems.length;
  const actionEntries = [
    ...data.decisions.map((item) => ({
      item,
      tag: t("statDecisions"),
      displayTitle: item.title,
    })),
    ...followItems,
  ];
  const actionCount = data.decisions.length + followCount;
  const heroParts = [
    data.decisions.length > 0
      ? activeLang === "zh"
        ? `待拍板 ${data.decisions.length}`
        : `${data.decisions.length} to decide`
      : null,
    followCount > 0
      ? activeLang === "zh"
        ? `等你跟进 ${followCount}`
        : `${followCount} waiting on you`
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans">
      <SafeAreaTopScrim backgroundColor={scrimColor} />

      {/* 深色顶栏：日期 + 今日概览数字；右上角双时钟 + 今日天气 */}
      {page === "main" ? (
      <header className="border-b border-[var(--header-border)] bg-[var(--header-bg)] px-5 pb-2 pt-safe-or-3 text-[var(--header-text)] [@media(max-height:949px)]:pb-1">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="grid items-center gap-x-4 gap-y-2 lg:grid-cols-[1fr_auto_1fr]">
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <h1 className="text-lg font-bold leading-tight tracking-tight text-[var(--header-text)]">
                  {t("boardTitle")}
                </h1>
                <span className="shrink-0 text-[11px] font-medium tracking-wide text-[var(--header-dim)]">
                  OPS BOARD
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={refreshAll}
                  disabled={refreshing}
                  aria-label={t("refreshAria")}
                  className="h-8 shrink-0 rounded-lg bg-[var(--header-chip)] px-3 text-sm font-medium text-[var(--header-text)] transition hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50"
                >
                  {refreshing ? t("refreshing") : t("refresh")}
                </button>
                <span className="text-xs tabular-nums text-[var(--header-dim)]">
                  {t("updatedAt")}{" "}
                  {new Intl.DateTimeFormat(uiLocale(), {
                    timeZone: "America/Toronto",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  }).format(new Date(board.dataUpdatedAt))}
                  {t("torontoTimeSuffix")}
                </span>
                <StatusChip
                  data={statusQuery.data}
                  pending={statusQuery.isPending}
                  checking={statusQuery.isFetching}
                  onOpen={() => setPage("more")}
                />
                <PrefsControls
                  themeMode={themeMode}
                  onTheme={setThemeMode}
                  lang={lang}
                  onLang={setLang}
                />
              </div>
            </div>

            {/* 中间 Hero：需要 Mark 处理的事，一眼看到（紧凑版）。点开是
                一个下拉浮层，逐件列出被计数的事项，点条目滚动定位。 */}
            <div ref={heroRef} className="relative text-center lg:justify-self-center">
              {actionCount > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setHeroOpen((v) => !v)}
                    aria-expanded={heroOpen}
                    aria-haspopup="true"
                    aria-label={
                      activeLang === "zh"
                        ? `查看需要你处理的 ${actionCount} 件事`
                        : actionCount === 1
                          ? "View the 1 item that needs you"
                          : `View the ${actionCount} items that need you`
                    }
                    className="rounded-lg px-2 py-1 transition hover:bg-[var(--header-chip)] active:scale-[0.99] motion-reduce:transition-none"
                  >
                    <span className="flex items-baseline justify-center gap-2 leading-none">
                      <span className="text-3xl font-black tabular-nums text-[var(--header-accent)]">
                        {actionCount}
                      </span>
                      <span className="text-base font-semibold text-[var(--header-text)]">
                        {activeLang === "zh"
                          ? "样东西需要你处理"
                          : actionCount === 1
                            ? "item needs your call"
                            : "items need your call"}
                      </span>
                      <span className="text-xs text-[var(--header-dim)]">{heroParts.join(" · ")}</span>
                      <span aria-hidden="true" className="text-xs text-[var(--header-dim)]">
                        {heroOpen ? "▴" : "▾"}
                      </span>
                    </span>
                  </button>
                  {heroOpen ? (
                    <div className="absolute left-1/2 top-full z-50 mt-1 w-[min(430px,92vw)] -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 text-left shadow-[0_12px_32px_rgba(16,24,40,0.22)]">
                      <ul className="max-h-[50vh] divide-y divide-[var(--border)] overflow-y-auto">
                        {actionEntries.map((entry) => (
                          <li key={`${entry.tag}-${entry.item.id}`}>
                            <button
                              type="button"
                              onClick={() => jumpToItem(entry.item.id)}
                              aria-label={`${entry.displayTitle} · ${entry.tag}`}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--bg)]"
                            >
                              <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                                {entry.tag}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">
                                {entry.displayTitle}
                              </span>
                              <span aria-hidden="true" className="shrink-0 text-xs text-[var(--dim)]">
                                →
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="flex items-center justify-center gap-2 leading-none">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15"
                  >
                    <SvgIcon color="#34d399" size={14} className="shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </SvgIcon>
                  </span>
                  <span className="text-2xl font-black tabular-nums text-[var(--header-text)]">0</span>
                  <span className="text-base font-semibold text-[var(--header-text)]">
                    {activeLang === "zh" ? "样需要你处理" : "items need your call"}
                  </span>
                  <span className="text-xs text-[var(--header-dim)]">{t("heroNoneNote")}</span>
                </p>
              )}
            </div>

            <div className="lg:justify-self-end">
              <HeaderClockWeather
                weather={weatherQuery.data?.weather ?? null}
                weatherPending={weatherQuery.isPending}
                onRetryWeather={() => void weatherQuery.refetch()}
              />
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-[var(--header-border)] pt-1.5 [@media(max-height:949px)]:mt-1 [@media(max-height:949px)]:pt-1">
            <HeaderStat
              value={data.decisions.length}
              label={t("statDecisions")}
              accent={data.decisions.length > 0}
            />
            <HeaderStat value={data.today.length} label={t("statToday")} />
            <HeaderStat value={nearDeadlines.length} label={t("statDue14")} />
            <HeaderStat value={data.lanes.length} label={t("statOpen")} />
          </div>
        </div>
      </header>
      ) : null}

      <main className="mx-auto w-full max-w-[1600px] px-5 pb-3">
        {page === "more" ? (
          <>
            <PageTabs page={page} farCount={farDeadlines.length} chinaCount={data.china.length} onChange={setPage} />

            {/* 两栏：左 = 状态详情（主栏 2/3），右 = 14 天后到期（窄栏 1/3）；
                远期为空时不排窄栏，状态详情占整行满宽；
                窄窗/手机堆叠为单列（DOM 顺序：到期在前、状态在后）。 */}
            <div
              className={`mt-3 grid items-start gap-3 ${
                farDeadlines.length > 0 ? "lg:grid-cols-3" : ""
              }`}
            >
              {/* 14 天后到期 */}
              <section aria-label={t("farTitle")} className={`${CARD_CLASS} min-w-0 lg:order-2`}>
                <SectionHeading icon={<SectionTile kind="deadlines" />}>
                  {t("farTitle")}
                </SectionHeading>
                {farDeadlines.length === 0 ? (
                  <EmptyLineCompact text={t("farEmpty")} />
                ) : (
                  <DeadlineGroups items={farDeadlines} />
                )}
              </section>

              {/* 状态详情：每台机器 / 每个站点的完整列表 */}
              <div
                className={`min-w-0 lg:order-1 ${
                  farDeadlines.length > 0 ? "lg:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                    {t("statusDetail")}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      statusForceRef.current = true;
                      void statusQuery.refetch();
                    }}
                    disabled={statusQuery.isFetching}
                    aria-label={t("recheckAria")}
                    className="h-10 rounded-lg bg-[var(--accent)] px-4 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    {statusQuery.isFetching ? t("checking") : t("recheck")}
                  </button>
                </div>
                <StatusCards
                  data={statusQuery.data}
                  pending={statusQuery.isPending}
                  checking={statusQuery.isFetching}
                />
                <p className="mt-3 text-sm leading-relaxed text-[var(--dim)]">
                  {t("statusFootnote")}
                </p>
              </div>
            </div>
          </>
        ) : page === "china" ? (
          <>
            <PageTabs page={page} farCount={farDeadlines.length} chinaCount={data.china.length} onChange={setPage} />

            {/* 行程信息：静态一行 */}
            <div className={`${CARD_CLASS} mt-3 flex flex-wrap items-center gap-x-3 gap-y-1`}>
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <SectionTile kind="china" />
                {t("chinaTitle")}
              </span>
              <span className="text-sm tabular-nums text-[var(--dim)]">{t("chinaTripLine")}</span>
              {data.china.length > 0 ? (
                <span className="ml-auto shrink-0 rounded-full bg-[var(--bg)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--dim)]">
                  {t("chinaProgress")} {data.china.filter((i) => i.status === "done").length}/{data.china.length}
                </span>
              ) : null}
            </div>

            {/* 待办清单：勾选完成 / 取消恢复 + 新增 */}
            <section aria-label={t("chinaTitle")} className={`${CARD_CLASS} mt-3`}>
              <SectionHeading
                icon={<SectionTile kind="china" />}
                action={
                  <button
                    type="button"
                    onClick={() => setShowChinaAddForm((v) => !v)}
                    aria-expanded={showChinaAddForm}
                    aria-label={t("chinaAddItemAria")}
                    className="h-8 shrink-0 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none"
                  >
                    {showChinaAddForm ? t("collapse") : t("addNew")}
                  </button>
                }
              >
                {t("chinaTitle")}
              </SectionHeading>
              {chinaError ? (
                <p
                  role="alert"
                  className="mb-2 rounded-lg border border-[#b91c1c] px-3 py-2 text-sm text-[#b91c1c] dark:text-[#f87171]"
                >
                  {chinaError}
                </p>
              ) : null}
              {showChinaAddForm ? (
                <AddChinaForm
                  pending={chinaAddMutation.isPending}
                  onCancel={() => setShowChinaAddForm(false)}
                  onSubmit={(fields) => {
                    chinaAddMutation.mutate(fields, {
                      onSuccess: () => setShowChinaAddForm(false),
                    });
                  }}
                />
              ) : null}
              {data.china.length === 0 ? (
                <EmptyLine text={t("chinaEmpty")} />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {data.china.map((item) => (
                    <ChinaRow
                      key={item.id}
                      item={item}
                      pending={
                        chinaToggleMutation.isPending &&
                        chinaToggleMutation.variables?.id === item.id
                      }
                      onToggle={(done) => chinaToggleMutation.mutate({ id: item.id, done })}
                    />
                  ))}
                </ul>
              )}
            </section>

            <footer className="mt-2 border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                {t("footer")} · {t("versionWord")} {BOARD_VERSION} · {BOARD_VERSION_DATE}
              </p>
            </footer>
          </>
        ) : (
          <>
        <PageTabs page={page} farCount={farDeadlines.length} chinaCount={data.china.length} onChange={setPage} />
        {/* Tina 状态行 + 快捷入口 */}
        <TinaPulseStrip tinaStatus={data.tinaStatus} />

        {/* Spotify 正在播放 + 播放控制 */}
        <SpotifyStrip
          state={spotifyQuery.data?.spotify}
          pending={spotifyQuery.isPending}
          controlPending={spotifyControlMutation.isPending}
          onControl={(args) => spotifyControlMutation.mutate(args)}
          onRetry={() => void spotifyQuery.refetch()}
        />

        {/* 1. 待 Mark 拍板 — 永远置顶；为空时缩成一条细条（与今日已完成同量级） */}
        <section aria-label={t("decisionsTitle")} className="mt-2 [@media(max-height:949px)]:mt-1.5">
          {data.decisions.length === 0 ? (
            <div className={`${CARD_CLASS} flex flex-wrap items-center gap-x-3 gap-y-1`}>
              <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
                <SectionTile kind="decisions" />
                {t("decisionsTitle")}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--dim)]">
                <SvgIcon color="var(--accent)" size={14} className="shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </SvgIcon>
                <span className="truncate">{t("decisionsEmpty")}</span>
              </span>
              {lastVerdict && !lastVerdictStillListed ? (
                <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-[var(--dim)]">
                  <span className="truncate">
                    {t("recentVerdict")}：{lastVerdict.title} — <VerdictMark verdict={lastVerdict.verdict} />{" "}
                    {formatTorontoTime(new Date(lastVerdict.at))}
                  </span>
                  <button
                    type="button"
                    disabled={undoingId === lastVerdict.itemId}
                    onClick={() => undoMutation.mutate(lastVerdict.itemId)}
                    aria-label={`${t("undo")}：${lastVerdict.title}`}
                    className="shrink-0 font-medium underline underline-offset-2 transition-opacity disabled:opacity-50"
                  >
                    {undoingId === lastVerdict.itemId ? t("undoing") : t("undo")}
                  </button>
                </span>
              ) : null}
            </div>
          ) : (
          <div className="rounded-xl border-2 border-[var(--accent)] bg-[var(--surface)] p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_16px_rgba(16,24,40,0.05)] sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-[var(--text)]">
                <SectionTile kind="decisions" />
                {t("decisionsTitle")}
              </h2>
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white">
                {activeLang === "zh"
                  ? `${data.decisions.length} 件待决`
                  : `${data.decisions.length} pending`}
              </span>
            </div>
              <ul className="divide-y divide-[var(--border)]">
                {data.decisions.map((item) => {
                  const local = justAnswered[item.id];
                  const fromServer =
                    lastVerdict && lastVerdict.itemId === item.id
                      ? { verdict: lastVerdict.verdict, at: new Date(lastVerdict.at) }
                      : null;
                  return (
                    <DecisionItem
                      key={item.id}
                      item={item}
                      answered={local ?? fromServer}
                      pending={pendingId === item.id}
                      failed={failedAttempt?.id === item.id}
                      undoPending={undoingId === item.id}
                      dismissArmed={dismissArmId === item.id}
                      dismissPending={
                        busy !== null && busy.id === item.id && busy.kind === "dismiss"
                      }
                      onDismiss={() => {
                        if (dismissArmId === item.id) {
                          closeMutation.mutate({ id: item.id, kind: "dismiss" });
                        } else {
                          armTemporarily(setDismissArmId, item.id);
                        }
                      }}
                      onAnswer={(verdict) => answerMutation.mutate({ id: item.id, verdict })}
                      onRetry={() => {
                        if (failedAttempt) {
                          answerMutation.mutate({
                            id: failedAttempt.id,
                            verdict: failedAttempt.verdict,
                          });
                        }
                      }}
                      onUndo={() => undoMutation.mutate(item.id)}
                    />
                  );
                })}
              </ul>
            {lastVerdict && !lastVerdictStillListed ? (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                <p className="text-sm leading-relaxed text-[var(--dim)]">
                  {t("recentVerdict")}：{lastVerdict.title} — <VerdictMark verdict={lastVerdict.verdict} />
                  <span className="ml-1.5">{formatTorontoTime(new Date(lastVerdict.at))}</span>
                </p>
                <button
                  type="button"
                  disabled={undoingId === lastVerdict.itemId}
                  onClick={() => undoMutation.mutate(lastVerdict.itemId)}
                  aria-label={`${t("undo")}：${lastVerdict.title}`}
                  className="shrink-0 text-sm font-medium text-[var(--dim)] underline underline-offset-2 transition-opacity disabled:opacity-50"
                >
                  {undoingId === lastVerdict.itemId ? t("undoing") : t("undo")}
                </button>
              </div>
            ) : null}
          </div>
          )}
        </section>

        {/* 今日已完成 */}
        <DoneTodayStrip items={data.doneToday} />

        {/* 宽屏三列：今日时间线 | 到期 | Lane（等高一排，副屏一屏放下） */}
        <div className="mt-2 grid items-stretch gap-2 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0 [@media(max-height:949px)]:mt-1.5 [@media(max-height:949px)]:gap-1.5">
        {/* 2. 今日定时与动态 — 时间轴 */}
        <section aria-label={t("todayTitle")} className={`${CARD_CLASS} h-full`}>
          <SectionHeading hint={t("torontoTime")} icon={<SectionTile kind="today" />}>
            {t("todayTitle")}
          </SectionHeading>
          {tlRows.length === 0 ? (
            <EmptyLine text={t("todayEmpty")} />
          ) : (
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute bottom-2 left-[53px] top-2 w-px bg-[var(--border)]"
              />
              <ul>
                {tlRows.map((row) => {
                  const item = row.item;
                  const { rest } = splitTime(item.title);
                  const active = item.status === "进行中";
                  const minutes = row.minutes;
                  const past = !active && minutes !== null && minutes >= 0 && minutes < nowMinutes;
                  const isNext = row.key === nextKey && !active;
                  return (
                    <li
                      key={row.key}
                      id={`board-item-${item.id}`}
                      className={
                        past
                          ? "relative flex scroll-mt-24 items-center gap-2.5 py-[5px] opacity-55 [@media(max-height:949px)]:py-[3px]"
                          : "relative flex scroll-mt-24 items-center gap-2.5 py-[5px] [@media(max-height:949px)]:py-[3px]"
                      }
                    >
                      <span
                        className={
                          isNext
                            ? "w-10 shrink-0 text-right text-[13px] font-bold tabular-nums text-[var(--accent)]"
                            : "w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums text-[var(--text)]"
                        }
                      >
                        {row.timeLabel}
                      </span>
                      <span
                        aria-hidden="true"
                        className={
                          active
                            ? "z-10 h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--accent)] ring-4 ring-[var(--surface)] motion-reduce:animate-none"
                            : isNext
                              ? "z-10 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] ring-4 ring-[var(--surface)]"
                              : past
                                ? "z-10 h-2 w-2 shrink-0 rounded-full bg-[var(--dim)] ring-4 ring-[var(--surface)]"
                                : "z-10 h-2 w-2 shrink-0 rounded-full bg-[var(--border)] ring-4 ring-[var(--surface)]"
                        }
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-[var(--text)] [&>svg]:mt-0">
                        <TodayGlyph item={item} />
                        <span className="truncate">
                          <span className="font-medium">{rest}</span>
                          {item.detail ? (
                            <span className="text-[var(--dim)]"> · {item.detail}</span>
                          ) : null}
                          {past ? <span className="ml-1.5 text-xs text-[var(--dim)]">✓</span> : null}
                        </span>
                        {isNext ? (
                          <span className="shrink-0 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-medium text-white">
                            {t("nextUp")}
                          </span>
                        ) : null}
                      </span>
                      <StatusPill status={item.status} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* 3. 未来 14 天到期 — 按天分组 + 倒计时；14 天后的在第 2 页 */}
        <section aria-label={t("deadlinesTitle")} className={`${CARD_CLASS} h-full`}>
          <SectionHeading icon={<SectionTile kind="deadlines" />}>{t("deadlinesTitle")}</SectionHeading>
          {nearDeadlines.length === 0 ? (
            <EmptyLine text={t("deadlinesEmpty")} />
          ) : (
            <DeadlineGroups items={nearDeadlines} />
          )}
          {farDeadlines.length > 0 ? (
            <button
              type="button"
              onClick={() => setPage("more")}
              aria-label={
                activeLang === "zh"
                  ? "查看 14 天后到期的事项（第 2 页）"
                  : "View items due after 14 days (page 2)"
              }
              className="mt-3 w-full rounded-lg bg-[var(--bg)] px-3 py-2 text-sm font-medium text-[var(--dim)] transition hover:text-[var(--text)]"
            >
              {activeLang === "zh"
                ? `14 天后还有 ${farDeadlines.length} 件到期 → 第 2 页`
                : `${farDeadlines.length} more due after 14 days → Page 2`}
            </button>
          ) : null}
        </section>

        {/* 4. 各 Lane 开放事项 — 可增删改 */}
        <section aria-label={t("lanesTitle")} className={`${CARD_CLASS} h-full`}>
          <SectionHeading
            icon={<SectionTile kind="lanes" />}
            action={
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                aria-expanded={showAddForm}
                aria-label={t("addItemAria")}
                className="h-8 shrink-0 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none"
              >
                {showAddForm ? t("collapse") : t("addNew")}
              </button>
            }
          >
            {t("lanesTitle")}
          </SectionHeading>
          {crudError ? (
            <p
              role="alert"
              className="mb-2 rounded-lg border border-[#b91c1c] px-3 py-2 text-sm text-[#b91c1c] dark:text-[#f87171]"
            >
              {crudError}
            </p>
          ) : null}
          {showAddForm ? (
            <AddLaneForm
              pending={addMutation.isPending}
              onCancel={() => setShowAddForm(false)}
              onSubmit={(fields) => {
                addMutation.mutate(fields, {
                  onSuccess: () => setShowAddForm(false),
                });
              }}
            />
          ) : null}
          {data.lanes.length === 0 ? (
            <EmptyLine
              text={
                activeLang === "zh"
                  ? "各 lane 目前没有开放事项，全部处理完了。"
                  : "No open items in any lane right now."
              }
            />
          ) : (
            <div className="space-y-2 [@media(max-height:949px)]:space-y-1.5">
              {sortedLanes.map((lane) => (
                <div key={lane}>
                  <p className="mb-0.5 flex items-center text-[13px] font-semibold text-[var(--text)]">
                    <span
                      aria-hidden="true"
                      className="mr-2 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: LANE_DOT[lane] ?? "#6d6a61" }}
                    />
                    {laneDisplay(lane)}
                    <span className="ml-2 rounded-full bg-[var(--bg)] px-1.5 py-0.5 text-xs font-normal text-[var(--dim)]">
                      {activeLang === "zh"
                        ? `${laneGroups.get(lane)?.length ?? 0} 件`
                        : `${laneGroups.get(lane)?.length ?? 0}`}
                    </span>
                  </p>
                  <ul className="divide-y divide-[var(--border)]">
                    {(laneGroups.get(lane) ?? []).map((item) => (
                      <LaneRow
                        key={item.id}
                        item={item}
                        busy={
                          busy && busy.id === item.id && busy.kind !== "dismiss"
                            ? busy.kind
                            : null
                        }
                        deleteArmed={deleteArmId === item.id}
                        onArmDelete={() => armTemporarily(setDeleteArmId, item.id)}
                        onDelete={() => closeMutation.mutate({ id: item.id, kind: "delete" })}
                        onDone={() => closeMutation.mutate({ id: item.id, kind: "done" })}
                        onSave={(fields) => updateMutation.mutate({ id: item.id, ...fields })}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
        </div>

        <footer className="mt-2 border-t border-[var(--border)] pt-2 text-center">
          <p className="text-xs text-[var(--dim)]">
            {t("footer")} · {t("versionWord")} {BOARD_VERSION} · {BOARD_VERSION_DATE}
            {" · "}
            <a
              href="https://yourname.github.io/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 transition-colors hover:text-[var(--text)] hover:decoration-[var(--accent)]"
            >
              {t("portfolioLink")}
            </a>
            {" · "}
            <a
              href="https://github.com/yourname"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 transition-colors hover:text-[var(--text)] hover:decoration-[var(--accent)]"
            >
              GitHub
            </a>
            {" · "}
            <a
              href="https://yourname.github.io/typebook-zh/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 transition-colors hover:text-[var(--text)] hover:decoration-[var(--accent)]"
            >
              Typebook
            </a>
            {" · "}
            <a
              href="https://share.example.com/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 transition-colors hover:text-[var(--text)] hover:decoration-[var(--accent)]"
            >
              FoxShare
            </a>
          </p>
        </footer>
          </>
        )}
      </main>
    </div>
  );
}
