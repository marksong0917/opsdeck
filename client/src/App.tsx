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
    boardTitle: "OpsDeck",
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
    onWorkPrefix: "上班 08:00",
    offDone: "已下班",
    toronto: "多伦多",
    beijing: "北京",
    destination: "目的地",
    weatherToday: "多伦多",
    weatherDestination: "目的地",
    wxHigh: "高",
    wxLow: "低",
    feelsLike: "体感",
    precip: "降水",
    windLabel: "风",
    humidityLabel: "湿度",
    sunriseLabel: "日出",
    sunsetLabel: "日落",
    tomorrow: "明日",
    staleData: "上次数据",
    weatherLoading: "天气加载中…",
    weatherUnavailable: "天气暂时取不到",
    destinationLoading: "目的地天气加载中…",
    destinationUnavailable: "目的地天气暂时取不到",
    fxLabel: "汇率 CAD→CNY",
    fxLoading: "汇率加载中…",
    fxUnavailable: "汇率暂时取不到",
    fxUpdated: "更新",
    fxSource: "来源 open.er-api.com",
    forecastWeek: "未来一周",
    aqiLabel: "空气",
    uvLabel: "紫外线",
    forecastToday: "今天",
    tripCountdownTitle: "回国倒计时",
    tripNotStarted: "距出发",
    tripInProgress: "目的地行程中 · 距回程",
    tripDone: "已回程",
    daysUnit: "天",
    tempWarmer: "比多伦多暖",
    tempColder: "比多伦多冷",
    tempSame: "与多伦多同温",
    dualCityTitle: "双城速览",
    torontoSun: "多伦多日出日落",
    destinationSun: "目的地日出日落",
    tinaNow: "Tina 正在",
    quickLinks: "快捷入口",
    opensNewWindow: "（新窗口打开）",
    doneToday: "今日已完成",
    doneTodayEmpty: "今天的完成记录还没上来，Tina 正在推进中。",
    doneTodayNone: "今日还没有完成记录",
    page4: "第 4 页 · 完成记录",
    historyTitle: "完成记录",
    historyEmpty: "最近 7 天还没有完成记录，Tina 干完的活会记在这里。",
    historyTodayLabel: "今天",
    historyYesterdayLabel: "昨天",
    historyItemsUnit: "件",
    decisionsTitle: "待 Mark 拍板",
    decisionsEmpty: "暂无待拍板",
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
    tabGroupDaily: "日常",
    tabGroupTopic: "专题",
    tabGroupRecord: "记录",
    tabToday: "今天",
    tabStatus: "状态",
    tabJason: "待拍板",
    tabCfo: "CFO",
    tabGrowth: "增长",
    tabChina: "回国",
    tabHistory: "历史",
    dataUpdatedAt: "数据更新于",
    notSynced: "尚未同步",
    jasonTitle: "待拍板",
    jasonSub: "等决策人回复与拍板的事 · 按拖延天数排，拖得最久的在最前",
    jasonEmpty:
      "尚未同步 — 助理每次例行扫查后会把等决策人的清单回写到这里。",
    jasonNoneOpen: "当前没有等决策人的事，都清了。",
    jasonDragPrefix: "已等",
    jasonDragDays: "天",
    jasonAskedOn: "提出",
    jasonNoDate: "提出日期未记",
    jasonHardDate: "硬日期",
    jasonClearedTitle: "本周已清",
    jasonClearedEmpty: "本周还没有清掉的项。",
    cfoTitle: "CFO",
    cfoSub: "未来 30 天的钱：什么时候进来、什么时候出去",
    cfoArTitle: "应收",
    cfoApTitle: "应付",
    cfoTopTitle: "催收前五名",
    cfoEmpty:
      "尚未同步 — 数字只从 QB 房的 AR 账本与登记册回写，这里不手填、不估算。",
    cfoColItem: "事项",
    cfoColDue: "到期",
    cfoColAmount: "金额",
    cfoTotal: "合计",
    cfoOverdueDays: "逾期",
    cfoNoDate: "未定日期",
    growthTitle: "增长",
    growthSub: "Foxuma 漏斗 + 外联三线 · 每周更新一次",
    growthEmpty: "尚未同步 — Foxuma 房与外联登记回写后显示。",
    foundingTitle: "Founding 名额",
    funnelTitle: "Foxuma 漏斗",
    outreachTitle: "外联三线 · 本周",
    flightTitle: "航班",
    flightOut: "去程",
    flightBack: "回程",
    flightBookingRef: "订座号",
    seatWatchTag: "座位盯梢中",
    seatWatchNote: "有免费的过道 / 靠窗位放出就换",
    seatsHeldFree: "座位已免费锁定",
    hardDatesTitle: "关键日期",
    hardWsib: "证书到期",
    hardMatrix: "授权矩阵签字",
    hardDepart: "出发",
    hardReturn: "回程",
    chinaGroupPre: "出发前清尾",
    chinaGroupInChina: "在华待办",
    chinaGroupGifts: "礼物进度",
    chinaGroupPacking: "打包定稿",
    chinaGroupOther: "其他待办",
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
  },
  en: {
    loading: "Loading…",
    loadFailed: "Board failed to load",
    retry: "Retry",
    boardTitle: "OpsDeck",
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
    onWorkPrefix: "Start 08:00",
    offDone: "Done for the day",
    toronto: "Toronto",
    beijing: "Beijing",
    destination: "Destination City",
    weatherToday: "Toronto",
    weatherDestination: "Destination City",
    wxHigh: "High",
    wxLow: "Low",
    feelsLike: "Feels",
    precip: "Precip",
    windLabel: "Wind",
    humidityLabel: "Humidity",
    sunriseLabel: "Sunrise",
    sunsetLabel: "Sunset",
    tomorrow: "Tomorrow",
    staleData: "last known",
    weatherLoading: "Loading weather…",
    weatherUnavailable: "Weather unavailable",
    destinationLoading: "Loading Destination City weather…",
    destinationUnavailable: "Destination City weather unavailable",
    fxLabel: "FX CAD→CNY",
    fxLoading: "Loading FX…",
    fxUnavailable: "FX unavailable",
    fxUpdated: "Updated",
    fxSource: "Source open.er-api.com",
    forecastWeek: "Next 7 days",
    aqiLabel: "AQI",
    uvLabel: "UV",
    forecastToday: "Today",
    tripCountdownTitle: "China trip countdown",
    tripNotStarted: "Depart in",
    tripInProgress: "In Destination City · return in",
    tripDone: "Trip completed",
    daysUnit: "days",
    tempWarmer: "warmer than Toronto",
    tempColder: "colder than Toronto",
    tempSame: "same as Toronto",
    dualCityTitle: "Dual-city glance",
    torontoSun: "Toronto sun",
    destinationSun: "Destination City sun",
    tinaNow: "Tina is",
    quickLinks: "Quick links",
    opensNewWindow: "(opens in a new window)",
    doneToday: "Done today",
    doneTodayEmpty: "Nothing logged yet — Tina is on it.",
    doneTodayNone: "No completions yet today",
    page4: "Page 4 · History",
    historyTitle: "History",
    historyEmpty: "No completions in the last 7 days yet — finished work lands here.",
    historyTodayLabel: "Today",
    historyYesterdayLabel: "Yesterday",
    historyItemsUnit: "items",
    decisionsTitle: "Awaiting Mark's call",
    decisionsEmpty: "No decisions pending",
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
    tabGroupDaily: "Daily",
    tabGroupTopic: "Topics",
    tabGroupRecord: "Records",
    tabToday: "Today",
    tabStatus: "Status",
    tabJason: "Decisions",
    tabCfo: "CFO",
    tabGrowth: "Growth",
    tabChina: "China",
    tabHistory: "History",
    dataUpdatedAt: "Data updated",
    notSynced: "Not synced yet",
    jasonTitle: "Awaiting decisions",
    jasonSub: "Everything waiting on a decision · longest wait first",
    jasonEmpty:
      "Not synced yet — the ops lane writes the waiting-on-decisions list here after each routine sweep.",
    jasonNoneOpen: "Nothing is waiting on a decision right now.",
    jasonDragPrefix: "Waiting",
    jasonDragDays: "d",
    jasonAskedOn: "Asked",
    jasonNoDate: "Ask date not recorded",
    jasonHardDate: "Hard date",
    jasonClearedTitle: "Cleared this week",
    jasonClearedEmpty: "Nothing cleared yet this week.",
    cfoTitle: "CFO",
    cfoSub: "Money over the next 30 days: what comes in, what goes out, and when",
    cfoArTitle: "Receivables",
    cfoApTitle: "Payables",
    cfoTopTitle: "Top 5 to collect",
    cfoEmpty:
      "Not synced yet — figures come only from the QB room's AR ledger and registers; nothing is typed in or estimated here.",
    cfoColItem: "Item",
    cfoColDue: "Due",
    cfoColAmount: "Amount",
    cfoTotal: "Total",
    cfoOverdueDays: "overdue",
    cfoNoDate: "No date set",
    growthTitle: "Growth",
    growthSub: "Foxuma funnel + three outreach lines · updated weekly",
    growthEmpty: "Not synced yet — appears once the Foxuma room and outreach register write back.",
    foundingTitle: "Founding seats",
    funnelTitle: "Foxuma funnel",
    outreachTitle: "Outreach · this week",
    flightTitle: "Flights",
    flightOut: "Outbound",
    flightBack: "Return",
    flightBookingRef: "Booking ref",
    seatWatchTag: "Seat watch on",
    seatWatchNote: "swap if a free aisle / window seat opens",
    seatsHeldFree: "Seats held free",
    hardDatesTitle: "Key dates",
    hardWsib: "Certificate expires",
    hardMatrix: "Delegation matrix sign-off",
    hardDepart: "Departure",
    hardReturn: "Return",
    chinaGroupPre: "Before departure",
    chinaGroupInChina: "While in China",
    chinaGroupGifts: "Gifts",
    chinaGroupPacking: "Packing",
    chinaGroupOther: "Other to-dos",
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
 * v1.2.1 = calendar merge removed at Mark's direction (board items only);
 * v1.2.2 = page-2 two-column layout, one-line header weather, compact
 * header stat strip;
 * v1.2.3 = weather condition words + item status pills follow the UI
 * language; page 2 goes full-width when nothing is due after 14 days;
 * v1.2.4 = footer gets a row of quick links to Mark's personal projects
 * (portfolio, GitHub, Typebook, FoxShare);
 * v1.3.0 = page 3 「回国待办」 (China Trip): a check-off list backed by the
 * new "china" item section; ticking a row sets status "done" in place;
 * v1.4.0 = page 4 「完成记录」 (History): done-today moved off page 1 into
 * a read-only 7-day archive grouped by Toronto date (archiveDoneToday
 * action); page 1 keeps a one-line "✓ 今日已完成 N 件 → 第 4 页" summary;
 * v1.4.1 = header work-status fix: the workday is 08:00–18:00 Toronto, so
 * before 08:00 the chip counts down to the start instead of wrongly
 * reading 上班中 with the full day left;
 * v1.5.0 = Destination City (Hebei) weather added alongside Toronto in the header
 * (dual-city, cached separately), plus a dual-city glance strip on page 1:
 * China-trip countdown to the departure / return dates, Toronto↔destination
 * temperature difference, and sunrise/sunset for both cities when the
 * weather source provides them;
 * v1.6.0 = CAD→CNY rate in the header next to the weather (open.er-api.com,
 * 6 h cache, source date shown, stale flagged on failure); page 3's
 * Destination City card gains a 7-day forecast grid (weekday + high/low +
 * condition per day) from the same weather source's forecast_days; the
 * same payload's Destination City air-quality / UV (when the source provides
 * them) shows on page 3 and in the dual-city strip;
 * v1.7.0 = Semi Design conversion: Semi blue #0077FA primary (lighter
 * step in dark), Semi token surfaces (cool grey page, white cards;
 * dark = deep grey-blue elevation steps, never pure black), 10px
 * cards / 8px large buttons / 6px tags + inputs, Semi soft semantic
 * tags, button-type page tabs, layered soft shadows, system font
 * stack. Visual language only — data, layout and functions unchanged.
 * v1.6.1 = polish/correctness pass: sunrise/sunset render as local
 * HH:MM everywhere (the source's raw ISO timestamps never reach the
 * page); Destination City's tomorrow line is localized (condition + ranges in
 * Chinese format, never the English source sentence); page 1's
 * dual-city strip slimmed to four glanceable chips (trip countdown,
 * temperature difference, Destination City tomorrow, Destination City air) with
 * sunrise/sunset moved to the header tooltip and page 3's card; the
 * hero counter's label is truthful — follow-ups waiting on Mark no
 * longer masquerade as pending decisions ("件等你跟进" when no decision
 * is pending); small CSS tidy (softer card shadow, section-heading
 * hierarchy, header weather/FX spacing rhythm, antialiased text).
 * v1.7.1 = dedup fix: the 待拍板 empty state is one compact line
 * instead of a second full-width "Tina's got it covered" card.
 * v1.7.2 = three-state schedule items: status "blocked" renders an
 * amber marker + 「受阻」 pill, never the past ✓, and never counts as
 * completed or next-up; the 未来 14 天到期 list renders in pure
 * due-date order (getBoard sorts deadlines by dueDate, ignoring the
 * stored sort values); Foxuma lane copy refreshed to 0.369 live /
 * 0.370 in build (applyV172BoardUpdates).
 * v1.8.0 = header + done-chain pass (R-21 first batch): the hero names
 * the follow-up it counts (the item's own 「下一步」 ask under the
 * count, no dropdown needed); Destination City/Toronto weather appears exactly
 * once — the dual-city strip now carries both cities' current weather
 * and the header meta is a single line (work chip + dual clocks +
 * CAD→CNY rate); wording aligned — the decisions bucket says 待拍板
 * everywhere (「暂无待拍板」 empty state, 「N 件待拍板」 badge) so it
 * can no longer read as contradicting the hero's 等你跟进 count; the
 * done write-back chain is repaired server-side: appendDoneToday logs
 * a completion in one call (no full-list resend), done_today carries a
 * Toronto date stamp, archiveDoneToday files a list under its own
 * stamped date (the 00:07 reset no longer relabels yesterday's work),
 * getBoard never presents a stale list as today's and folds today's
 * archive bucket back into doneToday — an archive that runs mid-day
 * (as happened on 2026-11-13, when the morning's six completions sat
 * in today's bucket while page 1 read the emptied list) can no longer
 * hide today's completions; they stay in 今日已完成 all day and only
 * become history at rollover. applyV180DoneBackfill remains as a
 * coverage-guarded safety net for the two prose-only completions.
 * v1.8.1 = header visual revert only (Mark's call): the top-right
 * block returns to the fuller v1.7.2 layout — a stacked column with
 * the work chip + Toronto/Beijing clocks, BOTH cities' weather lines
 * back in the header (temp / condition / high-low / tomorrow /
 * humidity visible), and the FX line showing the rate + 100-CAD
 * equivalent + update date as text again instead of tooltip-only.
 * The dual-city strip keeps its weather (both places carry it now,
 * the header is canonical). Everything else from v1.8.0 is kept
 * exactly: the hero's named follow-up line, the 待拍板 wording
 * alignment, and the done write-back chain (date-stamped done_today,
 * appendDoneToday, archive-by-stamp) — untouched.
 * v1.8.2 = five visual fixes (Mark approved): (1) deadline items due
 * TODAY (Toronto date) get an orange-red 「今天到期」 badge and pin to
 * the top of the deadlines list, relative order otherwise unchanged;
 * (2) the dual-city strip's countdown days are the visual anchor —
 * big, bold, accent-colored; (3) the whole strip is clickable through
 * to page 3 (cursor + hover affordance, weather retry buttons stop
 * propagation); (4) the three page-1 columns share one row rhythm —
 * lane rows now use the same py-[5px] (compact py-[3px]) padding as
 * the today timeline and deadline rows; (5) the 「暂无待拍板」 empty
 * strip no longer renders — with no pending decisions the decisions
 * area is absent entirely (the 最近拍板 + 撤销 record still shows on
 * its own slim line when a verdict exists to undo). Header layout,
 * follow-up line, populated-decisions wording, the countdown strip's
 * weather, and the whole done write-back chain are untouched.
 * v1.9.0 = board expansion (Mark: "合并成一个 board，里边很多 page"):
 * three new pages fed through the SAME items table + generic actions
 * (new sections "jason" / "money" / "growth" — no new write path) and
 * page 3 expanded in place. 「待拍板」 (waiting-on-decision — the page name states a status, not a person):
 * open rows sorted by drag days (dueDate = ask date), hard dates ride
 * in `status` as ISO dates and get DeadlineChip badges, rows closed
 * this Toronto week land in a 本周已清 strip (getBoard's jasonCleared).
 * 「CFO」 (money): lane "ar"/"ap" rows with the CAD amount as a plain
 * decimal string in `status`, rendered verbatim — 30-day in/out plus
 * a top-5 collection list derived from the AR rows only. 「增长」:
 * lane-grouped feed rows shown as written; the only seeded fact is
 * Founding (10 seats, a demo tenant holds seat 1, 9 left) via the guarded
 * applyV190GrowthSeed. Pages with no feed data yet say 尚未同步 —
 * nothing is invented. Each new page shows its own 数据更新时间 (the
 * newest item updatedAt in its section, Toronto time). Page 3 gains a
 * static demo flight card (DEMO 101 out / DEMO 102 back, seats held free, seat watch on; fictional booking ref DEMO01) and a key-dates strip (certificate expiry, delegation-matrix sign-off, departure, return); the checklist groups by lane (pre/inch/gifts/pack, flat
 * exactly as before while every lane is empty). Navigation is now a
 * grouped Semi button-type Tabs bar — 日常： 今天 / 待拍板 / CFO /
 * 状态 · 专题： 增长 / 回国 · 记录： 历史 — one line at every width,
 * horizontally scrollable at 390px, never wrapping. Existing pages,
 * the header, and the done write-back chain are untouched.
 * Same release, identity upgrade (Mark approved): the product is now
 * OpsDeck — every outward self-reference renamed (header wordmark,
 * browser title, space display name) and every page footer is now the
 * single line "OpsDeck · v1.9.0 · Built by Tina for Mark". Internal
 * plumbing (slug, action names, data keys) deliberately NOT renamed.
 * Dead code this build proved dead and removed: BOARD_VERSION_DATE
 * (only the old footers used it) and the STR footer/versionWord
 * entries (same); the grouped PageTabs also dropped the farCount
 * prop and the per-tab page-number labels. */
const BOARD_VERSION = "v1.9.0";

const LANE_ORDER = ["QuickBooks", "Foxuma", "General Ops", "外联", "设备与机器", "Mir2"];

const LANE_DOT: Record<string, string> = {
  QuickBooks: "#00a870",
  Foxuma: "#0077fa",
  "General Ops": "#86909c",
  外联: "#fa7a08",
  设备与机器: "#00a5ff",
  Mir2: "#7a4df3",
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

type SectionKind = "decisions" | "today" | "deadlines" | "lanes" | "sites" | "servers" | "china" | "jason" | "cfo" | "growth";

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
  if (kind === "jason") {
    // Hourglass: things sitting waiting, time passing.
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <path d="M5 22h14" />
        <path d="M5 2h14" />
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
        <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
      </SvgIcon>
    );
  }
  if (kind === "cfo") {
    // Wallet: the money page.
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </SvgIcon>
    );
  }
  if (kind === "growth") {
    // Trending-up arrow: the growth page.
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
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
  today: { bg: "rgba(0,165,255,0.10)", fg: "#00a5ff" },
  deadlines: { bg: "rgba(250,122,8,0.12)", fg: "#fa7a08" },
  lanes: { bg: "rgba(122,77,243,0.10)", fg: "#7a4df3" },
  sites: { bg: "rgba(0,168,112,0.10)", fg: "#00a870" },
  servers: { bg: "rgba(134,144,156,0.13)", fg: "#86909c" },
  china: { bg: "rgba(245,63,63,0.10)", fg: "#f53f3f" },
  jason: { bg: "rgba(255,157,10,0.12)", fg: "#fa7a08" },
  cfo: { bg: "rgba(0,168,112,0.10)", fg: "#00a870" },
  growth: { bg: "rgba(0,119,250,0.10)", fg: "#0077fa" },
};

function SectionTile({ kind }: { kind: SectionKind }) {
  const tile = TILE_STYLE[kind];
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
      style={{ backgroundColor: tile.bg }}
    >
      <SectionGlyph kind={kind} color={tile.fg} size={15} />
    </span>
  );
}

const CARD_CLASS =
  "rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[0_0_1px_rgba(28,31,35,0.07),0_4px_14px_rgba(28,31,35,0.05)] [@media(max-height:949px)]:py-2";

function LaneGlyph({ lane }: { lane: string }) {
  // Row glyphs stay single-accent; color lives in the header tiles,
  // status pills, and the lane group dots.
  const color = "var(--accent)";
  switch (lane) {
    case "QuickBooks":
      return (
        <SvgIcon color={color}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </SvgIcon>
      );
    case "Foxuma":
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
    case "Mir2":
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
  if (/QB|发票|QuickBooks/i.test(hay)) return <LaneGlyph lane="QuickBooks" />;
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

/** Mark's workday is 08:00–18:00 Toronto. Live work state for the header:
 * before 08:00 it counts down to the start (not "上班中"), 08:00–18:00 it
 * counts down to 18:00, and from 18:00 on it reads 已下班. */
function offWorkState(now: Date): { off: boolean; prefix: string; label: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const nowSeconds = get("hour") * 3600 + get("minute") * 60 + get("second");
  const workStart = 8 * 3600;
  const workEnd = 18 * 3600;
  const duration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (activeLang === "en") {
      return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
    }
    return hours > 0 ? `${hours} 小时 ${minutes} 分` : `${minutes} 分`;
  };
  if (nowSeconds < workStart) {
    const untilStart = duration(workStart - nowSeconds);
    return {
      off: true,
      prefix: t("onWorkPrefix"),
      label:
        activeLang === "en"
          ? `Not yet on · starts in ${untilStart}`
          : `未上班 · 距上班还差 ${untilStart}`,
    };
  }
  if (nowSeconds >= workEnd) {
    return { off: true, prefix: t("offWorkPrefix"), label: t("offDone") };
  }
  const untilEnd = duration(workEnd - nowSeconds);
  return {
    off: false,
    prefix: t("offWorkPrefix"),
    label:
      activeLang === "en"
        ? `Working · ${untilEnd} left`
        : `上班中 · 还差 ${untilEnd}`,
  };
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
  Sunshine: "晴",
  "Mainly Clear": "晴",
  "Plenty Of Sun": "晴",
  "More Sun Than Clouds": "晴间多云",
  "Mix Of Sun And Clouds": "晴间多云",
  "Times Of Sun And Clouds": "晴间多云",
  "Considerable Cloudiness": "多云",
  "Snow Showers In The Morning": "上午阵雪",
  "Showers In The Vicinity": "附近阵雨",
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

/** One city's current weather as compact strip text: temp + condition
 * + high/low (+ stale / alert flags). The full detail (feels-like,
 * humidity, precip, wind, sunrise/sunset) stays in the tooltip via
 * weatherTitle. Used by the page-1 dual-city strip. */
function weatherSummary(w: NonNullable<Weather>): string {
  const parts = [
    `${fmtTemp(w.temperature)} ${activeLang === "zh" ? wxZh(w.description) : w.description}`,
    w.high !== null || w.low !== null
      ? `${t("wxHigh")} ${fmtTemp(w.high)} ${t("wxLow")} ${fmtTemp(w.low)}`
      : null,
    w.stale ? t("staleData") : null,
    w.alerts.length > 0 ? `⚠ ${w.alerts.join("；")}` : null,
  ];
  return parts.filter((p): p is string => p !== null).join(" · ");
}

/** One city's weather as the header's fuller line (the v1.7.2 shape,
 * restored in v1.8.1): temp + condition + high/low + tomorrow's
 * low–high range + humidity, all visible — nothing essential is left
 * to the tooltip (weatherTitle still adds feels-like / precip / wind /
 * sunrise / sunset on hover). */
function headerWeatherSummary(w: NonNullable<Weather>): string {
  const parts = [
    `${fmtTemp(w.temperature)} ${activeLang === "zh" ? wxZh(w.description) : w.description}`,
    w.high !== null || w.low !== null
      ? `${t("wxHigh")} ${fmtTemp(w.high)} ${t("wxLow")} ${fmtTemp(w.low)}`
      : null,
    w.tomorrowLow !== null && w.tomorrowHigh !== null
      ? `${t("tomorrow")} ${Math.round(w.tomorrowLow)}–${Math.round(w.tomorrowHigh)}°`
      : null,
    w.humidity !== null ? `${t("humidityLabel")} ${Math.round(w.humidity)}%` : null,
    w.stale ? t("staleData") : null,
    w.alerts.length > 0 ? `⚠ ${w.alerts.join("；")}` : null,
  ];
  return parts.filter((p): p is string => p !== null).join(" · ");
}

/** One weather line in the header's top-right block: glyph + city
 * label + the fuller summary. Loading / unavailable states keep the
 * same one-line footprint, with a retry affordance when data failed. */
function HeaderWeatherLine({
  w,
  label,
  pending,
  loadingText,
  unavailableText,
  onRetry,
}: {
  w: Weather;
  label: string;
  pending: boolean;
  loadingText: string;
  unavailableText: string;
  onRetry: () => void;
}) {
  if (!w) {
    if (pending)
      return (
        <span className="whitespace-nowrap text-[11px] text-[var(--header-dim)]">
          {loadingText}
        </span>
      );
    return (
      <span className="whitespace-nowrap text-[11px] text-[var(--header-dim)]">
        {unavailableText}
        <button
          type="button"
          onClick={onRetry}
          aria-label={t("retry")}
          className="ml-2 font-medium text-[var(--header-text)] underline underline-offset-2"
        >
          {t("retry")}
        </button>
      </span>
    );
  }
  return (
    <span
      className="flex min-w-0 max-w-full items-center gap-1.5 text-[11px] tabular-nums text-[var(--header-dim)]"
      title={weatherTitle(w)}
    >
      <WeatherGlyph />
      <span className="min-w-0 truncate">
        <span className="font-medium text-[var(--header-text)]">{label}</span>{" "}
        {headerWeatherSummary(w)}
      </span>
    </span>
  );
}

function weatherTitle(w: NonNullable<Weather>): string {
  return [
    w.feelsLike !== null ? `${t("feelsLike")} ${fmtTemp(w.feelsLike)}` : null,
    w.humidity !== null ? `${t("humidityLabel")} ${Math.round(w.humidity)}%` : null,
    w.precipitationChance !== null ? `${t("precip")} ${Math.round(w.precipitationChance)}%` : null,
    w.wind ? `${t("windLabel")} ${w.wind}` : null,
    fmtSunTime(w.sunrise) ? `${t("sunriseLabel")} ${fmtSunTime(w.sunrise)}` : null,
    fmtSunTime(w.sunset) ? `${t("sunsetLabel")} ${fmtSunTime(w.sunset)}` : null,
  ]
    .filter((p): p is string => p !== null)
    .join(" · ");
}

type Fx = ApiResponse<typeof api, "getFx">["fx"];

/** Header FX line: today's CAD→CNY rate with the 100-CAD equivalent
 * and the source update date shown as visible text — the v1.7.2 shape,
 * restored in v1.8.1 after v1.8.0 compressed it to the rate alone and
 * hid the rest in a tooltip. The tooltip keeps only the extras
 * (source name, inverse rate, raw UTC stamp). */
function FxSegment({
  fx,
  pending,
  onRetry,
}: {
  fx: Fx;
  pending: boolean;
  onRetry: () => void;
}) {
  if (!fx) {
    if (pending)
      return (
        <span className="text-[11px] text-[var(--header-dim)]">
          {t("fxLoading")}
        </span>
      );
    return (
      <span className="text-[11px] text-[var(--header-dim)]">
        {t("fxUnavailable")}
        <button
          type="button"
          onClick={onRetry}
          aria-label={t("retry")}
          className="ml-2 font-medium text-[var(--header-text)] underline underline-offset-2"
        >
          {t("retry")}
        </button>
      </span>
    );
  }
  return (
    <span
      className="flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] tabular-nums text-[var(--header-dim)] lg:justify-end"
      title={`${t("fxSource")} · 1 CNY ≈ $${fx.inverse.toFixed(3)} CAD${fx.sourceUpdatedUtc ? ` · ${fx.sourceUpdatedUtc}` : ""}`}
    >
      <span aria-hidden="true" className="shrink-0 text-[13px] leading-none">💱</span>
      <span className="whitespace-nowrap">
        <span className="font-medium text-[var(--header-text)]">{t("fxLabel")}</span>{" "}
        <span className="text-sm font-bold tabular-nums text-[var(--header-text)]">
          {activeLang === "zh"
            ? `1 加币 ≈ ¥${fx.rate.toFixed(2)}`
            : `1 CAD ≈ ¥${fx.rate.toFixed(2)}`}
        </span>
      </span>
      <span className="whitespace-nowrap">
        ·{" "}
        {activeLang === "zh"
          ? `100 加币 ≈ ¥${Math.round(fx.rate * 100)}`
          : `100 CAD ≈ ¥${Math.round(fx.rate * 100)}`}
      </span>
      {fx.sourceDate ? (
        <span className="whitespace-nowrap">
          · {t("fxUpdated")} {formatDateLabel(fx.sourceDate)}
        </span>
      ) : null}
      {fx.stale ? <span className="whitespace-nowrap">· {t("staleData")}</span> : null}
    </span>
  );
}

/** Weekday + date label for one forecast day. The source date may be an
 * ISO date or another parseable string; unparseable dates fall back to
 * the day's offset from today (today / tomorrow / +N days). */
function forecastDayLabel(
  date: string | null,
  index: number,
): { weekday: string; md: string } {
  const fallback =
    index === 0
      ? { weekday: t("forecastToday"), md: "" }
      : index === 1
        ? { weekday: t("tomorrow"), md: "" }
        : { weekday: `+${index}${activeLang === "zh" ? "天" : "d"}`, md: "" };
  if (!date) return fallback;
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(date)?.[0] ?? null;
  const d = iso
    ? new Date(`${iso}T12:00:00Z`)
    : new Date(date.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return fallback;
  const weekday = new Intl.DateTimeFormat(uiLocale(), {
    timeZone: iso ? "UTC" : undefined,
    weekday: "short",
  }).format(d);
  if (iso) {
    return { weekday, md: `${d.getUTCMonth() + 1}/${d.getUTCDate()}` };
  }
  return { weekday, md: `${d.getMonth() + 1}/${d.getDate()}` };
}

/** Forecast summaries arrive as full sentences ("Sunshine. Highs 17 to
 * 19C…"); the grid shows just the leading condition phrase, localized. */
function forecastCondition(summary: string | null): string | null {
  if (!summary) return null;
  const phrase = summary.split(".")[0]?.trim() ?? "";
  if (!phrase) return null;
  return activeLang === "zh" ? wxZh(phrase) : phrase;
}

/** The weather source reports sunrise/sunset as raw ISO timestamps
 * ("2026-11-11T07:06:34-05:00", "2026-11-11T06:58:42+0800"); the board
 * only ever shows the local HH:MM wall time. The ISO time portion is
 * already the location's local time (its offset says so), so it is
 * extracted directly — no timezone conversion that could shift it.
 * Values that are already "HH:MM" pass through; anything unparseable
 * is dropped rather than shown raw. */
function fmtSunTime(raw: string | null): string | null {
  if (!raw) return null;
  const iso = /T(\d{2}):(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}:${iso[2]}`;
  const plain = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (plain) return `${(plain[1] ?? "0").padStart(2, "0")}:${plain[2]}`;
  return null;
}

/** Tomorrow's line for one city, fully localized: the source summary is
 * an English sentence ("Sunshine. Highs 17 to 19C and lows 2 to 4C."),
 * so the Chinese board renders condition + ranges in Chinese format
 * ("晴 · 高 17–19° 低 2–4°") and never the raw sentence. When the
 * sentence's ranges can't be parsed, fall back to the numeric
 * tomorrow low–high, the same shape Toronto's header line uses. */
function tomorrowLine(w: Weather): string | null {
  if (!w) return null;
  const cond = w.tomorrowSummary ? forecastCondition(w.tomorrowSummary) : null;
  if (activeLang === "zh" && w.tomorrowSummary) {
    const hi = /highs?\s+(-?\d+)\s*(?:to|–|-)\s*(-?\d+)/i.exec(w.tomorrowSummary);
    const lo = /lows?\s+(-?\d+)\s*(?:to|–|-)\s*(-?\d+)/i.exec(w.tomorrowSummary);
    if (hi && lo) {
      const ranges = `高 ${hi[1]}–${hi[2]}° 低 ${lo[1]}–${lo[2]}°`;
      return cond ? `${cond} · ${ranges}` : ranges;
    }
    if (hi) {
      const range = `高 ${hi[1]}–${hi[2]}°`;
      return cond ? `${cond} · ${range}` : range;
    }
    if (lo) {
      const range = `低 ${lo[1]}–${lo[2]}°`;
      return cond ? `${cond} · ${range}` : range;
    }
  }
  const range =
    w.tomorrowLow !== null && w.tomorrowHigh !== null
      ? `${Math.round(w.tomorrowLow)}–${Math.round(w.tomorrowHigh)}°`
      : null;
  if (cond && range) return `${cond} ${range}`;
  return cond ?? range;
}

const AQI_ZH: Record<string, string> = {
  Good: "良好",
  Moderate: "中等",
  "Unhealthy for Sensitive Groups": "敏感人群不佳",
  Unhealthy: "不佳",
  "Very Unhealthy": "很差",
  Hazardous: "有害",
};

function aqiDesc(description: string): string {
  if (activeLang !== "zh") return description;
  return AQI_ZH[description] ?? description;
}

/** Destination City air-quality text from the weather payload, when present. */
function aqiText(w: Weather): string | null {
  if (!w) return null;
  if (w.airQualityIndex !== null) {
    return `${t("aqiLabel")} ${Math.round(w.airQualityIndex)}${w.airQualityDescription ? ` · ${aqiDesc(w.airQualityDescription)}` : ""}`;
  }
  return w.airQualityDescription
    ? `${t("aqiLabel")} ${aqiDesc(w.airQualityDescription)}`
    : null;
}

function uvText(w: Weather): string | null {
  if (!w) return null;
  if (w.uvIndex !== null) {
    return `${t("uvLabel")} ${Math.round(w.uvIndex)}${w.uvDescription ? ` · ${w.uvDescription}` : ""}`;
  }
  return w.uvDescription ? `${t("uvLabel")} ${w.uvDescription}` : null;
}

/** Trip countdown derived from the fixed trip dates on page 3. */
function tripCountdown(nowKey: string): { label: string; days: number | null } {
  const dep = "2027-01-15";
  const ret = "2027-03-01";
  const diff = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
  if (nowKey < dep) return { label: t("tripNotStarted"), days: diff(nowKey, dep) };
  if (nowKey <= ret) return { label: t("tripInProgress"), days: diff(nowKey, ret) };
  return { label: t("tripDone"), days: null };
}

function DualCityStrip({ toronto, destination, weatherPending, onRetryWeather, onOpenChina }: { toronto: Weather; destination: Weather; weatherPending: boolean; onRetryWeather: () => void; onOpenChina: () => void }) {
  const todayKey = torontoTodayKey(new Date());
  const trip = tripCountdown(todayKey);
  const diffTemp = toronto?.temperature != null && destination?.temperature != null ? Math.round(destination.temperature - toronto.temperature) : null;
  const diffText = diffTemp === null ? null : diffTemp === 0 ? t("tempSame") : diffTemp > 0 ? `${t("destination")} ${t("tempWarmer")} ${diffTemp}°` : `${t("destination")} ${t("tempColder")} ${Math.abs(diffTemp)}°`;
  return (
    <div
      onClick={onOpenChina}
      className={`${CARD_CLASS} group mt-2 flex cursor-pointer flex-wrap items-center gap-x-5 gap-y-1.5 transition hover:border-[var(--accent)] [@media(max-height:949px)]:mt-1.5`}
      aria-label={t("dualCityTitle")}
      title={t("page3")}
    >
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text)]">
        <SvgIcon color="#f53f3f" size={14} className="shrink-0"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></SvgIcon>
        {t("tripCountdownTitle")}
      </span>
      {/* v1.8.2: the days-to-departure number is the strip's visual
          anchor — big, extra-bold, accent-colored; the label, unit
          and date range stay small beside it. The whole strip clicks
          through to page 3 (the button stays as the keyboard target). */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChina();
        }}
        className="flex items-baseline gap-1.5 text-[13px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        aria-label={t("page3")}
      >
        {trip.days !== null ? (
          <>
            <span>{trip.label}</span>
            <span className="text-[26px] font-extrabold leading-none tracking-tight">
              {trip.days}
            </span>
            <span className="font-semibold">{t("daysUnit")}</span>
            <span className="font-normal text-[var(--dim)]">· 2027-01-15 → 2027-03-01</span>
          </>
        ) : (
          trip.label
        )}
      </button>
      {/* 双城当前天气 + 温差 + 目的地明日 + 目的地空气，一条扫完
          （v1.8.1 起顶栏右上同样有双城天气，两处并存）。 */}
      {toronto ? (
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--dim)]" title={weatherTitle(toronto)}>
          <WeatherGlyph />
          <span className="truncate"><span className="font-medium text-[var(--text)]">{t("weatherToday")}</span> {weatherSummary(toronto)}</span>
        </span>
      ) : weatherPending ? (
        <span className="text-[13px] text-[var(--dim)]">{t("weatherLoading")}</span>
      ) : (
        <span className="text-[13px] text-[var(--dim)]">
          {t("weatherUnavailable")}
          <button type="button" onClick={(e) => { e.stopPropagation(); onRetryWeather(); }} aria-label={t("retry")} className="ml-1.5 font-medium text-[var(--accent)] underline underline-offset-2">{t("retry")}</button>
        </span>
      )}
      {destination ? (
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--dim)]" title={weatherTitle(destination)}>
          <WeatherGlyph />
          <span className="truncate"><span className="font-medium text-[var(--text)]">{t("weatherDestination")}</span> {weatherSummary(destination)}</span>
        </span>
      ) : weatherPending ? (
        <span className="text-[13px] text-[var(--dim)]">{t("destinationLoading")}</span>
      ) : (
        <span className="text-[13px] text-[var(--dim)]">
          {t("destinationUnavailable")}
          <button type="button" onClick={(e) => { e.stopPropagation(); onRetryWeather(); }} aria-label={t("retry")} className="ml-1.5 font-medium text-[var(--accent)] underline underline-offset-2">{t("retry")}</button>
        </span>
      )}
      {diffText ? <span className="text-[13px] text-[var(--dim)]">{diffText}</span> : null}
      {tomorrowLine(destination) ? <span className="min-w-0 truncate text-[13px] text-[var(--dim)]">{t("destination")} {t("tomorrow")}：{tomorrowLine(destination)}</span> : null}
      {aqiText(destination) ? <span className="text-[13px] text-[var(--dim)]">{t("destination")} {aqiText(destination)}</span> : null}
      {/* Click affordance: the chevron warms to the accent color with
          the strip's hover border — the strip is a door to page 3,
          not a hidden one. */}
      <span aria-hidden="true" className="ml-auto shrink-0 text-lg leading-none text-[var(--dim)] transition group-hover:text-[var(--accent)]">›</span>
    </div>
  );
}

/**
 * Top-right header block in the fuller v1.7.2 layout, restored in
 * v1.8.1 (v1.8.0 had compressed it to a single line and dropped the
 * weather from here — Mark preferred the older, fuller use of the
 * space): a stacked, right-aligned column —
 *   row 1: work chip + live Toronto / Beijing clocks;
 *   row 2: Toronto weather (temp / condition / high-low / tomorrow /
 *          humidity, all visible);
 *   row 3: Destination City weather, same shape;
 *   row 4: CAD→CNY rate with the 100-CAD equivalent + update date.
 * The page-1 dual-city strip keeps its own weather lines too; this
 * header block is the canonical one. Ticks every second.
 */
function HeaderMeta({
  fx,
  fxPending,
  onRetryFx,
  weather,
  destination,
  weatherPending,
  onRetryWeather,
}: {
  fx: Fx;
  fxPending: boolean;
  onRetryFx: () => void;
  weather: Weather;
  destination: Weather;
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
    <div className="flex w-full min-w-0 max-w-full flex-col gap-y-1 lg:items-end">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 lg:justify-end">
        <span
          className={
            work.off
              ? "max-w-full shrink-0 whitespace-nowrap rounded-full bg-[var(--header-chip)] px-2 py-0.5 text-[11px] font-medium leading-snug text-[var(--header-dim)]"
              : "max-w-full shrink-0 whitespace-nowrap rounded-full bg-[#00b578]/15 px-2 py-0.5 text-[11px] font-medium leading-snug text-[#00754b] dark:text-[#5ee0a8]"
          }
        >
          <span
            aria-hidden="true"
            className={
              work.off
                ? "mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--header-dim)] align-middle"
                : "mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#00b578] align-middle motion-reduce:animate-none dark:bg-[#00b578]"
            }
          />
          {work.prefix} · {work.label}
        </span>
        <span className="shrink-0 whitespace-nowrap text-[11px] text-[var(--header-dim)]">
          {t("toronto")} {formatZoneDate(now, "America/Toronto")}{" "}
          <span className="text-sm font-bold tabular-nums text-[var(--header-text)]">
            {formatClockTime(now, "America/Toronto")}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap border-l border-[var(--header-border)] pl-3 text-[11px] text-[var(--header-dim)]">
          {t("beijing")} {formatZoneDate(now, "Asia/Shanghai")}{" "}
          <span className="text-sm font-bold tabular-nums text-[var(--header-text)]">
            {formatClockTime(now, "Asia/Shanghai")}
          </span>
        </span>
      </div>
      <HeaderWeatherLine
        w={weather}
        label={t("weatherToday")}
        pending={weatherPending}
        loadingText={t("weatherLoading")}
        unavailableText={t("weatherUnavailable")}
        onRetry={onRetryWeather}
      />
      <HeaderWeatherLine
        w={destination}
        label={`${t("weatherDestination")}`}
        pending={weatherPending}
        loadingText={t("destinationLoading")}
        unavailableText={t("destinationUnavailable")}
        onRetry={onRetryWeather}
      />
      <FxSegment fx={fx} pending={fxPending} onRetry={onRetryFx} />
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
    bg: "rgba(0,119,250,0.10)",
    glyph: (
      <SvgIcon color="#0077fa" size={18} className="shrink-0">
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
    label: "Foxuma",
    href: "https://app.example.com",
    bg: "rgba(0,119,250,0.10)",
    glyph: (
      <SvgIcon color="#0077fa" size={18} className="shrink-0">
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
          className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#00b578] motion-reduce:animate-none"
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
                className="flex items-center gap-1.5 rounded-[6px] px-1.5 py-1 transition hover:bg-[var(--fill)]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-[6px]"
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

/** Page-1 slim summary of today's completions: one line with the count,
 * linking to page 4 (History) where the full 7-day archive lives. */
function DoneTodayStrip({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("page4")}
      className={`${CARD_CLASS} mt-2 flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left transition hover:brightness-[1.02] active:scale-[0.995] motion-reduce:transition-none [@media(max-height:949px)]:mt-1.5`}
    >
      <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[var(--text)]">
        <SvgIcon color="var(--accent)" size={14} className="shrink-0">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </SvgIcon>
        {t("doneToday")}
      </span>
      {count === 0 ? (
        <span className="truncate text-[13px] text-[var(--dim)]">
          {t("doneTodayNone")}
        </span>
      ) : (
        <span className="text-[13px] font-medium text-[var(--accent)]">
          {activeLang === "zh"
            ? `✓ 今日已完成 ${count} 件 → 第 4 页`
            : `✓ ${count} done today → History`}
        </span>
      )}
    </button>
  );
}

function shiftDateKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Relative group heading for one history day: 今天 / 昨天, else a
 * "11月8日周六"-style date + weekday in the active UI language. */
function historyGroupLabel(dateKey: string): string {
  const todayKey = torontoTodayKey(new Date());
  if (dateKey === todayKey) return t("historyTodayLabel");
  if (dateKey === shiftDateKey(todayKey, -1)) return t("historyYesterdayLabel");
  const d = new Date(`${dateKey}T12:00:00Z`);
  if (activeLang === "zh") {
    const weekday = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "UTC",
      weekday: "short",
    }).format(d);
    return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日${weekday}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

type DoneGroup = { date: string; items: string[] };

/** Page-4 day groups: today's live list first (still unarchived), then
 * the archived buckets; a same-date bucket merges into today's group. */
function buildDoneGroups(
  doneToday: string[],
  history: DoneGroup[],
): DoneGroup[] {
  const todayKey = torontoTodayKey(new Date());
  const groups: DoneGroup[] = [];
  const todayBucket = history.find((b) => b.date === todayKey);
  const todayItems = [...doneToday, ...(todayBucket?.items ?? [])];
  if (todayItems.length > 0) groups.push({ date: todayKey, items: todayItems });
  for (const bucket of history) {
    if (bucket.date !== todayKey && bucket.items.length > 0) {
      groups.push(bucket);
    }
  }
  return groups;
}

/** Page 4 「完成记录」: read-only archive of completions, grouped by day. */
function DoneHistoryPage({ groups }: { groups: DoneGroup[] }) {
  if (groups.length === 0) {
    return (
      <section aria-label={t("historyTitle")} className={`${CARD_CLASS} mt-3`}>
        <EmptyLine text={t("historyEmpty")} />
      </section>
    );
  }
  return (
    <div className="mt-3 flex flex-col gap-3">
      {groups.map((group) => (
        <section
          key={group.date}
          aria-label={`${historyGroupLabel(group.date)} · ${group.date}`}
          className={CARD_CLASS}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              {historyGroupLabel(group.date)}
            </h3>
            <span className="shrink-0 text-xs tabular-nums text-[var(--dim)]">
              {group.items.length} {t("historyItemsUnit")}
            </span>
          </div>
          <ul className="mt-1.5 flex flex-wrap items-center gap-1">
            {group.items.map((entry, i) => (
              <li
                key={`${group.date}-${i}-${entry}`}
                className="rounded-[6px] bg-[#00b578]/10 px-2 py-0.5 text-xs font-medium text-[#00754b] dark:text-[#5ee0a8]"
              >
                ✓ {entry}
              </li>
            ))}
          </ul>
        </section>
      ))}
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
      ? "bg-[#00b578]"
      : status === "down"
        ? "bg-[#f53f3f]"
        : "bg-[var(--dim)]";
  return <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
}

function StatusWord({ status }: { status: StatusKind }) {
  if (status === "up")
    return <span className="shrink-0 text-sm font-medium text-[#00915f] dark:text-[#5ee0a8]">{t("statusNormal")}</span>;
  if (status === "down")
    return <span className="shrink-0 text-sm font-semibold text-[#d92d20] dark:text-[#ff9d97]">{t("statusDownWord")}</span>;
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
 * websites + Mini PC + office-server. Green and quiet when everything is up,
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
      ? "bg-[#f53f3f]/20 text-[#d92d20] dark:text-[#fca5a5]"
      : !data
        ? "bg-[var(--header-chip)] text-[var(--header-dim)]"
        : hasUnknown
          ? "bg-[var(--header-chip)] text-[var(--header-text)]"
          : "bg-[#00b578]/15 text-[#00754b] dark:text-[#5ee0a8]";
  const dotCls =
    downNames.length > 0
      ? "bg-[#ff9d97]"
      : !data
        ? "bg-[var(--header-dim)]"
        : hasUnknown
          ? "bg-[var(--header-dim)]"
          : "bg-[#00b578]";
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

type BoardPage = "main" | "more" | "china" | "history" | "jason" | "cfo" | "growth";

/** Page switch, grouped since v1.9.0 (Semi button-type Tabs — the fill
 * container + white selected tab the board has used since v1.7.0, now
 * arranged in three labelled groups so seven pages stay one-glance):
 *   日常 (daily):  今天 (page 1 workbench) / 待拍板 (waiting-on-decision)
 *                  / CFO (money) / 状态 (page 2: later deadlines +
 *                  status detail — page 1's own drill-down, last in
 *                  the daily group)
 *   专题 (topics): 增长 (growth) / 回国 (page 3, expanded in place)
 *   记录 (records): 历史 (done-history archive)
 * The bar is ONE line at every width: it never wraps and never hides
 * a page into a menu — at 390px it scrolls horizontally instead.
 * Group captions + hairline dividers make the grouping visible in the
 * bar's arrangement; grouping governs order/presentation only, every
 * page's contents are unchanged. */
function PageTabs({
  page,
  chinaCount,
  jasonCount,
  onChange,
}: {
  page: BoardPage;
  chinaCount: number;
  jasonCount: number;
  onChange: (page: BoardPage) => void;
}) {
  // At 390px the bar scrolls horizontally (by design); whenever the
  // page changes — including arrivals via in-page buttons like the
  // dual-city strip — slide the selected tab into view so the current
  // page is always visible in the bar.
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !selected) return;
    const delta =
      selected.getBoundingClientRect().left -
      list.getBoundingClientRect().left -
      12;
    if (delta < -4 || delta + selected.offsetWidth > list.clientWidth - 12) {
      list.scrollLeft += delta;
    }
  }, [page]);
  const tabCls = (active: boolean) =>
    active
      ? "h-8 shrink-0 whitespace-nowrap rounded-[6px] bg-[var(--surface)] px-3 text-[13px] font-semibold text-[var(--accent)] shadow-[0_1px_4px_rgba(28,31,35,0.14)] transition"
      : "h-8 shrink-0 whitespace-nowrap rounded-[6px] px-3 text-[13px] font-medium text-[var(--dim)] transition hover:text-[var(--text)]";
  const caption = (label: string, first: boolean) => (
    <span
      aria-hidden="true"
      className={`shrink-0 select-none whitespace-nowrap text-[11px] font-semibold tracking-wide text-[var(--dim)] ${
        first ? "pl-1.5 pr-0.5" : "pl-2 pr-0.5"
      }`}
    >
      {label}
    </span>
  );
  const divider = (
    <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 self-center bg-[var(--border)]" />
  );
  const tab = (
    target: BoardPage,
    label: string,
    aria: string,
    count?: number,
  ) => (
    <button
      type="button"
      role="tab"
      aria-selected={page === target}
      aria-label={aria}
      onClick={() => onChange(target)}
      className={tabCls(page === target)}
    >
      {label}
      {count !== undefined && count > 0 ? (
        <span className="tabular-nums"> {count}</span>
      ) : null}
    </button>
  );
  return (
    <div className="mt-2">
      <div
        ref={listRef}
        role="tablist"
        aria-label={t("tabsAria")}
        className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[8px] border border-[var(--border)] bg-[var(--fill)] p-[3px]"
      >
        {caption(t("tabGroupDaily"), true)}
        {tab("main", t("tabToday"), t("page1"))}
        {tab("jason", t("tabJason"), t("jasonTitle"), jasonCount)}
        {tab("cfo", t("tabCfo"), t("cfoTitle"))}
        {tab("more", t("tabStatus"), activeLang === "zh" ? "第 2 页 · 更远到期 + 状态详情" : "Page 2 · Later deadlines + Status")}
        {divider}
        {caption(t("tabGroupTopic"), false)}
        {tab("growth", t("tabGrowth"), t("growthTitle"))}
        {tab("china", t("tabChina"), t("page3"), chinaCount)}
        {divider}
        {caption(t("tabGroupRecord"), false)}
        {tab("history", t("tabHistory"), t("page4"))}
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

/** Page-3 checklist groups (v1.9.0): rows group by their lane key —
 * "pre" 出发前清尾 / "inch" 在华待办 / "gifts" 礼物进度 / "pack" 打包
 * 定稿； any other lane (including "") falls into 其他待办. While every
 * row's lane is empty the list renders as ONE flat list, byte-for-byte
 * the pre-v1.9.0 behaviour, so existing items are untouched until the
 * China Trip room tags them. */
const CHINA_GROUPS: { lane: string; titleKey: StrKey }[] = [
  { lane: "pre", titleKey: "chinaGroupPre" },
  { lane: "inch", titleKey: "chinaGroupInChina" },
  { lane: "gifts", titleKey: "chinaGroupGifts" },
  { lane: "pack", titleKey: "chinaGroupPacking" },
];

function ChinaChecklistGroups({
  items,
  pendingId,
  onToggle,
}: {
  items: Item[];
  pendingId: number | undefined;
  onToggle: (id: number, done: boolean) => void;
}) {
  const renderList = (rows: Item[]) => (
    <ul className="divide-y divide-[var(--border)]">
      {rows.map((item) => (
        <ChinaRow
          key={item.id}
          item={item}
          pending={pendingId === item.id}
          onToggle={(done) => onToggle(item.id, done)}
        />
      ))}
    </ul>
  );
  if (!items.some((i) => i.lane !== "")) return renderList(items);
  const known = new Set(CHINA_GROUPS.map((g) => g.lane));
  const rest = items.filter((i) => !known.has(i.lane));
  const groupBlock = (titleKey: StrKey, rows: Item[]) =>
    rows.length === 0 ? null : (
      <div key={titleKey}>
        <p className="flex items-baseline gap-2 pb-0.5 pt-2.5 text-[13px] font-semibold text-[var(--text)] first:pt-1">
          {t(titleKey)}
          <span className="text-xs font-medium tabular-nums text-[var(--dim)]">
            {rows.filter((i) => i.status === "done").length}/{rows.length}
          </span>
        </p>
        {renderList(rows)}
      </div>
    );
  return (
    <div>
      {CHINA_GROUPS.map((g) => groupBlock(g.titleKey, items.filter((i) => i.lane === g.lane)))}
      {groupBlock("chinaGroupOther", rest)}
    </div>
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
      className="mb-3 space-y-2 rounded-[8px] border border-[var(--border)] bg-[var(--fill)] p-3"
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
          className="h-10 flex-1 rounded-[6px] bg-[var(--accent)] text-[15px] font-semibold text-white transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] disabled:opacity-50"
        >
          {pending ? t("adding") : t("add")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-medium text-[var(--text)] transition hover:bg-[var(--fill)]"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Deadline items as ONE line per item (date · title · note inline · countdown),
 * shared by page 1 (≤14 天） and page 2 (>14 天）. Items arrive from the
 * server in pure due-date order (soonest first); v1.8.2 stable-pins
 * items due today (Toronto date) to the very top — their relative
 * order is kept, and every other item keeps its order too. */
function DeadlineGroups({ items }: { items: Item[] }) {
  const isDueToday = (item: Item) =>
    item.dueDate !== null && daysUntil(item.dueDate) === 0;
  const ordered = [
    ...items.filter(isDueToday),
    ...items.filter((item) => !isDueToday(item)),
  ];
  return (
    <ul className="divide-y divide-[var(--border)]">
      {ordered.map((item) => {
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
  blocked: { zh: "受阻", en: "Blocked" },
};

function StatusPill({ status }: { status: string }) {
  if (!status) return null;
  let cls = "bg-[var(--fill)] text-[var(--dim)]";
  if (status === "进行中") {
    cls = "bg-[#0077fa]/10 text-[#0063d1] dark:bg-[#4d9fff]/15 dark:text-[#8fbeff]";
  } else if (status === "blocked") {
    // Blocked is its own third state: amber, never the green done tint.
    cls = "bg-[#ff9d0a]/15 text-[#a15e00] dark:text-[#ffc65c]";
  } else if (/完成|已发|已录/.test(status)) {
    cls = "bg-[#00b578]/10 text-[#00754b] dark:text-[#5ee0a8]";
  } else if (/注意|异常|过期|卡/.test(status)) {
    cls = "bg-[#ff9d0a]/15 text-[#a15e00] dark:text-[#ffc65c]";
  }
  const label = STATUS_LABELS[status]?.[activeLang] ?? status;
  return (
    <span
      className={`shrink-0 rounded-[6px] px-2 py-0.5 text-xs font-medium ${cls}`}
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
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-[var(--text)]">
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
        className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--fill)]"
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
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[var(--fill)]"
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
    <span className="font-semibold text-[#d92d20] dark:text-[#ff9d97]">{t("rejected")}</span>
  );
}

function DeadlineChip({ left }: { left: number }) {
  if (left < 0) {
    return (
      <span className="rounded-[6px] bg-[#f53f3f] px-2 py-0.5 text-xs font-medium text-white">
        {activeLang === "zh" ? `已过期 ${-left} 天` : `${-left} d overdue`}
      </span>
    );
  }
  if (left === 0) {
    // Due today gets its own orange-red badge (v1.8.2) — louder than
    // the ≤3-day amber, distinct from the pure-red overdue chip.
    return (
      <span className="rounded-[6px] bg-[#fa541c] px-2 py-0.5 text-xs font-semibold text-white">
        {t("dueTodayChip")}
      </span>
    );
  }
  if (left <= 3) {
    return (
      <span className="rounded-[6px] bg-[#ff9d0a]/15 px-2 py-0.5 text-xs font-medium text-[#a15e00] dark:text-[#ffc65c]">
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

/** Toronto-zoned short stamp for an instant (M/D HH:MM). */
function formatStampToronto(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(uiLocale(), {
    timeZone: "America/Toronto",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** Header strip shared by the v1.9.0 pages: tile + title + one-line
 * purpose, and the page's own 数据更新时间 on the right — the newest
 * updatedAt among the page's rows (Toronto time), or 尚未同步 when the
 * page has no feed rows yet. Semi Card + Tag language, same shape as
 * the history page's header strip. */
function NewPageHeader({
  kind,
  title,
  sub,
  items,
}: {
  kind: SectionKind;
  title: string;
  sub: string;
  items: Item[];
}) {
  const stamp = items.reduce<string | null>(
    (acc, i) => (acc === null || i.updatedAt > acc ? i.updatedAt : acc),
    null,
  );
  return (
    <div className={`${CARD_CLASS} mt-3 flex flex-wrap items-center gap-x-3 gap-y-1`}>
      <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--text)]">
        <SectionTile kind={kind} />
        {title}
      </span>
      <span className="min-w-0 text-sm text-[var(--dim)]">{sub}</span>
      <span className="ml-auto shrink-0 text-xs tabular-nums text-[var(--dim)]">
        {stamp
          ? `${t("dataUpdatedAt")} ${formatStampToronto(stamp)}${t("torontoTimeSuffix")}`
          : t("notSynced")}
      </span>
    </div>
  );
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 待拍板 page (waiting-on-decision). Feed convention (the ops lane
 * writes via the generic item actions, section "jason"): dueDate =
 * the day the ask was raised, so drag days = today − dueDate and the
 * list is sorted longest-wait first; a hard date, when the item has one,
 * rides in `status` as an ISO date and gets the board's DeadlineChip
 * badge （今天到期 orange-red / overdue red — same caliber as the
 * deadlines list). Rows Tina closes land in the 本周已清 strip via
 * getBoard's jasonCleared. Semi List rhythm + soft Tags throughout. */
function JasonPage({ open, cleared }: { open: Item[]; cleared: Item[] }) {
  const dragOf = (item: Item): number | null =>
    item.dueDate ? -daysUntil(item.dueDate) : null;
  const ordered = [...open].sort((a, b) => {
    const da = dragOf(a);
    const db = dragOf(b);
    if (da !== null && db !== null) return db - da || a.id - b.id;
    if (da !== null) return -1;
    if (db !== null) return 1;
    return a.sort - b.sort || a.id - b.id;
  });
  const dragChip = (drag: number) => {
    const cls =
      drag >= 14
        ? "bg-[#f53f3f] text-white font-semibold"
        : drag >= 7
          ? "bg-[#ff9d0a]/15 text-[#a15e00] dark:text-[#ffc65c] font-medium"
          : "bg-[var(--fill)] text-[var(--dim)] font-medium";
    return (
      <span className={`shrink-0 rounded-[6px] px-2 py-0.5 text-xs tabular-nums ${cls}`}>
        {t("jasonDragPrefix")} {drag} {t("jasonDragDays")}
      </span>
    );
  };
  return (
    <>
      <NewPageHeader
        kind="jason"
        title={t("jasonTitle")}
        sub={t("jasonSub")}
        items={[...open, ...cleared]}
      />
      <section aria-label={t("jasonTitle")} className={`${CARD_CLASS} mt-3`}>
        {ordered.length === 0 ? (
          <EmptyLine text={cleared.length > 0 ? t("jasonNoneOpen") : t("jasonEmpty")} />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {ordered.map((item) => {
              const drag = dragOf(item);
              const hard = ISO_DATE_RE.test(item.status.trim())
                ? item.status.trim()
                : null;
              return (
                <li key={item.id} id={`board-item-${item.id}`} className="scroll-mt-24 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-[15px] font-medium leading-snug text-[var(--text)]">
                      {item.title}
                    </p>
                    {drag !== null && drag > 0 ? dragChip(drag) : null}
                  </div>
                  {item.detail ? (
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--dim)]">{item.detail}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs tabular-nums text-[var(--dim)]">
                      {item.dueDate
                        ? `${t("jasonAskedOn")} ${formatDateLabel(item.dueDate)}`
                        : t("jasonNoDate")}
                    </span>
                    {hard ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--dim)]">{t("jasonHardDate")}</span>
                        <DeadlineChip left={daysUntil(hard)} />
                      </span>
                    ) : item.status ? (
                      <StatusPill status={item.status} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-label={t("jasonClearedTitle")} className={`${CARD_CLASS} mt-3`}>
        <SectionHeading icon={<SectionTile kind="jason" />}>
          {t("jasonClearedTitle")}
        </SectionHeading>
        {cleared.length === 0 ? (
          <EmptyLineCompact text={t("jasonClearedEmpty")} />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {cleared.map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-[5px]">
                <span aria-hidden="true" className="shrink-0 font-semibold text-[#00b578]">✓</span>
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--dim)]">
                  <span className="font-medium">{item.title}</span>
                  {item.detail ? <span> · {item.detail}</span> : null}
                </span>
                {item.closedAt ? (
                  <span className="shrink-0 text-xs tabular-nums text-[var(--dim)]">
                    {formatStampToronto(item.closedAt)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** CFO feed convention (QB room writes via the generic item actions,
 * section "money"): lane "ar" = 应收 / "ap" = 应付， dueDate = due
 * date, `status` = the CAD amount as a plain decimal string. Amounts
 * are rendered verbatim from the feed — an unparseable amount shows
 * "—", never an estimate. */
function parseAmount(status: string): number | null {
  const raw = status.trim().replace(/[$,]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString(uiLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** One Semi-Table-shaped money card: hairline header row （事项 / 到期 /
 * 金额）, divider rows, right-aligned tabular amounts, a 合计 footer
 * summed from the feed rows only (shown when at least one amount
 * parses — never a fabricated zero). */
function MoneyTable({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Item[];
  emptyText: string;
}) {
  const amounts = items
    .map((i) => parseAmount(i.status))
    .filter((n): n is number => n !== null);
  const total = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) : null;
  return (
    <section aria-label={title} className={`${CARD_CLASS} mt-3`}>
      <SectionHeading icon={<SectionTile kind="cfo" />}>{title}</SectionHeading>
      {items.length === 0 ? (
        <EmptyLineCompact text={emptyText} />
      ) : (
        <>
          <div
            aria-hidden="true"
            className="grid grid-cols-[minmax(0,1fr)_92px_96px] gap-x-2 border-b border-[var(--border)] pb-1.5 text-xs font-medium text-[var(--dim)]"
          >
            <span>{t("cfoColItem")}</span>
            <span>{t("cfoColDue")}</span>
            <span className="text-right">{t("cfoColAmount")}</span>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const amount = parseAmount(item.status);
              const left = item.dueDate ? daysUntil(item.dueDate) : null;
              return (
                <li
                  key={item.id}
                  id={`board-item-${item.id}`}
                  className="grid scroll-mt-24 grid-cols-[minmax(0,1fr)_92px_96px] items-start gap-x-2 py-[5px]"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug text-[var(--text)]">{item.title}</span>
                    {item.detail ? (
                      <span className="block text-[13px] leading-snug text-[var(--dim)]">{item.detail}</span>
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold tabular-nums text-[var(--text)]">
                      {item.dueDate ? formatDateLabel(item.dueDate) : t("cfoNoDate")}
                    </span>
                    {left !== null && left <= 3 ? (
                      <span className="mt-0.5 block">
                        <DeadlineChip left={left} />
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-[var(--text)]">
                    {amount !== null ? formatMoney(amount) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
          {total !== null ? (
            <div className="flex items-baseline justify-between border-t border-[var(--border)] pt-2">
              <span className="text-[13px] font-medium text-[var(--dim)]">{t("cfoTotal")}</span>
              <span className="text-[15px] font-bold tabular-nums text-[var(--text)]">{formatMoney(total)}</span>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/** CFO page: the next 30 days of money in/out （应收 / 应付）, plus the
 * top-5 collection list derived from the AR rows alone — most overdue
 * first, then largest amount. No feed rows → honest 尚未同步. */
function CfoPage({ items }: { items: Item[] }) {
  const inWindow = (item: Item) =>
    !item.dueDate || daysUntil(item.dueDate) <= 30;
  const byDue = (a: Item, b: Item) => {
    if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.id - b.id;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.sort - b.sort || a.id - b.id;
  };
  const ar = items.filter((i) => i.lane === "ar" && inWindow(i)).sort(byDue);
  const ap = items.filter((i) => i.lane === "ap" && inWindow(i)).sort(byDue);
  const top5 = [...ar]
    .sort((a, b) => {
      const od = (i: Item) => (i.dueDate ? Math.max(0, -daysUntil(i.dueDate)) : 0);
      return od(b) - od(a) || (parseAmount(b.status) ?? 0) - (parseAmount(a.status) ?? 0);
    })
    .slice(0, 5);
  return (
    <>
      <NewPageHeader kind="cfo" title={t("cfoTitle")} sub={t("cfoSub")} items={items} />
      <MoneyTable title={t("cfoArTitle")} items={ar} emptyText={t("cfoEmpty")} />
      <MoneyTable title={t("cfoApTitle")} items={ap} emptyText={t("cfoEmpty")} />
      <section aria-label={t("cfoTopTitle")} className={`${CARD_CLASS} mt-3`}>
        <SectionHeading icon={<SectionTile kind="cfo" />}>{t("cfoTopTitle")}</SectionHeading>
        {top5.length === 0 ? (
          <EmptyLineCompact text={t("cfoEmpty")} />
        ) : (
          <ol className="divide-y divide-[var(--border)]">
            {top5.map((item, idx) => {
              const amount = parseAmount(item.status);
              const overdue = item.dueDate ? Math.max(0, -daysUntil(item.dueDate)) : 0;
              return (
                <li key={item.id} className="flex items-center gap-2 py-[5px]">
                  <span aria-hidden="true" className="w-5 shrink-0 text-center text-[13px] font-bold tabular-nums text-[var(--dim)]">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--text)]">{item.title}</span>
                    {item.detail ? (
                      <span className="block truncate text-[13px] text-[var(--dim)]">{item.detail}</span>
                    ) : null}
                  </span>
                  {overdue > 0 ? (
                    <span className="shrink-0 rounded-[6px] bg-[#f53f3f] px-2 py-0.5 text-xs font-medium text-white">
                      {t("cfoOverdueDays")} {overdue} {t("jasonDragDays")}
                    </span>
                  ) : item.dueDate ? (
                    <span className="shrink-0 text-xs tabular-nums text-[var(--dim)]">
                      {formatDateLabel(item.dueDate)}
                    </span>
                  ) : null}
                  <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-[var(--text)]">
                    {amount !== null ? formatMoney(amount) : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}

/** 增长 feed convention (Foxuma room + outreach register write via
 * the generic item actions, section "growth"): lane groups the rows —
 * "founding" (the verified seat fact), "funnel" （注册/试用/转付费）,
 * "outreach" (the three outreach lines). `status` carries the feed's
 * value string and is shown verbatim; nothing is computed here except
 * the page's own update stamp. */
function GrowthPage({ items }: { items: Item[] }) {
  const founding = items.filter((i) => i.lane === "founding");
  const funnel = items.filter((i) => i.lane === "funnel");
  const outreach = items.filter((i) => i.lane === "outreach");
  const valueRows = (rows: Item[]) => (
    <ul className="divide-y divide-[var(--border)]">
      {rows.map((item) => (
        <li key={item.id} id={`board-item-${item.id}`} className="flex scroll-mt-24 items-baseline gap-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium leading-snug text-[var(--text)]">{item.title}</span>
            {item.detail ? (
              <span className="block text-[13px] leading-snug text-[var(--dim)]">{item.detail}</span>
            ) : null}
          </span>
          {item.status ? (
            <span className="shrink-0 text-[15px] font-bold tabular-nums text-[var(--text)]">{item.status}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <NewPageHeader kind="growth" title={t("growthTitle")} sub={t("growthSub")} items={items} />
      <section aria-label={t("foundingTitle")} className={`${CARD_CLASS} mt-3`}>
        <SectionHeading icon={<SectionTile kind="growth" />}>{t("foundingTitle")}</SectionHeading>
        {founding.length === 0 ? (
          <EmptyLineCompact text={t("growthEmpty")} />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {founding.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2">
                {item.status ? (
                  <span className="text-[26px] font-extrabold leading-none tabular-nums text-[var(--accent)]">
                    {item.status}
                  </span>
                ) : null}
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--text)]">{item.title}</span>
                  {item.detail ? (
                    <span className="block text-[13px] text-[var(--dim)]">{item.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label={t("funnelTitle")} className={`${CARD_CLASS} mt-3`}>
        <SectionHeading icon={<SectionTile kind="growth" />}>{t("funnelTitle")}</SectionHeading>
        {funnel.length === 0 ? <EmptyLineCompact text={t("growthEmpty")} /> : valueRows(funnel)}
      </section>
      <section aria-label={t("outreachTitle")} className={`${CARD_CLASS} mt-3`}>
        <SectionHeading icon={<SectionTile kind="growth" />}>{t("outreachTitle")}</SectionHeading>
        {outreach.length === 0 ? <EmptyLineCompact text={t("growthEmpty")} /> : valueRows(outreach)}
      </section>
    </>
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
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[8px] bg-[var(--fill)] px-3 py-2.5">
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
              className="h-11 flex-1 rounded-[8px] bg-[var(--accent)] text-base font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50"
            >
              {pending ? t("submitting") : t("yes")}
            </button>
            <button
              type="button"
              disabled={pending || dismissPending}
              onClick={() => onAnswer("no")}
              aria-label={`${activeLang === "zh" ? "否决" : "Reject"}：${item.title}`}
              className="h-11 flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-base font-semibold text-[var(--text)] transition hover:bg-[var(--fill)] active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50"
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
                  ? "h-11 shrink-0 rounded-[8px] border border-[#d92d20] bg-[#d92d20]/10 px-4 text-base font-semibold text-[#d92d20] transition disabled:opacity-50 dark:text-[#ff9d97]"
                  : "h-11 shrink-0 rounded-[8px] px-3 text-base font-medium text-[var(--dim)] underline-offset-2 transition hover:underline disabled:opacity-50"
              }
            >
              {dismissPending ? t("shelving") : dismissArmed ? t("shelveConfirm") : t("shelve")}
            </button>
          </div>
          {failed ? (
            <div
              role="alert"
              className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#d92d20] px-3 py-2 text-sm text-[#d92d20] dark:text-[#ff9d97]"
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
  "h-10 w-full rounded-[6px] border border-[var(--border)] bg-[var(--fill)] px-3 text-[15px] text-[var(--text)] placeholder:text-[var(--dim)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_3px_var(--accent-ring)] focus:outline-none";

const SMALL_BTN_CLASS =
  "h-7 rounded-[6px] px-2 text-[13px] font-medium text-[var(--dim)] transition hover:bg-[var(--fill)] hover:text-[var(--text)] disabled:opacity-50";

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
              className="h-10 flex-1 rounded-[6px] bg-[var(--accent)] text-[15px] font-semibold text-white transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] disabled:opacity-50"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-10 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-medium text-[var(--text)] transition hover:bg-[var(--fill)]"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li id={`board-item-${item.id}`} className="scroll-mt-24 py-[5px] [@media(max-height:949px)]:py-[3px]">
      {/* Collapsed: ONE line — glyph + title + status pill. Detail and the
          编辑/完成/删除 controls appear only when the row is expanded.
          Row padding matches the today timeline and deadline rows
          (v1.8.2 density unification across the three columns). */}
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
                  ? "h-8 rounded-md border border-[#d92d20] bg-[#d92d20]/10 px-2 text-sm font-semibold text-[#d92d20] transition disabled:opacity-50 dark:text-[#ff9d97]"
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
      className="mb-3 space-y-2 rounded-[8px] border border-[var(--border)] bg-[var(--fill)] p-3"
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
          className="h-10 flex-1 rounded-[6px] border border-[var(--border)] bg-[var(--fill)] px-2 text-[15px] text-[var(--text)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_3px_var(--accent-ring)] focus:outline-none"
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
          className="h-10 flex-1 rounded-[6px] bg-[var(--accent)] text-[15px] font-semibold text-white transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] disabled:opacity-50"
        >
          {pending ? t("adding") : t("add")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-medium text-[var(--text)] transition hover:bg-[var(--fill)]"
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
      ? "h-7 rounded-[6px] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text)] shadow-[0_1px_4px_rgba(28,31,35,0.16)] transition"
      : "h-7 rounded-[6px] px-2.5 text-xs font-medium text-[var(--header-dim)] transition hover:text-[var(--header-text)]";
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
        className="flex items-center rounded-[8px] bg-[var(--header-chip)] p-0.5"
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
        className="flex items-center rounded-[8px] bg-[var(--header-chip)] p-0.5"
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
  const scrimColor = resolvedTheme === "dark" ? "#1c2027" : "#ffffff";
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
  const fxQuery = useQuery({
    queryKey: ["fx"],
    queryFn: () => api.getFx({}),
    refetchInterval: 60 * 60_000,
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
    void fxQuery.refetch();
    void statusQuery.refetch();
    void spotifyQuery.refetch();
  };
  const refreshing =
    board.isFetching ||
    weatherQuery.isFetching ||
    fxQuery.isFetching ||
    statusQuery.isFetching;

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
            className="mt-4 h-10 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-5 text-[15px] font-medium text-[var(--text)] transition hover:bg-[var(--fill)]"
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
      (r) =>
        r.minutes !== null &&
        r.minutes >= 0 &&
        r.minutes >= nowMinutes &&
        r.item.status !== "blocked",
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
  // Truth-in-labeling: the follow-ups are NOT pending decisions — when
  // they are the only thing counted, the hero headline must say
  // "等你跟进" (waiting for your follow-up), never "需要你处理", so the
  // header can never appear to contradict the 待拍板 card's "nothing
  // waiting for a decision" state. The breakdown parts then only list
  // what the headline doesn't already say.
  const followOnly = data.decisions.length === 0 && followCount > 0;
  // When follow-ups are the only thing waiting, the hero names the
  // first one outright — Mark should not have to open the dropdown to
  // learn what it is. The name prefers the item's own 「下一步」 ask
  // (the concrete thing he has to do, e.g. 手柄和鼠标各补 2 张照片),
  // falling back to the item's title.
  const followHeadline = (entry: (typeof followItems)[number]): string => {
    const next = /下一步[:：]\s*([^。；]+)/.exec(entry.item.detail)?.[1];
    const cleaned = next?.replace(/（等\s*Mark[^）]*）/g, "").trim();
    return cleaned || entry.displayTitle;
  };
  const firstFollow = followItems[0];
  const followNamed =
    followOnly && firstFollow
      ? followHeadline(firstFollow) +
        (followCount > 1
          ? activeLang === "zh"
            ? ` 等 ${followCount} 件`
            : ` · ${followCount} in total`
          : "")
      : null;
  const heroParts = [
    data.decisions.length > 0
      ? activeLang === "zh"
        ? `待拍板 ${data.decisions.length}`
        : `${data.decisions.length} to decide`
      : null,
    followCount > 0 && !followOnly
      ? activeLang === "zh"
        ? `等你跟进 ${followCount}`
        : `${followCount} waiting on you`
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans antialiased">
      <SafeAreaTopScrim backgroundColor={scrimColor} />

      {/* 深色顶栏：日期 + 今日概览数字；右上多段元信息（状态 + 双时钟 /
          双城天气 / 汇率，v1.8.1 恢复 v1.7.2 的饱满排法） */}
      {page === "main" ? (
      <header className="border-b border-[var(--header-border)] bg-[var(--header-bg)] px-5 pb-2 pt-safe-or-3 text-[var(--header-text)] [@media(max-height:949px)]:pb-1">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="grid items-center gap-x-4 gap-y-2 lg:grid-cols-[1fr_auto_1fr] xl:grid-cols-[minmax(0,4.2fr)_auto_minmax(0,7fr)]">
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
                  className="h-8 shrink-0 rounded-[6px] bg-[var(--header-chip)] px-3 text-sm font-medium text-[var(--header-text)] transition hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50"
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
                        ? followOnly
                          ? followNamed
                            ? `等你跟进：${followNamed}（点开查看全部）`
                            : `查看等你跟进的 ${actionCount} 件事`
                          : `查看需要你处理的 ${actionCount} 件事`
                        : followNamed
                          ? `Waiting on you: ${followNamed} (open to view all)`
                          : actionCount === 1
                            ? "View the 1 item that needs you"
                            : `View the ${actionCount} items that need you`
                    }
                    className="rounded-lg px-2 py-1 transition hover:bg-[var(--header-chip)] active:scale-[0.99] motion-reduce:transition-none"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <span className="flex items-baseline justify-center gap-2 leading-none">
                        <span className="text-3xl font-black tabular-nums text-[var(--header-accent)]">
                          {actionCount}
                        </span>
                        <span className="text-base font-semibold text-[var(--header-text)]">
                          {activeLang === "zh"
                            ? followOnly
                              ? "件等你跟进"
                              : "样东西需要你处理"
                            : followOnly
                              ? actionCount === 1
                                ? "item waiting on you"
                                : "items waiting on you"
                              : actionCount === 1
                                ? "item needs your call"
                                : "items need your call"}
                        </span>
                        {heroParts.length > 0 ? (
                          <span className="text-xs text-[var(--header-dim)]">{heroParts.join(" · ")}</span>
                        ) : null}
                        <span aria-hidden="true" className="text-xs text-[var(--header-dim)]">
                          {heroOpen ? "▴" : "▾"}
                        </span>
                      </span>
                      {followNamed ? (
                        <span className="max-w-[min(430px,86vw)] truncate text-xs font-medium text-[var(--header-dim)]">
                          {followNamed}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {heroOpen ? (
                    <div className="absolute left-1/2 top-full z-50 mt-1 w-[min(430px,92vw)] -translate-x-1/2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-1.5 text-left shadow-[0_0_1px_rgba(28,31,35,0.08),0_8px_28px_rgba(28,31,35,0.16)]">
                      <ul className="max-h-[50vh] divide-y divide-[var(--border)] overflow-y-auto">
                        {actionEntries.map((entry) => (
                          <li key={`${entry.tag}-${entry.item.id}`}>
                            <button
                              type="button"
                              onClick={() => jumpToItem(entry.item.id)}
                              aria-label={`${entry.displayTitle} · ${entry.tag}`}
                              className="flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left transition hover:bg-[var(--fill)]"
                            >
                              <span className="shrink-0 rounded-[6px] bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
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
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00b578]/15"
                  >
                    <SvgIcon color="#00b578" size={14} className="shrink-0">
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

            <div className="min-w-0 lg:justify-self-end">
              <HeaderMeta
                fx={fxQuery.data?.fx ?? null}
                fxPending={fxQuery.isPending}
                onRetryFx={() => void fxQuery.refetch()}
                weather={weatherQuery.data?.weather ?? null}
                destination={weatherQuery.data?.destination ?? null}
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
            <PageTabs page={page} chinaCount={data.china.length} jasonCount={data.jasonOpen.length} onChange={setPage} />

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
                    className="h-10 rounded-[6px] bg-[var(--accent)] px-4 text-[15px] font-semibold text-white transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] disabled:opacity-50"
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
            <PageTabs page={page} chinaCount={data.china.length} jasonCount={data.jasonOpen.length} onChange={setPage} />

            {/* 行程信息：静态一行 */}
            <div className={`${CARD_CLASS} mt-3 flex flex-wrap items-center gap-x-3 gap-y-1`}>
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <SectionTile kind="china" />
                {t("chinaTitle")}
              </span>
              <span className="text-sm tabular-nums text-[var(--dim)]">{t("chinaTripLine")}</span>
              {data.china.length > 0 ? (
                <span className="ml-auto shrink-0 rounded-[6px] bg-[var(--fill)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--dim)]">
                  {t("chinaProgress")} {data.china.filter((i) => i.status === "done").length}/{data.china.length}
                </span>
              ) : null}
            </div>

            {/* 航班卡（v1.9.0）：行程定稿信息卡的演示版 — DEMO 101 去程 12A
                靠窗 / DEMO 102 回程 12F 靠窗，座位盯梢开启；航班号、座位与
                订座号均为虚构演示数据。 */}
            <section aria-label={t("flightTitle")} className={`${CARD_CLASS} mt-3`}>
              <SectionHeading icon={<SectionTile kind="china" />}>{t("flightTitle")}</SectionHeading>
              <ul className="divide-y divide-[var(--border)]">
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="shrink-0 rounded-[6px] bg-[#0077fa]/10 px-2 py-0.5 text-xs font-semibold text-[#0063d1] dark:bg-[#4d9fff]/15 dark:text-[#8fbeff]">{t("flightOut")}</span>
                  <span className="text-[15px] font-bold tabular-nums text-[var(--text)]">DEMO 101</span>
                  <span className="text-sm tabular-nums text-[var(--text)]">{formatDateLabel("2027-01-15")}</span>
                  <span className="text-sm text-[var(--dim)]">{activeLang === "zh" ? "多伦多 → 目的地 · 09:00 起飞 · 座位 12A · 靠窗" : "Toronto → Destination City · departs 09:00 · Seat 12A · window"}</span>
                </li>
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="shrink-0 rounded-[6px] bg-[#0077fa]/10 px-2 py-0.5 text-xs font-semibold text-[#0063d1] dark:bg-[#4d9fff]/15 dark:text-[#8fbeff]">{t("flightBack")}</span>
                  <span className="text-[15px] font-bold tabular-nums text-[var(--text)]">DEMO 102</span>
                  <span className="text-sm tabular-nums text-[var(--text)]">{formatDateLabel("2027-03-01")}</span>
                  <span className="text-sm text-[var(--dim)]">{activeLang === "zh" ? "座位 12F · 靠窗" : "Seat 12F · window"}</span>
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-[var(--border)] pt-2.5">
                <span className="shrink-0 rounded-[6px] bg-[#00b578]/10 px-2 py-0.5 text-xs font-medium text-[#00754b] dark:text-[#5ee0a8]">{t("seatWatchTag")}</span>
                <span className="text-[13px] text-[var(--dim)]">{t("seatWatchNote")} · {t("seatsHeldFree")}</span>
                <span className="ml-auto shrink-0 text-[13px] tabular-nums text-[var(--dim)]">
                  {t("flightBookingRef")}：DEMO01
                </span>
              </div>
            </section>

            {/* 关键日期条（v1.9.0）：出发前带硬日期的清尾节点，徽章口径
                与到期清单一致（DeadlineChip）。日期为定稿静态信息。 */}
            <section aria-label={t("hardDatesTitle")} className={`${CARD_CLASS} mt-3`}>
              <SectionHeading icon={<SectionTile kind="deadlines" />}>{t("hardDatesTitle")}</SectionHeading>
              <ul className="divide-y divide-[var(--border)]">
                {[
                  { label: t("hardMatrix"), date: "2027-01-11" },
                  { label: t("hardWsib"), date: "2027-01-14" },
                  { label: t("hardDepart"), date: "2027-01-15" },
                  { label: t("hardReturn"), date: "2027-03-01" },
                ].map((row) => (
                  <li key={`${row.date}-${row.label}`} className="flex items-center gap-2 py-[5px]">
                    <span className="w-[86px] shrink-0 text-xs font-semibold tabular-nums text-[var(--text)]">
                      {formatDateLabel(row.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">{row.label}</span>
                    <span className="flex w-[84px] shrink-0 items-center justify-end">
                      <DeadlineChip left={daysUntil(row.date)} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 目的地当地天气（回国目的地）+ 未来一周预报 */}
            {weatherQuery.data?.destination ? (
              <div className={`${CARD_CLASS} mt-3`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text)]"><WeatherGlyph />{t("destination")}</span>
                  <span className="text-sm tabular-nums text-[var(--text)]"><span className="text-base font-bold">{fmtTemp(weatherQuery.data.destination.temperature)}</span> {activeLang === "zh" ? wxZh(weatherQuery.data.destination.description) : weatherQuery.data.destination.description}</span>
                  {weatherQuery.data.destination.high !== null || weatherQuery.data.destination.low !== null ? <span className="text-[13px] tabular-nums text-[var(--dim)]">{t("wxHigh")} {fmtTemp(weatherQuery.data.destination.high)} · {t("wxLow")} {fmtTemp(weatherQuery.data.destination.low)}</span> : null}
                  {weatherQuery.data.destination.feelsLike !== null ? <span className="text-[13px] text-[var(--dim)]">{t("feelsLike")} {fmtTemp(weatherQuery.data.destination.feelsLike)}</span> : null}
                  {weatherQuery.data.destination.humidity !== null ? <span className="text-[13px] text-[var(--dim)]">{t("humidityLabel")} {Math.round(weatherQuery.data.destination.humidity)}%</span> : null}
                  {weatherQuery.data.destination.wind ? <span className="text-[13px] text-[var(--dim)]">{t("windLabel")} {weatherQuery.data.destination.wind}</span> : null}
                  {aqiText(weatherQuery.data.destination) ? <span className="text-[13px] text-[var(--dim)]">{aqiText(weatherQuery.data.destination)}</span> : null}
                  {uvText(weatherQuery.data.destination) ? <span className="text-[13px] text-[var(--dim)]">{uvText(weatherQuery.data.destination)}</span> : null}
                  {fmtSunTime(weatherQuery.data.destination.sunrise) || fmtSunTime(weatherQuery.data.destination.sunset) ? <span className="text-[13px] tabular-nums text-[var(--dim)]">{t("sunriseLabel")} {fmtSunTime(weatherQuery.data.destination.sunrise) ?? "—"} · {t("sunsetLabel")} {fmtSunTime(weatherQuery.data.destination.sunset) ?? "—"}</span> : null}
                  {tomorrowLine(weatherQuery.data.destination) ? <span className="text-[13px] text-[var(--dim)]">{t("tomorrow")}：{tomorrowLine(weatherQuery.data.destination)}</span> : null}
                  {weatherQuery.data.destination.stale ? <span className="text-[13px] text-[var(--dim)]">{t("staleData")}</span> : null}
                  {weatherQuery.data.destination.alerts.length > 0 ? <span className="text-[13px] font-medium text-[#a15e00] dark:text-[#ffc65c]">⚠ {weatherQuery.data.destination.alerts.join("；")}</span> : null}
                </div>
                {weatherQuery.data.destination.forecast.length > 0 ? (
                  <div className="mt-2.5 border-t border-[var(--border)] pt-2.5">
                    <p className="text-[13px] font-semibold text-[var(--text)]">{t("destination")} · {t("forecastWeek")}</p>
                    <ul className="mt-1.5 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4 lg:grid-cols-7" aria-label={`${t("destination")} ${t("forecastWeek")}`}>
                      {weatherQuery.data.destination.forecast.slice(0, 7).map((day, idx) => {
                        const label = forecastDayLabel(day.date, idx);
                        return (
                          <li key={`${day.date ?? "day"}-${idx}`} className="min-w-0 rounded-[8px] bg-[var(--fill)] px-2 py-2 text-center">
                            <p className="truncate text-xs font-medium text-[var(--dim)]">{label.weekday}{label.md ? ` ${label.md}` : ""}</p>
                            <p className="mt-0.5 truncate text-[13px] font-medium text-[var(--text)]" title={day.summary ?? undefined}>{forecastCondition(day.summary) ?? "—"}</p>
                            <p className="mt-0.5 text-[13px] tabular-nums text-[var(--text)]">{day.low !== null ? `${Math.round(day.low)}°` : "—"}<span className="text-[var(--dim)]"> / </span>{day.high !== null ? `${Math.round(day.high)}°` : "—"}</p>
                            {day.precipitationChance !== null ? <p className="text-[11px] tabular-nums text-[var(--dim)]">{t("precip")} {Math.round(day.precipitationChance)}%</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={`${CARD_CLASS} mt-3 text-[13px] text-[var(--dim)]`}>{weatherQuery.isPending ? t("destinationLoading") : t("destinationUnavailable")}</div>
            )}

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
                    className="h-8 shrink-0 rounded-[6px] bg-[var(--accent)] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] active:scale-[0.98] motion-reduce:transition-none"
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
                  className="mb-2 rounded-lg border border-[#d92d20] px-3 py-2 text-sm text-[#d92d20] dark:text-[#ff9d97]"
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
                <ChinaChecklistGroups
                  items={data.china}
                  pendingId={
                    chinaToggleMutation.isPending
                      ? chinaToggleMutation.variables?.id
                      : undefined
                  }
                  onToggle={(id, done) => chinaToggleMutation.mutate({ id, done })}
                />
              )}
            </section>

            <footer className="mt-2 border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : page === "history" ? (
          <>
            <PageTabs page={page} chinaCount={data.china.length} jasonCount={data.jasonOpen.length} onChange={setPage} />

            <div className={`${CARD_CLASS} mt-3 flex flex-wrap items-center gap-x-3 gap-y-1`}>
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <SvgIcon color="var(--accent)" size={16} className="shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </SvgIcon>
                {t("historyTitle")}
              </span>
              <span className="text-sm text-[var(--dim)]">
                {activeLang === "zh" ? "最近 7 天 · 按天归档" : "Last 7 days · grouped by day"}
              </span>
            </div>

            <DoneHistoryPage groups={buildDoneGroups(data.doneToday, data.doneHistory)} />

            <footer className="mt-2 border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : page === "jason" ? (
          <>
            <PageTabs page={page} chinaCount={data.china.length} jasonCount={data.jasonOpen.length} onChange={setPage} />
            <JasonPage open={data.jasonOpen} cleared={data.jasonCleared} />
            <footer className="mt-2 border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : page === "cfo" ? (
          <>
            <PageTabs page={page} chinaCount={data.china.length} jasonCount={data.jasonOpen.length} onChange={setPage} />
            <CfoPage items={data.money} />
            <footer className="mt-2 border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : page === "growth" ? (
          <>
            <PageTabs page={page} chinaCount={data.china.length} jasonCount={data.jasonOpen.length} onChange={setPage} />
            <GrowthPage items={data.growth} />
            <footer className="mt-2 border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : (
          <>
        <PageTabs page={page} chinaCount={data.china.length} jasonCount={data.jasonOpen.length} onChange={setPage} />
        {/* Tina 状态行 + 快捷入口 */}
        <TinaPulseStrip tinaStatus={data.tinaStatus} />

        {/* 双城速览：回国倒计时 + 双城当前天气 + 温差 + 目的地明日 +
            目的地空气，一条扫完（v1.8.1 起顶栏右上也恢复双城天气，两处
            并存、以顶栏为准；天气细节在悬停提示和第 3 页目的地卡里看） */}
        <DualCityStrip toronto={weatherQuery.data?.weather ?? null} destination={weatherQuery.data?.destination ?? null} weatherPending={weatherQuery.isPending} onRetryWeather={() => void weatherQuery.refetch()} onOpenChina={() => setPage("china")} />

        {/* Spotify 正在播放 + 播放控制 */}
        <SpotifyStrip
          state={spotifyQuery.data?.spotify}
          pending={spotifyQuery.isPending}
          controlPending={spotifyControlMutation.isPending}
          onControl={(args) => spotifyControlMutation.mutate(args)}
          onRetry={() => void spotifyQuery.refetch()}
        />

        {/* 1. 待 Mark 拍板 — 有条目时是永远置顶的强调卡。v1.8.2：为空时
            「暂无待拍板」空条整条不渲染、拍板区直接不出现；仅当有一条
            可撤销的最近拍板时，留一条只含 最近拍板 + 撤销 的细行。 */}
        {data.decisions.length > 0 ? (
        <section aria-label={t("decisionsTitle")} className="mt-2 [@media(max-height:949px)]:mt-1.5">
          <div className="rounded-[10px] border border-[var(--accent)] bg-[var(--surface)] p-4 shadow-[0_0_0_1px_var(--accent),0_4px_14px_rgba(28,31,35,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-[var(--text)]">
                <SectionTile kind="decisions" />
                {t("decisionsTitle")}
              </h2>
              <span className="rounded-[6px] bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white">
                {activeLang === "zh"
                  ? `${data.decisions.length} 件待拍板`
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
        </section>
        ) : lastVerdict && !lastVerdictStillListed ? (
        <div className="mt-2 flex flex-wrap items-center px-1 [@media(max-height:949px)]:mt-1.5">
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
        </div>
        ) : null}

        {/* 今日已完成 — 瘦身摘要行，点进第 4 页看 7 天归档 */}
        <DoneTodayStrip count={data.doneToday.length} onOpen={() => setPage("history")} />

        {/* 宽屏三列：今日时间线 | 到期 | Lane（等高一排，副屏一屏放下） */}
        <div className="mt-3 grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0 [@media(max-height:949px)]:mt-1.5 [@media(max-height:949px)]:gap-1.5">
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
                  // Third state: a blocked item is neither pending nor
                  // done — it never takes the past ✓ / dimmed treatment
                  // (so it never reads as completed) and never counts
                  // as the next-up item.
                  const blocked = item.status === "blocked";
                  const minutes = row.minutes;
                  const past =
                    !blocked &&
                    !active &&
                    minutes !== null &&
                    minutes >= 0 &&
                    minutes < nowMinutes;
                  const isNext = row.key === nextKey && !active && !blocked;
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
                          blocked
                            ? "z-10 h-2 w-2 shrink-0 rounded-full bg-[#ff9d0a] ring-4 ring-[var(--surface)]"
                            : active
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
                          <span className="shrink-0 rounded-[6px] bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-medium text-white">
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
              className="mt-3 w-full rounded-[6px] bg-[var(--fill)] px-3 py-2 text-sm font-medium text-[var(--dim)] transition hover:text-[var(--text)]"
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
                className="h-8 shrink-0 rounded-[6px] bg-[var(--accent)] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] active:scale-[0.98] motion-reduce:transition-none"
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
              className="mb-2 rounded-lg border border-[#d92d20] px-3 py-2 text-sm text-[#d92d20] dark:text-[#ff9d97]"
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
                    <span className="ml-2 rounded-[6px] bg-[var(--fill)] px-1.5 py-0.5 text-xs font-normal text-[var(--dim)]">
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
            OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
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
              href="https://github.com/marksong0917"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 transition-colors hover:text-[var(--text)] hover:decoration-[var(--accent)]"
            >
              GitHub
            </a>
            {" · "}
            <a
              href="https://marksong0917.github.io/typebook-zh/"
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
