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
    refresh: "刷新",
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
    weatherUnavailable: "天气暂时取不到",
    destinationLoading: "目的地天气加载中…",
    destinationUnavailable: "目的地天气暂时取不到",
    fxUnavailable: "汇率暂时取不到",
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
    approved: "已通过",
    rejected: "已否决",
    torontoTimeParen: "（多伦多时间）",
    yes: "是",
    no: "否",
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
    done: "完成",
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
    recheck: "重新检测",
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
    themeAria: "显示模式",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    langAria: "语言 / Language",
    envStripLabel: "环境信息：天气 · 汇率 · Spotify",
    spotifyLabel: "Spotify",
    spotifyLoading: "Spotify 加载中…",
    spotifyUnavailable: "Spotify 暂时取不到",
    spotifyNotConnected: "Spotify 未连接",
    spotifyIdle: "现在没在播放",
    spotifyPlayingOn: "播放中",
    spotifyPausedOn: "已暂停",
    playLabel: "播放",
    pauseLabel: "暂停",
    navAria: "主导航",
    railTodayPage: "今天 · 工作台",
    progTitle: "程序",
    progLoading: "程序状态加载中…",
    progUnavailable: "程序状态暂时取不到",
    progGroupCompany: "公司",
    progGroupPersonal: "个人",
    progGroupDevices: "设备",
    progGroupFolded: "折叠区",
    jasonBucketLong: "拖了 14 天以上",
    jasonBucketWeek: "拖了 7–13 天",
    jasonBucketFresh: "7 天以内",
    progRunning: "在跑",
    progDown: "不在",
    progUnverified: "未核验",
    progVerifiedAt: "核验",
    progStale: "核验过期",
    progDetailShow: "展开记录",
    progDetailHide: "收起记录",
    progPending: "已登记 · 待执行",
    progStart: "启动",
    progStop: "停止",
    progRestart: "重启",
    progRunNow: "立即运行",
    progDeviceRestart: "重启设备",
    progAutostart: "默认自启",
    progAutostartAria: "代理组默认自启开关",
    progAuditTitle: "审计流水",
    progAuditEmpty: "还没有控制请求记录。",
    progConfirmTitle: "先喊话，再执行",
    progConfirmBody:
      "执行前需在游戏内喊话公告，让在线玩家有准备。确认已喊话后再登记请求 — 登记后由 Tina 经 SSH 执行并回写结果。",
    progConfirmGo: "已喊话，登记请求",
    progConfirmCancel: "再等等",
    progRequestFailed: "请求没登记成功，再试一次。",
    statusGoChina: "查看回国页",
    expandDay: "展开",
    collapseDay: "收起",
  },
  en: {
    loading: "Loading…",
    loadFailed: "Board failed to load",
    retry: "Retry",
    boardTitle: "OpsDeck",
    refresh: "Refresh",
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
    weatherUnavailable: "Weather unavailable",
    destinationLoading: "Loading Destination City weather…",
    destinationUnavailable: "Destination City weather unavailable",
    fxUnavailable: "FX unavailable",
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
    approved: "Approved",
    rejected: "Rejected",
    torontoTimeParen: "(Toronto time)",
    yes: "Yes",
    no: "No",
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
    done: "Done",
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
    recheck: "Re-check",
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
    themeAria: "Display theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    langAria: "语言 / Language",
    envStripLabel: "At a glance: weather · FX · Spotify",
    spotifyLabel: "Spotify",
    spotifyLoading: "Loading Spotify…",
    spotifyUnavailable: "Spotify unavailable right now",
    spotifyNotConnected: "Spotify not connected",
    spotifyIdle: "Nothing playing right now",
    spotifyPlayingOn: "Playing",
    spotifyPausedOn: "Paused",
    playLabel: "Play",
    pauseLabel: "Pause",
    navAria: "Main navigation",
    railTodayPage: "Today · Workbench",
    progTitle: "Programs",
    progLoading: "Loading program states…",
    progUnavailable: "Program states unavailable right now",
    progGroupCompany: "Company",
    progGroupPersonal: "Personal",
    progGroupDevices: "Devices",
    progGroupFolded: "Folded away",
    jasonBucketLong: "Waiting 14+ days",
    jasonBucketWeek: "Waiting 7–13 days",
    jasonBucketFresh: "Under 7 days",
    progRunning: "Running",
    progDown: "Not running",
    progUnverified: "Not verified yet",
    progVerifiedAt: "Verified",
    progStale: "Verification stale",
    progDetailShow: "Show records",
    progDetailHide: "Hide records",
    progPending: "Registered · awaiting execution",
    progStart: "Start",
    progStop: "Stop",
    progRestart: "Restart",
    progRunNow: "Run now",
    progDeviceRestart: "Restart device",
    progAutostart: "Start by default",
    progAutostartAria: "Proxy group start-by-default switch",
    progAuditTitle: "Audit trail",
    progAuditEmpty: "No control requests recorded yet.",
    progConfirmTitle: "Announce first, then execute",
    progConfirmBody:
      "Announce in-game before executing, so players online get a warning. Register the request only after the announcement — Tina then executes over SSH and reports the result back.",
    progConfirmGo: "Announced — register request",
    progConfirmCancel: "Not yet",
    progRequestFailed: "Couldn't register the request — try again.",
    statusGoChina: "View the China page",
    expandDay: "Expand",
    collapseDay: "Collapse",
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
 * China-trip countdown to 2027-01-15 / return 2027-03-01, Toronto↔Destination City
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
 * prop and the per-tab page-number labels.
 * v1.9.1 = CFO page retired (Mark: "CFO 页没啥用、我也不太看、收款也
 * 不是我做"): the CFO tab and its client page (CfoPage / MoneyTable /
 * amount helpers / cfo strings / cfo tile) are removed and the daily
 * tab group is back to 今天 / 待拍板 / 状态. Display only — the money
 * data pipeline stays dormant server-side, untouched: the items
 * "money" section, getBoard's money array, and the generic
 * addItem/updateItem/closeItem feed path all remain for future reuse
 * elsewhere. Every other page and the done write-back chain are
 * byte-identical.
 * v1.9.2 = money rows gain a real numeric `amount` field (QB-room
 * finding: addItem/updateItem accepted an amount argument but
 * getBoard never returned one, because no such column existed).
 * Migration 0010 adds `items.amount` (real, nullable); addItem /
 * updateItem accept it and getBoard's item shape returns it for
 * every section (null outside money). The QB room backfills existing
 * money rows' amounts from the ledger in one pass. No page changes —
 * the CFO page stays retired; this is data plumbing only.
 * v2.0 = design overhaul + 程序区 (Mark, 2026-11-13): navigation moves
 * into a Semi-style left rail (grouped 日常/专题/记录 with one icon
 * set; at phone width the rail collapses to ONE horizontally
 * scrollable tab row — never wraps, no hamburger); the header keeps
 * only the brand + key status chips (pending-decision count, follow-up
 * count, overall status) + refresh + prefs — weather / FX / Spotify
 * move off the header and the today page's first screen into info
 * cards on the status page (same getWeather / getFx / getSpotify /
 * spotifyControl actions, display only). One icon language board-wide:
 * inline SVG line icons + CSS status dots; the framework's emoji and
 * ad-hoc glyphs (💱 ⚠ ↻ ✓/✗ in labels, ●, text chevrons) are gone —
 * item data text itself is untouched. The status page gains the 程序
 * (programs) section: a registry hard-coded in server code per Mark's
 * classification — 🔴 readonly rows render NO buttons at all, 🟢
 * always-on rows get restart (or 立即运行) and never a stop, 🟡 rows
 * get start/stop + restart, devices get restart only (cloud server / TV-123 /
 * Redmi status-only), Mir2 stop/restart and Surface restart pass an
 * in-game-announcement confirmation first. Buttons only REGISTER a
 * control request (requestProgramControl); Tina's lane executes over
 * SSH and reportProgramResult writes the verified state back — the UI
 * shows 已登记 · 待执行 meanwhile and never pretends a state changed
 * before the report lands. The proxy group's 默认自启 switch rides
 * the same request/report path. All prior red lines hold: the done
 * write-back chain, today-page behaviors, jason feed conventions, the
 * dormant money pipeline, the growth Founding seed, china items,
 * getStatus probes, and every section key are unchanged.
 * v2.1 = polish pass (Mark: "消息不要重复出现，keep it consistent and
 * clean" + "compact — dead space 太多"): (1) ONE HOME PER DATUM — the
 * deadlines list lives ONLY on the status page now (today page keeps
 * a one-line link row with the count + nearest item); the trip strip
 * on page 1 is a single line (label + days + link) and the china page
 * is the trip's only home; weather / FX / Spotify render only on the
 * status page (the header keeps just the dataless status chip that
 * links there); the china page's ad-hoc Destination City weather strip is
 * replaced by the shared WeatherCardLine so Destination City renders in
 * exactly one shape (its 7-day forecast grid stays — it exists
 * nowhere else). (2) Status page order: status cards → 程序 →
 * deadlines → weather/FX/Spotify at the bottom. (3) History page:
 * day groups fold shut by default (date + count + one-line summary),
 * expanded days are calm plain rows — the green chip wall is gone.
 * (4) Consistency: ONE SectionHeading (mb on the spacing scale), ONE
 * badge spec (BADGE_CLASS) for every chip, program group subheads
 * unified. (5) COMPACT: one spacing scale in theme.css (--space-*)
 * applied board-wide via CARD_CLASS and the stack/gap utilities; the
 * page-1 three-column grid no longer equal-height-stretches its cards
 * (items-start, no h-full) so card height hugs content. Data, action
 * contracts and program-button behavior are untouched.
 * v2.2 = page-scope reshuffle + conclusions-only status page +
 * weather phrases in Chinese (Mark, 2026-11-13, three rulings in one
 * review): (1) PAGE SCOPE SETTLED — the status page now holds ONLY
 * the site/server status cards and the programs section; the
 * deadlines card, weather card, FX card and Spotify card are REMOVED
 * from it entirely (no folds, no link rows). Deadlines' only home is
 * the today page again: the near-14-day list is restored as a FULL
 * inline list (the v2.1 one-line link row is reverted — Mark's
 * glance habit beats one-home purity; this is a settled keeper,
 * never dedupe it away) with the 14天后 subsection under it, so no
 * deadline renders anywhere else. Weather / FX / Spotify return to
 * the today page as ONE slim bottom strip (EnvStrip: both cities'
 * condition + temperature · the CAD→CNY rate · Spotify state with a
 * play/pause entry — one line tall, no big cards). The china page's
 * full Destination City weather card is untouched. The hero jump fallback
 * now only needs the today page. (2) PROGRAMS, CONCLUSIONS ONLY —
 * each row's face is just name + status dot/word + its allowed
 * buttons: verification timestamps, evidence text, row notes and the
 * bottom 审计流水 wall are off the face; a row's chevron expands its
 * detail (note + evidence + verified-at + that program's audit
 * entries from the same getPrograms payload). Rows that are down,
 * unverified or stale (verified > 24 h ago) are anomalies: they sort
 * to the top of their group and render expanded by default with the
 * reason + time showing. Groups are the four Mark named — 状态只读
 * (readonly + info), 必须常开 (always), 可按需开关 (proxy + toggle +
 * foxshare; the proxy 默认自启 switch rides in this group's header),
 * 设备 (device + status-only devices) — each collapsible via its
 * header, with a summary on the header (「N/N 正常」 when all is
 * well, the anomaly count otherwise); collapsing hides only normal
 * rows — group headers and anomaly rows always stay visible. Groups
 * start expanded, as before. Registry, categories, allowed actions,
 * the request/report mechanism and all server data are unchanged.
 * (3) WEATHER CHINESE — wxZh is now a small system, not a phrase
 * list: an exact-phrase table (63 entries) + condition nouns (24) +
 * intensity modifiers (11) composed by pattern rules (time-of-day
 * suffixes, AM/PM prefixes, "X possible / likely / expected",
 * "Chance of X", "in the vicinity", "X with Y", "X and Y", slash
 * combos, "Periods of X", modifier+noun composition), so sentences
 * like "Showers possible in the afternoon" render whole as
 * 「下午可能有阵雨」. Unknown phrases fall back to the raw source
 * text — never blank. One function serves every condition render
 * point: the today strip, the china page (current line + 7-day
 * forecast grid). Data fetching, caches and action contracts are
 * untouched — this is render-layer only.
 * v2.3 = subtraction audit + grouping/layout restructure + visual
 * alignment to the today page (Mark, 2026-11-13, four-step car):
 * (1) SUBTRACTION — the three site-body program rows (the websites'
 * own status already has its home in the 网站状态 card directly
 * above) leave the programs face, and the third-party hosted shell
 * (closet-studio, hosted by us, so protected from hard removal by
 * the ops red line) plus those site rows move into a collapsed
 * 折叠区 group at the end of the programs section; the today-page
 * footer drops its four outward profile links (portfolio / GitHub /
 * Typebook / FoxShare — not board content). Registry, control
 * chain, state/audit data and every action contract are untouched —
 * this is face-level only, reversible on Mark's word. (2) GROUPS +
 * LAYOUT — the programs section regroups from the four v2.2
 * category groups into 公司 (Newood/Foxuma ops: fleet infra, Hub,
 * Ollama, Drive mirrors, backup, Paperless…) and 个人 (Mir2, proxy
 * nodes, FoxShare, personal tools…) cards, each program in exactly
 * one group by primary use; 设备 stays its own group; the 折叠区
 * is a fourth. Group headers keep the v2.2 summary caliber
 * (「N/N 正常」 / anomaly count, anomalies pinned + visible when
 * collapsed); the proxy 默认自启 switch now rides in the 个人
 * card's header (the proxy nodes live there). The 待拍板 page
 * splits its one long list into drag-age bucket cards (14 天以上 /
 * 7–13 天 / 7 天以内) laid out in the today page's card grid — the
 * buckets are contiguous slices of the same age-sorted list, so
 * content, order, drag badges and the ledger mirror are unchanged.
 * LAYOUT LAW, board-wide: every page is a 2–3 column card grid at
 * desktop width and stacks at 390px — growth's three cards and the
 * history day cards join grids, the china page pairs its flight /
 * key-dates cards, the status page keeps its status cards side by
 * side above the program group cards. The phone nav rail is now a
 * 3×2 grid instead of a horizontal scroll row (the v2.2 audit's
 * 573px-in-390px overflow advisory is closed — nothing scrolls
 * sideways). (3) VISUALS — the other pages align to the today page
 * (Mark's benchmark: card ratio, density, timeline rhythm): one
 * card spec, one spacing scale, transition duration/easing now set
 * once via the Tailwind default-transition tokens (200 ms,
 * ease-out curve, per the UI/UX handbook §2.5); the today page's
 * own skeleton is untouched. The baseline extracted from this board
 * lives in ~/workspace/newood-ops/semi-baseline/ and is the single
 * source for future Semi passes.
 *
 * v2.3.1 = shell shrink (Mark, 2026-11-13, on the v2.3 today page):
 * the nav shell drops one size — rail 240px → 208px, desktop nav
 * rows 40px → 36px at 13px type, phone grid rows 36px → 32px (the
 * board's own 32px tap floor in theme.css — never below), count
 * badges stay 11px so nothing gets harder to read; the top bar
 * loses vertical padding (12/8px → 8/6px) and the hero count drops
 * one type step (30px → 24px), so the header sits ~10px shorter
 * and the reclaimed width/height goes to the content column.
 * Active/hover feedback, the 3×2 phone grid and the no-sideways-
 * scroll rule are unchanged; no data, action or feed is touched.
 * The final shell numbers are written into the Semi baseline
 * (semi-baseline/layout-rules.md 「壳/导航」 + components.md 导航轨).
 * Same release, Mark's correction: the three website-body program
 * rows (site-main / site-shop / site-blog) are
 * removed from PROGRAM_REGISTRY entirely (41 → 38) — folded or not,
 * they duplicated the 网站状态 card; website status lives only in
 * that card now. Closet Studio stays alone in the 折叠区 (1/1);
 * the site rows' stored state/audit history is kept, unlisted. */
const BOARD_VERSION = "v2.3.1";

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

type SectionKind = "decisions" | "today" | "deadlines" | "lanes" | "sites" | "servers" | "china" | "jason" | "growth" | "programs" | "history" | "weather" | "fx";

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
  if (kind === "growth") {
    // Trending-up arrow: the growth page.
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </SvgIcon>
    );
  }
  if (kind === "programs") {
    // Terminal window: the 程序 (programs) section.
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <polyline points="7 9 10 12 7 15" />
        <line x1="13" x2="17" y1="15" y2="15" />
      </SvgIcon>
    );
  }
  if (kind === "history") {
    // Clock with a rewind arrow: the done-history archive.
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </SvgIcon>
    );
  }
  if (kind === "weather") {
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </SvgIcon>
    );
  }
  if (kind === "fx") {
    // Coins / exchange: the FX info card.
    return (
      <SvgIcon color={c} size={s} className="shrink-0">
        <circle cx="8" cy="8" r="6" />
        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
        <path d="M7 6h1v4" />
        <path d="m16.71 13.88.7.71-2.82 2.82" />
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
  growth: { bg: "rgba(0,119,250,0.10)", fg: "#0077fa" },
  programs: { bg: "rgba(0,165,255,0.10)", fg: "#00a5ff" },
  history: { bg: "rgba(0,181,120,0.10)", fg: "#00a870" },
  weather: { bg: "rgba(245,185,66,0.14)", fg: "#d9930d" },
  fx: { bg: "rgba(0,168,112,0.10)", fg: "#00a870" },
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
  "rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-[var(--space-card-x)] py-[var(--space-card-y)] shadow-[0_0_1px_rgba(28,31,35,0.07),0_4px_14px_rgba(28,31,35,0.05)] [@media(max-height:949px)]:py-[var(--space-card-y-dense)]";

/** THE badge spec (v2.1 consistency pass): every chip on the board —
 * status pills, deadline chips, drag counters, pending markers, count
 * badges — is this exact box; only the color classes vary. */
const BADGE_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-xs";

/** Shared small line icons (v2.0: one icon language board-wide — these
 * replace the framework's old text glyphs ✓ ▾ ▸ › → ↻ in buttons and
 * chips; item data text is never touched). */
function CheckIcon({ size, color, className }: { size?: number; color?: string; className?: string }) {
  return (
    <SvgIcon color={color ?? "currentColor"} size={size ?? 14} className={className ?? "shrink-0"}>
      <polyline points="20 6 9 17 4 12" />
    </SvgIcon>
  );
}

function ChevronDownIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <SvgIcon size={size ?? 14} className={className ?? "shrink-0"}>
      <polyline points="6 9 12 15 18 9" />
    </SvgIcon>
  );
}

function ChevronRightIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <SvgIcon size={size ?? 16} className={className ?? "shrink-0"}>
      <polyline points="9 18 15 12 9 6" />
    </SvgIcon>
  );
}

function ArrowRightIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <SvgIcon size={size ?? 14} className={className ?? "shrink-0"}>
      <line x1="5" x2="19" y1="12" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </SvgIcon>
  );
}

function RefreshIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <SvgIcon size={size ?? 14} className={className ?? "shrink-0"}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </SvgIcon>
  );
}

/** Nav rail glyphs — the same line-icon set as the section tiles,
 * keyed by page. Status uses an activity pulse; today a calendar. */
function NavIcon({ page, size }: { page: BoardPage; size?: number }) {
  const s = size ?? 17;
  if (page === "main") {
    return (
      <SvgIcon size={s} className="shrink-0">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </SvgIcon>
    );
  }
  if (page === "jason") {
    return (
      <SvgIcon size={s} className="shrink-0">
        <path d="M5 22h14" />
        <path d="M5 2h14" />
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
        <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
      </SvgIcon>
    );
  }
  if (page === "more") {
    return (
      <SvgIcon size={s} className="shrink-0">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </SvgIcon>
    );
  }
  if (page === "growth") {
    return (
      <SvgIcon size={s} className="shrink-0">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </SvgIcon>
    );
  }
  if (page === "china") {
    return (
      <SvgIcon size={s} className="shrink-0">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </SvgIcon>
    );
  }
  return (
    <SvgIcon size={s} className="shrink-0">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </SvgIcon>
  );
}

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

function WeatherGlyph() {
  return (
    <SvgIcon color="#f5b942" size={15} className="shrink-0">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </SvgIcon>
  );
}

type Weather = ApiResponse<typeof api, "getWeather">["weather"];

/** 天气状况中文化（v2.2）— 纯展示层翻译，数据源与缓存一律不动。
 * 这是一套小体系，不是一张短语清单：整句表 WX_EXACT（63 条，键为
 * 小写）先行；未命中时按句式规则拆解 — 时段后缀（in the morning /
 * afternoon / evening…）、AM/PM 前缀、概率句式（X possible /
 * X likely / X expected / Chance of X）、in the vicinity — 剩下的
 * 状况核心交给 wxCore：斜杠与 and 组合逐段译、"X with Y" 译为
 * 「X伴Y」、"Periods of X" 译为「时有X」，最后按 修饰词 + 状况
 * 词根 组合（WX_MOD 11 条 × WX_NOUN 24 条）。任何一环译不出就
 * 整句回退原文，绝不显示空白或半截译文。 */

/** Whole-phrase table (keys lowercase): sky / sun / cloud states and
 * fixed collocations that composition would render awkwardly. */
const WX_EXACT: Record<string, string> = {
  fair: "晴",
  sunny: "晴",
  "a few clouds": "少量云",
  clear: "晴",
  "clear sky": "晴",
  "sunny skies": "晴",
  sunshine: "晴",
  "plenty of sun": "晴",
  "plenty of sunshine": "阳光充足",
  "abundant sunshine": "阳光充足",
  "mostly clear": "晴朗",
  "mainly clear": "晴",
  "mainly sunny": "以晴为主",
  "mostly sunny": "晴间多云",
  "partly sunny": "晴间多云",
  "more sun than clouds": "晴间多云",
  "mix of sun and clouds": "晴间多云",
  "times of sun and clouds": "晴间多云",
  "clouds and sun": "晴间多云",
  "partly cloudy": "多云间晴",
  "mostly cloudy": "多云",
  cloudy: "多云",
  "cloudy skies": "多云",
  "considerable cloudiness": "多云",
  "more clouds than sun": "多云为主",
  "increasing clouds": "云量增多",
  "decreasing clouds": "云量减少",
  clearing: "转晴",
  "becoming cloudy": "转多云",
  overcast: "阴",
  rain: "雨",
  "light rain": "小雨",
  "heavy rain": "大雨",
  showers: "阵雨",
  "rain showers": "阵雨",
  "pm showers": "午后阵雨",
  drizzle: "毛毛雨",
  "light drizzle": "毛毛雨",
  snow: "雪",
  "light snow": "小雪",
  "heavy snow": "大雪",
  "snow showers": "阵雪",
  flurries: "小雪",
  "blowing snow": "风雪",
  sleet: "雨夹雪",
  "wintry mix": "雨夹雪",
  "rain and snow": "雨夹雪",
  "freezing rain": "冻雨",
  "freezing drizzle": "冻毛毛雨",
  hail: "冰雹",
  thunderstorm: "雷阵雨",
  thunderstorms: "雷阵雨",
  fog: "雾",
  mist: "薄雾",
  haze: "霾",
  smoke: "烟雾",
  wind: "有风",
  windy: "大风",
  breezy: "微风",
  humid: "潮湿",
  "sunny/wind": "晴·有风",
  "snow showers in the morning": "上午阵雪",
  "showers in the vicinity": "附近阵雨",
};

/** Condition roots: the noun a phrase is built around. */
const WX_NOUN: Record<string, string> = {
  shower: "阵雨",
  showers: "阵雨",
  rain: "雨",
  drizzle: "毛毛雨",
  thunderstorm: "雷阵雨",
  thunderstorms: "雷阵雨",
  thunder: "雷电",
  snow: "雪",
  flurries: "小雪",
  sleet: "雨夹雪",
  hail: "冰雹",
  fog: "雾",
  mist: "薄雾",
  haze: "霾",
  smoke: "烟雾",
  dust: "扬尘",
  sun: "晴",
  sunshine: "晴",
  cloud: "多云",
  clouds: "多云",
  cloudiness: "多云",
  wind: "有风",
  breeze: "微风",
  squalls: "飑风",
};

/** Intensity / distribution modifiers that prefix a condition root. */
const WX_MOD: Record<string, string> = {
  light: "小",
  heavy: "大",
  moderate: "中",
  scattered: "分散",
  isolated: "局地",
  occasional: "偶有",
  brief: "短时",
  patchy: "局部",
  widespread: "大范围",
  intermittent: "间歇",
  frequent: "频繁",
};

/** Translate one condition core (already lowercased, no time or
 * probability fragments left in it). Returns null when any part is
 * unknown, so the caller can fall back to the raw sentence. */
function wxCore(phrase: string): string | null {
  const exact = WX_EXACT[phrase];
  if (exact) return exact;
  if (phrase.includes("/")) {
    const out: string[] = [];
    for (const part of phrase.split("/")) {
      const hit = wxCore(part.trim());
      if (!hit) return null;
      out.push(hit);
    }
    return out.join("·");
  }
  const withIdx = phrase.indexOf(" with ");
  if (withIdx > 0) {
    const main = wxCore(phrase.slice(0, withIdx).trim());
    const sub = wxCore(phrase.slice(withIdx + " with ".length).trim());
    if (main && sub) return `${main}伴${sub}`;
    return null;
  }
  if (phrase.includes(" and ")) {
    const out: string[] = [];
    for (const part of phrase.split(" and ")) {
      const hit = wxCore(part.trim());
      if (!hit) return null;
      out.push(hit);
    }
    return out.join("·");
  }
  const periods = /^periods of (.+)$/.exec(phrase);
  if (periods?.[1]) {
    const hit = wxCore(periods[1]);
    return hit ? `时有${hit}` : null;
  }
  const allWords = phrase.split(/\s+/).filter(Boolean);
  // A leading bare time word composes as 「下午有…」 around whatever
  // the rest of the core translates to.
  const leadTime = allWords.length >= 2 ? WX_TIME_WORD[allWords[0] ?? ""] : undefined;
  const words = leadTime ? allWords.slice(1) : allWords;
  const lastWord = words[words.length - 1];
  let composed: string | null = null;
  if (words.length >= 2 && lastWord) {
    // The core may be a two-word exact entry ("rain showers",
    // "snow showers") with modifiers in front of it, or a single
    // noun root as the last word.
    const tailZh = WX_EXACT[`${words[words.length - 2]} ${lastWord}`];
    const noun = tailZh ?? WX_NOUN[lastWord];
    if (noun) {
      const mods = tailZh ? words.slice(0, -2) : words.slice(0, -1);
      let modZh = "";
      let ok = true;
      for (const w of mods) {
        const mod = WX_MOD[w];
        if (!mod) {
          ok = false;
          break;
        }
        modZh += mod;
      }
      if (ok) composed = `${modZh}${noun}`;
    }
  }
  if (!composed && words.length === 1) {
    composed = WX_EXACT[words[0] ?? ""] ?? WX_NOUN[words[0] ?? ""] ?? null;
  }
  if (!composed) return null;
  return leadTime ? `${leadTime}有${composed}` : composed;
}

/** Bare time words that can lead a condition core ("Afternoon rain",
 * "Morning snow showers") — composed as 「下午有雨」. */
const WX_TIME_WORD: Record<string, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};

/** Time-of-day suffixes the source appends to condition sentences. */
const WX_TIME_SUFFIX: { re: RegExp; zh: string }[] = [
  { re: /\s+early$/, zh: "清晨" },
  { re: /\s+in the early morning$/, zh: "清晨" },
  { re: /\s+in the late afternoon$/, zh: "傍晚" },
  { re: /\s+in the morning$/, zh: "上午" },
  { re: /\s+in the afternoon$/, zh: "下午" },
  { re: /\s+in the evening$/, zh: "晚上" },
  { re: /\s+in the night$/, zh: "夜间" },
  { re: /\s+this morning$/, zh: "今晨" },
  { re: /\s+this afternoon$/, zh: "今天下午" },
  { re: /\s+this evening$/, zh: "今晚" },
  { re: /\s+tonight$/, zh: "今晚" },
  { re: /\s+overnight$/, zh: "夜间" },
  { re: /\s+at night$/, zh: "夜间" },
];

/**
 * Chinese label for an English weather condition phrase — the ONE
 * translation entry point for every condition the board renders
 * (today-page strip, china-page current line + 7-day forecast grid).
 * Sentence patterns compose around the translated core (e.g.
 * "Showers possible in the afternoon" → 「下午可能有阵雨」);
 * anything the system cannot fully translate stays raw.
 */
function wxZh(description: string): string {
  const raw = description.trim().replace(/\.$/, "");
  if (!raw) return description;
  let work = raw.toLowerCase().replace(/\s+/g, " ");
  const exact = WX_EXACT[work];
  if (exact) return exact;
  let timeZh = "";
  for (const { re, zh } of WX_TIME_SUFFIX) {
    if (re.test(work)) {
      timeZh = zh;
      work = work.replace(re, "");
      break;
    }
  }
  const ampm = /^(am|pm)\s+(.+)$/.exec(work);
  if (ampm?.[2]) {
    timeZh = ampm[1] === "am" ? "上午" : "下午";
    work = ampm[2];
  }
  let vicinity = false;
  if (work.endsWith(" in the vicinity")) {
    vicinity = true;
    work = work.slice(0, work.length - " in the vicinity".length);
  }
  let probZh = "";
  const chance = /^(?:a\s+)?chance of\s+(.+)$/.exec(work);
  if (chance?.[1]) {
    probZh = "可能有";
    work = chance[1];
  } else if (work.endsWith(" possible")) {
    probZh = "可能有";
    work = work.slice(0, work.length - " possible".length);
  } else if (work.endsWith(" likely")) {
    probZh = "大概率有";
    work = work.slice(0, work.length - " likely".length);
  } else if (work.endsWith(" expected")) {
    probZh = "预计有";
    work = work.slice(0, work.length - " expected".length);
  }
  const few = /^a few\s+(.+)$/.exec(work);
  if (few?.[1]) {
    const core = wxCore(few[1]);
    return core ? `${timeZh}少量${core}` : description;
  }
  const core = wxCore(work.trim());
  if (!core) return description;
  // A core that already carries 有 (「下午有雨」「有风」) drops the
  // probability wrapper's own 有 — 可能有下午有雨 becomes 可能下午有雨.
  const prob = probZh.endsWith("有") && core.includes("有")
    ? probZh.slice(0, -1)
    : probZh;
  if (vicinity) return `附近${prob}${core}`;
  return `${timeZh}${prob}${core}`;
}

function fmtTemp(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}°`;
}

/** One city's weather as the fuller summary line (the v1.7.2 shape):
 * temp + condition + high/low + tomorrow's low–high range + humidity,
 * all visible — nothing essential is left to the tooltip (weatherTitle
 * still adds feels-like / precip / wind / sunrise / sunset on hover). */
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
    w.alerts.length > 0 ? w.alerts.join("；") : null,
  ];
  return parts.filter((p): p is string => p !== null).join(" · ");
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

/** One weather line inside the status page's weather card (v2.0 —
 * weather moved here from the header): glyph + city label + the fuller
 * summary. Loading / unavailable states keep the same one-line
 * footprint, with a retry affordance when data failed. */
function WeatherCardLine({
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
        <span className="text-[13px] text-[var(--dim)]">{loadingText}</span>
      );
    return (
      <span className="text-[13px] text-[var(--dim)]">
        {unavailableText}
        <button
          type="button"
          onClick={onRetry}
          aria-label={t("retry")}
          className="ml-2 font-medium text-[var(--text)] underline underline-offset-2"
        >
          {t("retry")}
        </button>
      </span>
    );
  }
  return (
    <span
      className="flex min-w-0 items-start gap-1.5 text-[13px] leading-relaxed tabular-nums text-[var(--dim)]"
      title={weatherTitle(w)}
    >
      <span className="mt-[1px] flex shrink-0">
        <WeatherGlyph />
      </span>
      <span className="min-w-0">
        <span className="font-medium text-[var(--text)]">{label}</span>{" "}
        {headerWeatherSummary(w)}
      </span>
    </span>
  );
}

type Fx = ApiResponse<typeof api, "getFx">["fx"];

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

/** Page-1 trip countdown strip (v2.1 dedup): the china page is the
 * trip's only home, so page 1 keeps the minimum — ONE line: the
 * label, the days count (still the visual anchor), and a link into
 * the china page. The flight dates no longer repeat here; they live
 * on the china page's flight card and key-dates strip. The whole
 * strip is the button. */
function TripCountdownStrip({ onOpenChina }: { onOpenChina: () => void }) {
  const todayKey = torontoTodayKey(new Date());
  const trip = tripCountdown(todayKey);
  return (
    <button
      type="button"
      onClick={onOpenChina}
      aria-label={t("page3")}
      className={`${CARD_CLASS} group mt-2 flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left transition hover:border-[var(--accent)] [@media(max-height:949px)]:mt-1.5`}
    >
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text)]">
        <SvgIcon color="#f53f3f" size={14} className="shrink-0"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></SvgIcon>
        {t("tripCountdownTitle")}
      </span>
      {trip.days !== null ? (
        <span className="flex items-baseline gap-1.5 text-[13px] text-[var(--dim)]">
          {trip.label}
          <span className="text-[22px] font-extrabold leading-none tracking-tight text-[var(--accent)]">
            {trip.days}
          </span>
          <span className="font-semibold text-[var(--text)]">{t("daysUnit")}</span>
        </span>
      ) : (
        <span className="text-[13px] text-[var(--dim)]">{trip.label}</span>
      )}
      <span className="ml-auto flex shrink-0 items-center gap-1 text-[13px] font-medium text-[var(--accent)]">
        {t("statusGoChina")}
        <span aria-hidden="true" className="flex text-[var(--dim)] transition group-hover:text-[var(--accent)]">
          <ChevronRightIcon size={16} />
        </span>
      </span>
    </button>
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
 * linking to the History page where the full 7-day archive lives. */
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
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)]">
          {activeLang === "zh"
            ? `今日已完成 ${count} 件`
            : `${count} done today`}
          <ArrowRightIcon size={13} />
          {activeLang === "zh" ? "历史页" : "History"}
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

/** History day groups: today's live list first (still unarchived), then
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

/** History page (v2.1 density pass): read-only archive of
 * completions, grouped by day — each day FOLDS shut by default and
 * shows only its date, its count, and a one-line summary (the day's
 * first entries). Expanding a day reveals calm plain rows; the old
 * full-width wall of green check chips is gone. */
function DoneHistoryPage({ groups }: { groups: DoneGroup[] }) {
  const [openDays, setOpenDays] = useState<ReadonlySet<string>>(new Set());
  if (groups.length === 0) {
    return (
      <section aria-label={t("historyTitle")} className={`${CARD_CLASS} mt-[var(--space-stack)]`}>
        <EmptyLine text={t("historyEmpty")} />
      </section>
    );
  }
  const toggleDay = (date: string) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  return (
    // v2.3 layout law: day cards join a 2–3 column grid (stacked at
    // 390px) instead of one vertical column of full-width cards.
    <div className="mt-[var(--space-stack)] grid items-start gap-[var(--space-gap)] md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
      {groups.map((group) => {
        const open = openDays.has(group.date);
        const label = historyGroupLabel(group.date);
        return (
          <section
            key={group.date}
            aria-label={`${label} · ${group.date}`}
            className={CARD_CLASS}
          >
            <button
              type="button"
              onClick={() => toggleDay(group.date)}
              aria-expanded={open}
              aria-label={`${open ? t("collapseDay") : t("expandDay")}：${label}`}
              className="flex w-full items-center gap-2.5 text-left"
            >
              <span
                aria-hidden="true"
                className={`flex shrink-0 text-[var(--dim)] transition-transform ${open ? "rotate-90" : ""}`}
              >
                <ChevronRightIcon size={15} />
              </span>
              <h3 className="shrink-0 text-[15px] font-semibold tracking-tight text-[var(--text)]">
                {label}
              </h3>
              <span className="shrink-0 text-xs tabular-nums text-[var(--dim)]">
                {group.items.length} {t("historyItemsUnit")}
              </span>
              {!open ? (
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--dim)]">
                  {group.items.slice(0, 2).join(" · ")}
                  {group.items.length > 2 ? " · …" : ""}
                </span>
              ) : null}
            </button>
            {open ? (
              <ul className="mt-1 divide-y divide-[var(--border)]">
                {group.items.map((entry, i) => (
                  <li
                    key={`${group.date}-${i}-${entry}`}
                    className="flex items-start gap-2 py-[var(--space-row-y)] text-sm leading-relaxed text-[var(--text)]"
                  >
                    <span aria-hidden="true" className="mt-[3px] flex shrink-0 text-[#00b578]">
                      <CheckIcon size={13} />
                    </span>
                    <span className="min-w-0">{entry}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
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
 * 今天页底部 slim 环境条 (v2.2): ONE line holding the three ambient
 * items — weather (both cities: condition via wxZh + temperature) ·
 * the CAD→CNY rate · Spotify state with a play/pause entry button.
 * The status page no longer renders any of the three (page scope
 * settled in v2.2); this strip is their only render point board-wide
 * besides the china page's full Destination City card. Deliberately one row
 * tall: segments truncate instead of wrapping.
 */
function EnvStrip({
  weather,
  destination,
  fx,
  spotify,
  spotifyPending,
  controlPending,
  onSpotifyControl,
}: {
  weather: Weather;
  destination: Weather;
  fx: Fx;
  spotify: SpotifyState | undefined;
  spotifyPending: boolean;
  controlPending: boolean;
  onSpotifyControl: (args: {
    command: "pause" | "resume" | "skip" | "previous" | "setVolume";
    volumePercent: number | null;
    deviceId: string | null;
  }) => void;
}) {
  const divider = (
    <span aria-hidden="true" className="h-4 w-px shrink-0 bg-[var(--border)]" />
  );
  const citySegment = (label: string, w: Weather) =>
    w ? (
      <span>
        <span className="font-medium text-[var(--text)]">{label}</span>{" "}
        {fmtTemp(w.temperature)}{" "}
        {activeLang === "zh" ? wxZh(w.description) : w.description}
      </span>
    ) : null;
  const toronto = citySegment(t("weatherToday"), weather);
  const destinationSeg = citySegment(t("weatherDestination"), destination);
  return (
    <div
      aria-label={t("envStripLabel")}
      className="mt-[var(--space-stack)] flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[13px] tabular-nums text-[var(--dim)]"
    >
      {/* The weather glyph yields its width at phone size so the
          line's fixed costs (FX value, Spotify button) always fit. */}
      <span className="flex shrink-0 items-center gap-1.5 max-sm:hidden">
        <WeatherGlyph />
      </span>
      {toronto || destinationSeg ? (
        // One truncating text run: at phone width the second city
        // ellipsizes first so the FX value and the Spotify button
        // always stay reachable on the same line.
        <span className="min-w-0 truncate">
          {toronto}
          {toronto && destinationSeg ? (
            <span aria-hidden="true"> · </span>
          ) : null}
          {destinationSeg}
        </span>
      ) : (
        <span className="shrink-0">{t("weatherUnavailable")}</span>
      )}
      {divider}
      <span className="shrink-0 whitespace-nowrap">
        {fx ? (
          <>
            <span className="font-medium text-[var(--text)]">
              {activeLang === "zh"
                ? `1 加币 ≈ ¥${fx.rate.toFixed(2)}`
                : `1 CAD ≈ ¥${fx.rate.toFixed(2)}`}
            </span>
            {fx.stale ? ` · ${t("staleData")}` : ""}
          </>
        ) : (
          t("fxUnavailable")
        )}
      </span>
      {divider}
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <SpotifyGlyph />
        {spotify === undefined && spotifyPending ? (
          <span className="shrink-0">{t("spotifyLoading")}</span>
        ) : !spotify ? (
          <span className="shrink-0">{t("spotifyUnavailable")}</span>
        ) : !spotify.connected ? (
          <span className="shrink-0">{t("spotifyNotConnected")}</span>
        ) : spotify.trackName ? (
          <>
            <span
              aria-hidden="true"
              className={
                spotify.isPlaying
                  ? "h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#1db954] motion-reduce:animate-none"
                  : "h-2 w-2 shrink-0 rounded-full bg-[var(--dim)]"
              }
            />
            <span className="min-w-0 truncate text-[var(--text)]">
              <span className="font-medium">{spotify.trackName}</span>
              {spotify.artistName ? (
                <span className="text-[var(--dim)]"> · {spotify.artistName}</span>
              ) : null}
            </span>
            <button
              type="button"
              disabled={controlPending}
              onClick={() =>
                onSpotifyControl({
                  command: spotify.isPlaying ? "pause" : "resume",
                  volumePercent: null,
                  deviceId: null,
                })
              }
              aria-label={spotify.isPlaying ? t("pauseLabel") : t("playLabel")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1db954] text-white shadow-sm transition hover:brightness-110 active:scale-95 motion-reduce:transition-none disabled:opacity-40"
            >
              {spotify.isPlaying ? (
                <SvgIcon size={15} className="shrink-0">
                  <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
                  <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
                </SvgIcon>
              ) : (
                <SvgIcon size={15} className="shrink-0">
                  <polygon points="7 4 20 12 7 20 7 4" fill="currentColor" stroke="none" />
                </SvgIcon>
              )}
            </button>
          </>
        ) : (
          <span className="min-w-0 truncate">{t("spotifyIdle")}</span>
        )}
      </span>
    </div>
  );
}

type ProgramsData = ApiResponse<typeof api, "getPrograms">;
type ProgramEntry = ProgramsData["programs"][number];
type ProgramActionName = "start" | "stop" | "restart" | "run" | "autostart-toggle";

/** 程序区 (v2.0, status page). The registry + allowed controls come
 * from the server (hard-coded there per Mark's classification); this
 * component only renders what the category allows:
 *   readonly / info / device-status — NO buttons are rendered at all;
 *   always — restart only (or 立即运行 for scheduled tasks), never stop;
 *   proxy — restart, plus the group-level 默认自启 switch;
 *   toggle / foxshare — start / stop / restart;
 *   device — restart only, never power-off.
 * A press only REGISTERS a request (requestProgramControl): while a
 * request is pending the row shows 已登记 · 待执行 and the verified
 * state stays exactly as last reported — nothing pretends to have
 * happened until reportProgramResult writes the outcome back. */
/** v2.2: the four groups Mark named. Server categories fold in
 * without changing any row's allowed controls: info rows render no
 * buttons just like readonly ones, so they share 状态只读； the proxy
 * pair is switched on demand like the toggles, so it shares
 * 可按需开关 (its group-level 默认自启 switch rides in that group's
 * header). */
/** v2.3 program grouping (Mark's ruling): the section splits by WHO
 * the program serves, not by control category — 公司 (Newood /
 * Foxuma operations) and 个人 (personal kit), each program in
 * exactly one group by primary use, never listed twice; 设备 is not
 * a program and keeps its own group. Rows keep registry order inside
 * a group; categories still drive each row's buttons, unchanged.
 * A fourth 折叠区 group holds the v2.3 subtraction audit's folded
 * row: the third-party hosted shell (ours to run, not ours to
 * show off — the ops red line protects hosted services from hard
 * removal, so it folds instead). The fold starts collapsed; the
 * registry, states and audit data behind the row are untouched,
 * so unfolding is all it takes to see it again. (v2.3.1: the three
 * website-body rows that shared this fold in v2.3 are REMOVED from
 * the registry outright — Mark ruled folding still duplicated the
 * 网站状态 card; website status now lives only in that card.
 * Their stored program_state / program_audit rows stay in the DB
 * as history, simply unlisted.) */
const PROG_COMPANY_IDS: readonly string[] = [
  // Fleet infra (readonly): the pipes every company service rides on.
  "tailscale", "sshd", "frps", "frpc", "cloudflared-mini", "derper",
  "caddy", "teamviewer",
  // Always-on company services: Hub, Fox's brain, Drive mirrors,
  // backup sync, Docker engines, monitoring.
  "hub", "ollama-mini", "ollama-office", "gdrive-mini",
  "hub-backup-sync", "docker-mini", "docker-office", "uptime-kuma",
  // Info: the office server Ollama supervisor.
  "ollama-supervisor",
  // On-demand company services.
  "paperless", "hub-standby", "docker-desktop-mini",
  "docker-desktop-office", "gdrive-redmi",
];
const PROG_PERSONAL_IDS: readonly string[] = [
  // Mir nightly backup rides with the game it protects.
  "mir-backup",
  // The proxy pair (the 默认自启 switch rides in this group's header).
  "proxy-cloud", "proxy-mini",
  // FoxShare (personal file sharing across Mark's own machines).
  "foxshare",
  // Personal tools + the Mir2 server itself.
  "open-webui", "stirling-pdf", "wechat-redmi", "douyin-redmi", "mir2",
];
const PROG_FOLDED_IDS: readonly string[] = [
  "closet-studio",
];
type ProgGroupDef = {
  titleKey: StrKey;
  ids?: readonly string[];
  categories?: ProgramEntry["category"][];
  startCollapsed?: boolean;
  proxySwitch?: boolean;
};
const PROG_GROUPS: ProgGroupDef[] = [
  { titleKey: "progGroupCompany", ids: PROG_COMPANY_IDS },
  { titleKey: "progGroupPersonal", ids: PROG_PERSONAL_IDS, proxySwitch: true },
  { titleKey: "progGroupDevices", categories: ["device", "device-status"] },
  { titleKey: "progGroupFolded", ids: PROG_FOLDED_IDS, startCollapsed: true },
];

/** A verified state older than this renders as 核验过期 (stale) —
 * the board would rather show an honest old check than imply the
 * program was just confirmed. */
const PROG_STALE_MS = 24 * 60 * 60 * 1000;

type ProgAnomaly = "down" | "unverified" | "stale";

/** Why a row is NOT a quiet normal row, or null when it is one.
 * Anomalies surface on the group face (sorted first, detail shown);
 * normal rows show no timestamp, no evidence, no audit text. */
function programAnomaly(program: ProgramEntry, now: number): ProgAnomaly | null {
  if (!program.state) return "unverified";
  if (program.state.status === "down") return "down";
  if (
    program.state.verifiedAt &&
    now - new Date(program.state.verifiedAt).getTime() > PROG_STALE_MS
  ) {
    return "stale";
  }
  return null;
}

function programActionText(action: string): string {
  if (activeLang === "en") {
    switch (action) {
      case "start": return "Start";
      case "stop": return "Stop";
      case "restart": return "Restart";
      case "run": return "Run now";
      case "autostart-toggle": return "Default-start setting";
      default: return "Verify";
    }
  }
  switch (action) {
    case "start": return "启动";
    case "stop": return "停止";
    case "restart": return "重启";
    case "run": return "立即运行";
    case "autostart-toggle": return "默认自启设置";
    default: return "核验";
  }
}

function ProgramStateLine({ program }: { program: ProgramEntry }) {
  if (program.pending) {
    return (
      <span className={`${BADGE_CLASS} bg-[#ff9d0a]/15 font-medium text-[#a15e00] dark:text-[#ffc65c]`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9d0a] motion-reduce:animate-none" />
        {t("progPending")} · {programActionText(program.pending.action)}
      </span>
    );
  }
  if (!program.state) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--dim)]">
        <span aria-hidden="true" className="h-2 w-2 rounded-full border border-[var(--dim)]" />
        {t("progUnverified")}
      </span>
    );
  }
  // v2.2 conclusions only: dot + word. The verified-at instant moved
  // into the row's expanded detail (and shows by default only when
  // the row is an anomaly).
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--dim)]">
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${program.state.status === "up" ? "bg-[#00b578]" : "bg-[#f53f3f]"}`}
      />
      <span className={program.state.status === "up" ? "font-semibold text-[#00915f] dark:text-[#5ee0a8]" : "font-semibold text-[#d92d20] dark:text-[#ff9d97]"}>
        {program.state.status === "up" ? t("progRunning") : t("progDown")}
      </span>
    </span>
  );
}

function ProgramRowView({
  program,
  anomaly,
  audit,
  busy,
  onRequest,
}: {
  program: ProgramEntry;
  anomaly: ProgAnomaly | null;
  audit: ProgramsData["audit"];
  busy: boolean;
  onRequest: (program: ProgramEntry, action: ProgramActionName) => void;
}) {
  const name = activeLang === "zh" ? program.name : program.nameEn;
  const note = activeLang === "zh" ? program.note : program.noteEn;
  // v2.2: detail (note / evidence / verified-at / audit entries) sits
  // behind the row's chevron. Anomaly rows start expanded — the
  // reason surfaces without a tap — and Mark can still fold them.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const expanded = toggled ?? anomaly !== null;
  const entries = audit.filter((entry) => entry.programId === program.id);
  const btnCls =
    "h-8 shrink-0 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--fill)] active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50";
  const primaryBtnCls =
    "h-8 shrink-0 rounded-[6px] bg-[var(--accent)] px-3 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50";
  const showButtons =
    !program.pending &&
    (program.category === "always" ||
      program.category === "proxy" ||
      program.category === "toggle" ||
      program.category === "foxshare" ||
      program.category === "device");
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-sm font-medium leading-snug text-[var(--text)]">
            {name}
            <span className="ml-2 text-xs font-normal text-[var(--dim)]">{program.device}</span>
          </p>
        </div>
        <ProgramStateLine program={program} />
        {showButtons ? (
          <span className="flex shrink-0 items-center gap-1.5">
            {program.category === "always" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRequest(program, program.runLabel ? "run" : "restart")}
                aria-label={`${program.runLabel ? t("progRunNow") : t("progRestart")}：${name}`}
                className={primaryBtnCls}
              >
                {program.runLabel ? t("progRunNow") : t("progRestart")}
              </button>
            ) : null}
            {program.category === "proxy" || program.category === "device" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRequest(program, "restart")}
                aria-label={`${t("progRestart")}：${name}`}
                className={btnCls}
              >
                {program.category === "device" ? t("progDeviceRestart") : t("progRestart")}
              </button>
            ) : null}
            {program.category === "toggle" || program.category === "foxshare" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRequest(program, "start")}
                  aria-label={`${t("progStart")}：${name}`}
                  className={btnCls}
                >
                  {t("progStart")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRequest(program, "stop")}
                  aria-label={`${t("progStop")}：${name}`}
                  className={btnCls}
                >
                  {t("progStop")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRequest(program, "restart")}
                  aria-label={`${t("progRestart")}：${name}`}
                  className={btnCls}
                >
                  {t("progRestart")}
                </button>
              </>
            ) : null}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setToggled(!expanded)}
          aria-expanded={expanded}
          aria-label={`${expanded ? t("progDetailHide") : t("progDetailShow")}：${name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[var(--dim)] transition hover:bg-[var(--fill)] hover:text-[var(--text)]"
        >
          <span
            aria-hidden="true"
            className={`flex transition-transform ${expanded ? "rotate-180" : ""} motion-reduce:transition-none`}
          >
            <ChevronDownIcon size={15} />
          </span>
        </button>
      </div>
      {expanded ? (
        <div className="mt-1.5 border-t border-dashed border-[var(--border)] pt-1.5">
          {note ? (
            <p className="text-xs leading-snug text-[var(--dim)]">{note}</p>
          ) : null}
          {program.state ? (
            <p className="mt-0.5 text-xs leading-snug text-[var(--dim)]">
              {anomaly === "down" ? (
                <span className="font-semibold text-[#d92d20] dark:text-[#ff9d97]">
                  {t("progDown")} ·{" "}
                </span>
              ) : null}
              {anomaly === "stale" ? (
                <span className="font-semibold text-[#a15e00] dark:text-[#ffc65c]">
                  {t("progStale")} ·{" "}
                </span>
              ) : null}
              {program.state.evidence ? `${program.state.evidence} · ` : ""}
              {program.state.verifiedAt
                ? `${t("progVerifiedAt")} ${formatStampToronto(program.state.verifiedAt)}`
                : t("progUnverified")}
            </p>
          ) : null}
          {program.pending ? (
            <p className="mt-0.5 text-xs leading-snug text-[var(--dim)]">
              {t("progPending")} · {programActionText(program.pending.action)} ·{" "}
              {formatStampToronto(program.pending.requestedAt)}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs font-semibold text-[var(--text)]">
            {t("progAuditTitle")}
          </p>
          {entries.length === 0 ? (
            <p className="mt-0.5 text-xs leading-snug text-[var(--dim)]">
              {t("progAuditEmpty")}
            </p>
          ) : (
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline gap-x-2 text-xs leading-relaxed text-[var(--dim)]"
                >
                  <span className="shrink-0 tabular-nums">
                    {formatStampToronto(entry.at)}
                  </span>
                  <span className="min-w-0">{entry.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}

function ProgramsSection() {
  const queryClient = useQueryClient();
  const programsQuery = useQuery({
    queryKey: ["programs"],
    queryFn: () => api.getPrograms({}),
    refetchInterval: 60_000,
  });
  const [confirmFor, setConfirmFor] = useState<{
    program: ProgramEntry;
    action: ProgramActionName;
  } | null>(null);
  // v2.3: groups marked startCollapsed (the 折叠区) begin folded;
  // every other group starts expanded, as before.
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<StrKey>>(
    () =>
      new Set(
        PROG_GROUPS.filter((g) => g.startCollapsed).map((g) => g.titleKey),
      ),
  );
  const [requestError, setRequestError] = useState(false);
  const requestMutation = useMutation({
    mutationFn: async (args: { programId: string; action: ProgramActionName }) =>
      await api.requestProgramControl(args),
    onMutate: () => setRequestError(false),
    onSuccess: (result) => {
      if (!result.ok) setRequestError(true);
    },
    onError: () => setRequestError(true),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
  const data = programsQuery.data;
  const handleRequest = (program: ProgramEntry, action: ProgramActionName) => {
    // Mir2 stop/restart and the Surface device restart pass the
    // in-game-announcement confirmation step first — no request is
    // filed until Mark confirms the announcement was made.
    if (program.confirm && (action === "stop" || action === "restart")) {
      setConfirmFor({ program, action });
      return;
    }
    requestMutation.mutate({ programId: program.id, action });
  };
  const proxyPending = data?.proxyPending ?? null;
  return (
    <section aria-label={t("progTitle")} className="mt-[var(--space-stack)] min-w-0">
      {/* v2.3: the section is a heading + a grid of group cards —
          公司 / 个人 side by side at desktop width, 设备 and the
          折叠区 under them; the status cards above keep their own
          side-by-side grid, so the page never becomes one long list. */}
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text)]">
        <SectionTile kind="programs" />
        {t("progTitle")}
      </h2>
      {requestError ? (
        <p role="alert" className="mt-2 rounded-lg border border-[#d92d20] px-3 py-2 text-sm text-[#d92d20] dark:text-[#ff9d97]">
          {t("progRequestFailed")}
        </p>
      ) : null}
      {programsQuery.isPending && !data ? (
        <div className={`${CARD_CLASS} mt-[var(--space-stack)]`}>
          <p className="py-3 text-sm text-[var(--dim)]">{t("progLoading")}</p>
        </div>
      ) : !data ? (
        <div className={`${CARD_CLASS} mt-[var(--space-stack)]`}>
          <p className="py-3 text-sm text-[var(--dim)]">
            {t("progUnavailable")}
            <button
              type="button"
              onClick={() => void programsQuery.refetch()}
              className="ml-2 font-medium text-[var(--text)] underline underline-offset-2"
            >
              {t("retry")}
            </button>
          </p>
        </div>
      ) : (
        <div className="mt-[var(--space-stack)] grid items-start gap-[var(--space-gap)] xl:grid-cols-2 [&>*]:min-w-0">
          {PROG_GROUPS.map((group) => {
            const rows = data.programs.filter((p) =>
              group.ids !== undefined
                ? group.ids.includes(p.id)
                : (group.categories ?? []).includes(p.category),
            );
            if (rows.length === 0) return null;
            // v2.2 header caliber, kept: anomalies (down / unverified
            // / stale) sort to the top of the group and stay visible
            // even when the group is collapsed; the header carries
            // the group's verdict — 「N/N 正常」 when all is well,
            // the anomaly count when it is not.
            const now = Date.now();
            const anomalyOf = new Map(
              rows.map((p) => [p.id, programAnomaly(p, now)] as const),
            );
            const anomalies = rows.filter((p) => anomalyOf.get(p.id) !== null);
            const ordered = [
              ...anomalies,
              ...rows.filter((p) => anomalyOf.get(p.id) === null),
            ];
            const collapsed = collapsedGroups.has(group.titleKey);
            const visible = collapsed ? anomalies : ordered;
            const groupTitle = t(group.titleKey);
            return (
              <section key={group.titleKey} aria-label={groupTitle} className={CARD_CLASS}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.titleKey)) next.delete(group.titleKey);
                        else next.add(group.titleKey);
                        return next;
                      })
                    }
                    aria-expanded={!collapsed}
                    aria-label={`${groupTitle} · ${collapsed ? t("progDetailShow") : t("progDetailHide")}`}
                    className="flex min-w-0 items-center gap-1.5 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex shrink-0 text-[var(--dim)] transition-transform ${collapsed ? "-rotate-90" : ""} motion-reduce:transition-none`}
                    >
                      <ChevronDownIcon size={13} />
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--text)]">
                      {groupTitle}
                    </span>
                    {anomalies.length === 0 ? (
                      <span className="text-xs tabular-nums text-[var(--dim)]">
                        {activeLang === "zh"
                          ? `${rows.length}/${rows.length} 正常`
                          : `${rows.length}/${rows.length} OK`}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold tabular-nums text-[#d92d20] dark:text-[#ff9d97]">
                        {activeLang === "zh"
                          ? `${anomalies.length} 项异常`
                          : `${anomalies.length} need attention`}
                      </span>
                    )}
                  </button>
                  {group.proxySwitch ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--dim)]">{t("progAutostart")}</span>
                      {proxyPending ? (
                        <span className={`${BADGE_CLASS} bg-[#ff9d0a]/15 font-medium text-[#a15e00] dark:text-[#ffc65c]`}>
                          <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9d0a] motion-reduce:animate-none" />
                          {t("progPending")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={data.proxyAutostart}
                          aria-label={t("progAutostartAria")}
                          disabled={requestMutation.isPending}
                          onClick={() =>
                            requestMutation.mutate({
                              programId: "proxy-group",
                              action: "autostart-toggle",
                            })
                          }
                          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${data.proxyAutostart ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${data.proxyAutostart ? "left-[22px]" : "left-0.5"}`}
                          />
                        </button>
                      )}
                    </span>
                  ) : null}
                </div>
                {visible.length > 0 ? (
                  <ul className="divide-y divide-[var(--border)]">
                    {visible.map((program) => (
                      <ProgramRowView
                        key={program.id}
                        program={program}
                        anomaly={anomalyOf.get(program.id) ?? null}
                        audit={data.audit}
                        busy={requestMutation.isPending}
                        onRequest={handleRequest}
                      />
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
      {confirmFor ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("progConfirmTitle")}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={() => setConfirmFor(null)}
        >
          <div
            className="w-full max-w-md rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_28px_rgba(28,31,35,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--text)]">{t("progConfirmTitle")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--dim)]">
              {(activeLang === "zh" ? confirmFor.program.name : confirmFor.program.nameEn)}
              {" · "}
              {programActionText(confirmFor.action)}
              {" — "}
              {t("progConfirmBody")}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={requestMutation.isPending}
                onClick={() => {
                  requestMutation.mutate({
                    programId: confirmFor.program.id,
                    action: confirmFor.action,
                  });
                  setConfirmFor(null);
                }}
                className="h-10 flex-1 rounded-[6px] bg-[var(--accent)] text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] disabled:opacity-50"
              >
                {t("progConfirmGo")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmFor(null)}
                className="h-10 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--fill)]"
              >
                {t("progConfirmCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
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
    <div className="grid min-w-0 gap-[var(--space-gap)] sm:grid-cols-2">
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

type BoardPage = "main" | "more" | "china" | "history" | "jason" | "growth";

/** Navigation (v2.0, phone face reworked v2.3): a Semi-style left
 * rail. Pages keep their v1.9.0 groups — 日常 (daily): 今天 /
 * 待拍板 / 状态 · 专题 (topics): 增长 / 回国 · 记录 (records):
 * 历史 — each group with a small heading and every tab carrying the
 * board's one line-icon set. At desktop width the rail is a vertical
 * column beside the content; below lg the groups dissolve
 * (display: contents) and the six tabs form a 3×2 grid that fits
 * 390px exactly — the v2.0–v2.2 horizontal scroll row (573px of
 * content in a 390px viewport, flagged by the v2.2 audit) is gone,
 * and no page hides behind a hamburger menu. v2.3.1 sizes: rail
 * 208px wide, rows 36px desktop / 32px phone (the 32px tap floor),
 * 13px type on both faces, count badges unchanged at 11px. */
function RailNav({
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
  // Whenever the page changes — including arrivals via in-page buttons
  // like the countdown strip — slide the selected tab into view so the
  // current page is always visible in the phone-width row.
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
  const groups: { caption: string; tabs: { target: BoardPage; label: string; aria: string; count?: number }[] }[] = [
    {
      caption: t("tabGroupDaily"),
      tabs: [
        { target: "main", label: t("tabToday"), aria: t("railTodayPage") },
        { target: "jason", label: t("tabJason"), aria: t("jasonTitle"), count: jasonCount },
        { target: "more", label: t("tabStatus"), aria: t("statusDetail") },
      ],
    },
    {
      caption: t("tabGroupTopic"),
      tabs: [
        { target: "growth", label: t("tabGrowth"), aria: t("growthTitle") },
        { target: "china", label: t("tabChina"), aria: t("page3"), count: chinaCount },
      ],
    },
    {
      caption: t("tabGroupRecord"),
      tabs: [{ target: "history", label: t("tabHistory"), aria: t("page4") }],
    },
  ];
  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t("navAria")}
      className="grid grid-cols-3 gap-1 px-3 pb-1.5 pt-1.5 lg:flex lg:flex-col lg:items-stretch lg:gap-0 lg:px-0 lg:pb-0 lg:pt-0"
    >
      {groups.map((group, gi) => (
        <div
          key={group.caption}
          className="contents lg:mb-3 lg:flex lg:flex-col lg:items-stretch lg:gap-1"
        >
          <span
            aria-hidden="true"
            className={`hidden shrink-0 select-none whitespace-nowrap px-1 text-[11px] font-semibold tracking-wide text-[var(--dim)] lg:block lg:px-2 lg:pb-1 ${gi > 0 ? "ml-2 lg:ml-0" : ""}`}
          >
            {group.caption}
          </span>
          {group.tabs.map((tab) => {
            const active = page === tab.target;
            return (
              <button
                key={tab.target}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={tab.aria}
                onClick={() => onChange(tab.target)}
                className={
                  active
                    ? "flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] bg-[var(--accent)]/10 px-2.5 text-[13px] font-semibold text-[var(--accent)] transition lg:h-9 lg:justify-start lg:px-2"
                    : "flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 text-[13px] font-medium text-[var(--dim)] transition hover:bg-[var(--fill)] hover:text-[var(--text)] lg:h-9 lg:justify-start lg:px-2"
                }
              >
                <NavIcon page={tab.target} size={16} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? (
                  <span
                    className={
                      active
                        ? "ml-auto rounded-full bg-[var(--accent)] px-1.5 py-px text-[11px] font-semibold tabular-nums text-white"
                        : "ml-auto rounded-full bg-[var(--fill)] px-1.5 py-px text-[11px] font-semibold tabular-nums text-[var(--dim)]"
                    }
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
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
      className="flex scroll-mt-24 items-start gap-3 py-2"
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
 * shared by page 1 (≤14 天） and the status page (>14 天）. Items arrive from the
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
      className={`${BADGE_CLASS} font-medium ${cls}`}
    >
      {status === "进行中" ? (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}
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
    <div className="mb-1.5 flex items-center justify-between gap-3">
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
    <div className="flex flex-col items-center gap-2 py-3 text-center">
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

/** Compact one-row empty state for narrow cards (e.g. the far-deadlines card). */
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
    <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent)]">
      <CheckIcon size={13} />
      {t("approved")}
    </span>
  ) : (
    <span className="font-semibold text-[#d92d20] dark:text-[#ff9d97]">{t("rejected")}</span>
  );
}

function DeadlineChip({ left }: { left: number }) {
  if (left < 0) {
    return (
      <span className={`${BADGE_CLASS} bg-[#f53f3f] font-medium text-white`}>
        {activeLang === "zh" ? `已过期 ${-left} 天` : `${-left} d overdue`}
      </span>
    );
  }
  if (left === 0) {
    // Due today gets its own orange-red badge (v1.8.2) — louder than
    // the ≤3-day amber, distinct from the pure-red overdue chip.
    return (
      <span className={`${BADGE_CLASS} bg-[#fa541c] font-semibold text-white`}>
        {t("dueTodayChip")}
      </span>
    );
  }
  if (left <= 3) {
    return (
      <span className={`${BADGE_CLASS} bg-[#ff9d0a]/15 font-medium text-[#a15e00] dark:text-[#ffc65c]`}>
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
    <div className={`${CARD_CLASS} mt-[var(--space-stack)] flex flex-wrap items-center gap-x-3 gap-y-1`}>
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
 * sorted longest-wait first; a hard date, when the item has one,
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
      <span className={`${BADGE_CLASS} tabular-nums ${cls}`}>
        {t("jasonDragPrefix")} {drag} {t("jasonDragDays")}
      </span>
    );
  };
  // v2.3: the one long list becomes drag-age bucket cards in the
  // today page's card grid. The buckets are contiguous slices of the
  // SAME age-sorted list (≥14d / 7–13d / <7d or undated), so reading
  // the cards left-to-right, top-to-bottom reproduces the old order
  // exactly — content, sort caliber, drag badges and the 1:1 ledger
  // mirror are unchanged; only the layout moved.
  const buckets: { titleKey: StrKey; rows: Item[] }[] = [
    {
      titleKey: "jasonBucketLong",
      rows: ordered.filter((i) => (dragOf(i) ?? -1) >= 14),
    },
    {
      titleKey: "jasonBucketWeek",
      rows: ordered.filter((i) => {
        const d = dragOf(i);
        return d !== null && d >= 7 && d < 14;
      }),
    },
    {
      titleKey: "jasonBucketFresh",
      rows: ordered.filter((i) => {
        const d = dragOf(i);
        return d === null || d < 7;
      }),
    },
  ];
  const renderRow = (item: Item) => {
    const drag = dragOf(item);
    const hard = ISO_DATE_RE.test(item.status.trim())
      ? item.status.trim()
      : null;
    return (
      <li key={item.id} id={`board-item-${item.id}`} className="scroll-mt-24 py-2">
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
  };
  return (
    <>
      <NewPageHeader
        kind="jason"
        title={t("jasonTitle")}
        sub={t("jasonSub")}
        items={[...open, ...cleared]}
      />
      {ordered.length === 0 ? (
        <section aria-label={t("jasonTitle")} className={`${CARD_CLASS} mt-[var(--space-stack)]`}>
          <EmptyLine text={cleared.length > 0 ? t("jasonNoneOpen") : t("jasonEmpty")} />
        </section>
      ) : (
        <div className="mt-[var(--space-stack)] grid items-start gap-[var(--space-gap)] md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {buckets
            .filter((bucket) => bucket.rows.length > 0)
            .map((bucket) => (
              <section
                key={bucket.titleKey}
                aria-label={`${t("jasonTitle")} · ${t(bucket.titleKey)}`}
                className={CARD_CLASS}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-[var(--text)]">
                    {t(bucket.titleKey)}
                  </h3>
                  <span className={`${BADGE_CLASS} bg-[var(--fill)] font-medium tabular-nums text-[var(--dim)]`}>
                    {bucket.rows.length}
                  </span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {bucket.rows.map(renderRow)}
                </ul>
              </section>
            ))}
        </div>
      )}
      <section aria-label={t("jasonClearedTitle")} className={`${CARD_CLASS} mt-[var(--space-stack)]`}>
        <SectionHeading icon={<SectionTile kind="jason" />}>
          {t("jasonClearedTitle")}
        </SectionHeading>
        {cleared.length === 0 ? (
          <EmptyLineCompact text={t("jasonClearedEmpty")} />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {cleared.map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-[5px]">
                <span aria-hidden="true" className="flex shrink-0 text-[#00b578]"><CheckIcon size={14} /></span>
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
        <li key={item.id} id={`board-item-${item.id}`} className="flex scroll-mt-24 items-baseline gap-3 py-1.5">
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
      {/* v2.3 layout law: the three feed cards sit in the today
          page's grid (3 across at desktop, stacked at 390px) instead
          of one vertical stack. */}
      <div className="mt-[var(--space-stack)] grid items-start gap-[var(--space-gap)] md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
      <section aria-label={t("foundingTitle")} className={CARD_CLASS}>
        <SectionHeading icon={<SectionTile kind="growth" />}>{t("foundingTitle")}</SectionHeading>
        {founding.length === 0 ? (
          <EmptyLineCompact text={t("growthEmpty")} />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {founding.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-1.5">
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
      <section aria-label={t("funnelTitle")} className={CARD_CLASS}>
        <SectionHeading icon={<SectionTile kind="growth" />}>{t("funnelTitle")}</SectionHeading>
        {funnel.length === 0 ? <EmptyLineCompact text={t("growthEmpty")} /> : valueRows(funnel)}
      </section>
      <section aria-label={t("outreachTitle")} className={CARD_CLASS}>
        <SectionHeading icon={<SectionTile kind="growth" />}>{t("outreachTitle")}</SectionHeading>
        {outreach.length === 0 ? <EmptyLineCompact text={t("growthEmpty")} /> : valueRows(outreach)}
      </section>
      </div>
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
    <li id={`board-item-${item.id}`} className="scroll-mt-24 py-2.5 first:pt-1 last:pb-0">
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
          <span
            aria-hidden="true"
            className={`flex shrink-0 text-[var(--dim)] transition-transform ${expanded ? "rotate-180" : "-rotate-90"}`}
          >
            <ChevronDownIcon size={13} />
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
    // v2.2: every hero item lives on the today page — deadlines
    // included, near and far (the status page renders no board items
    // at all now) — so the only fallback is today itself, retried as
    // the page renders.
    const attempt = (triesLeft: number) => {
      const el = document.getElementById(`board-item-${id}`);
      if (!el) {
        if (triesLeft > 0) {
          setPage("main");
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
    requestAnimationFrame(() => attempt(3));
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

  // Pagination rule (v2.2): the today page carries ALL deadlines —
  // the near list (due within 14 days, undated ones included) as the
  // main list and anything dated beyond 14 days in the 14 天后
  // subsection under it. The status page renders none of them.
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

      {/* 顶栏 (v2.0)：只留品牌 + 关键状态片 — Hero 计数（待拍板 /
          等跟进）、服务器总状态、更新时间，外加刷新与偏好开关。天气 /
          汇率 / Spotify 已移入状态页的信息卡，不再堆在顶栏。 */}
      <header className="border-b border-[var(--header-border)] bg-[var(--header-bg)] px-4 pb-1.5 pt-safe-or-2 text-[var(--header-text)] sm:px-5 [@media(max-height:949px)]:pb-1">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex shrink-0 items-baseline gap-2">
              <h1 className="text-base font-bold leading-tight tracking-tight text-[var(--header-text)]">
                {t("boardTitle")}
              </h1>
              <span className="shrink-0 text-[11px] font-medium tracking-wide text-[var(--header-dim)]">
                OPS BOARD
              </span>
            </div>

            {/* 中间 Hero：需要 Mark 处理的事，一眼看到（紧凑版）。点开是
                一个下拉浮层，逐件列出被计数的事项，点条目滚动定位。 */}
          <div ref={heroRef} className="relative min-w-0 text-center">
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
                  className="rounded-lg px-2 py-0.5 transition hover:bg-[var(--header-chip)] active:scale-[0.99] motion-reduce:transition-none"
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="flex items-baseline justify-center gap-2 leading-none">
                      <span className="text-2xl font-black tabular-nums text-[var(--header-accent)]">
                        {actionCount}
                      </span>
                      <span className="text-sm font-semibold text-[var(--header-text)]">
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
                      <span aria-hidden="true" className={`flex text-[var(--header-dim)] transition-transform ${heroOpen ? "rotate-180" : ""}`}>
                        <ChevronDownIcon size={13} />
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
                            <span aria-hidden="true" className="flex shrink-0 text-[var(--dim)]">
                              <ArrowRightIcon size={13} />
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
                <span className="text-xl font-black tabular-nums text-[var(--header-text)]">0</span>
                <span className="text-sm font-semibold text-[var(--header-text)]">
                  {activeLang === "zh" ? "样需要你处理" : "items need your call"}
                </span>
                <span className="text-xs text-[var(--header-dim)]">{t("heroNoneNote")}</span>
              </p>
            )}
          </div>
            <div className="ml-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <StatusChip
                data={statusQuery.data}
                pending={statusQuery.isPending}
                checking={statusQuery.isFetching}
                onOpen={() => setPage("more")}
              />
              <span className="hidden text-xs tabular-nums text-[var(--header-dim)] md:inline">
                {t("updatedAt")}{" "}
                {new Intl.DateTimeFormat(uiLocale(), {
                  timeZone: "America/Toronto",
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                }).format(new Date(board.dataUpdatedAt))}
                {t("torontoTimeSuffix")}
              </span>
              <button
                type="button"
                onClick={refreshAll}
                disabled={refreshing}
                aria-label={t("refreshAria")}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] bg-[var(--header-chip)] px-3 text-sm font-medium text-[var(--header-text)] transition hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none disabled:opacity-50"
              >
                <RefreshIcon size={13} />
                {refreshing ? t("refreshing") : t("refresh")}
              </button>
              <PrefsControls
                themeMode={themeMode}
                onTheme={setThemeMode}
                lang={lang}
                onLang={setLang}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row lg:items-start lg:gap-4 lg:px-5">
        <aside className="shrink-0 border-b border-[var(--border)] lg:sticky lg:top-0 lg:w-52 lg:border-b-0 lg:py-2.5">
          <RailNav page={page} chinaCount={data.china.length} jasonCount={data.jasonOpen.length} onChange={setPage} />
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-3 sm:px-5 lg:px-0 lg:py-1">
        {page === "more" ? (
          <>
            {/* 状态页 (v2.2 分工定稿)：只有 网站/服务器状态卡 → 程序
                四组，别无他物 — 到期 / 天气 / 汇率 / Spotify 都在今天页。 */}
            <div className="mt-[var(--space-stack)] flex items-center justify-between gap-3">
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
                className="flex h-10 items-center gap-1.5 rounded-[6px] bg-[var(--accent)] px-4 text-[15px] font-semibold text-white transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] disabled:opacity-50"
              >
                <RefreshIcon size={14} />
                {statusQuery.isFetching ? t("checking") : t("recheck")}
              </button>
            </div>
            <div className="mt-[var(--space-stack)]">
              <StatusCards
                data={statusQuery.data}
                pending={statusQuery.isPending}
                checking={statusQuery.isFetching}
              />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
              {t("statusFootnote")}
            </p>

            {/* 程序区：注册表 + 核验状态 + 控制请求 / 回写（行为不变）。
                v2.3：分组改 公司 / 个人 / 设备 / 折叠区 四张卡（见
                ProgramsSection）；状态页到此为止 — 到期 / 天气 / 汇率 /
                Spotify 的家在今天页（到期完整列表 + 底部 slim 环境条），
                本页零残留（v2.2 分工定稿，继续成立）。 */}
            <ProgramsSection />
          </>
        ) : page === "china" ? (
          <>
            
            {/* 行程信息：静态一行 */}
            <div className={`${CARD_CLASS} mt-[var(--space-stack)] flex flex-wrap items-center gap-x-3 gap-y-1`}>
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <SectionTile kind="china" />
                {t("chinaTitle")}
              </span>
              <span className="text-sm tabular-nums text-[var(--dim)]">{t("chinaTripLine")}</span>
              {data.china.length > 0 ? (
                <span className={`ml-auto ${BADGE_CLASS} bg-[var(--fill)] font-medium tabular-nums text-[var(--dim)]`}>
                  {t("chinaProgress")} {data.china.filter((i) => i.status === "done").length}/{data.china.length}
                </span>
              ) : null}
            </div>

            {/* 航班卡（v1.9.0）：行程定稿信息卡的演示版 — DEMO 101 去程 12A
                靠窗 / DEMO 102 回程 12F 靠窗，座位盯梢开启；航班号、座位与
                订座号均为虚构演示数据。 */}
            {/* v2.3 layout law: 航班 + 关键日期 pair up in a 2-column
                grid at desktop width (stacked at 390px); the weather
                card (its 7-day grid needs the width) and the checklist
                keep full-width cards below. */}
            <div className="mt-[var(--space-stack)] grid items-start gap-[var(--space-gap)] xl:grid-cols-2 [&>*]:min-w-0">
            <section aria-label={t("flightTitle")} className={CARD_CLASS}>
              <SectionHeading icon={<SectionTile kind="china" />}>{t("flightTitle")}</SectionHeading>
              <ul className="divide-y divide-[var(--border)]">
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className={`${BADGE_CLASS} bg-[#0077fa]/10 font-semibold text-[#0063d1] dark:bg-[#4d9fff]/15 dark:text-[#8fbeff]`}>{t("flightOut")}</span>
                  <span className="text-[15px] font-bold tabular-nums text-[var(--text)]">DEMO 101</span>
                  <span className="text-sm tabular-nums text-[var(--text)]">{formatDateLabel("2027-01-15")}</span>
                  <span className="text-sm text-[var(--dim)]">{activeLang === "zh" ? "多伦多 → 目的地 · 09:00 起飞 · 座位 12A · 靠窗" : "Toronto → Destination City · departs 09:00 · Seat 12A · window"}</span>
                </li>
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className={`${BADGE_CLASS} bg-[#0077fa]/10 font-semibold text-[#0063d1] dark:bg-[#4d9fff]/15 dark:text-[#8fbeff]`}>{t("flightBack")}</span>
                  <span className="text-[15px] font-bold tabular-nums text-[var(--text)]">DEMO 102</span>
                  <span className="text-sm tabular-nums text-[var(--text)]">{formatDateLabel("2027-03-01")}</span>
                  <span className="text-sm text-[var(--dim)]">{activeLang === "zh" ? "座位 12F · 靠窗" : "Seat 12F · window"}</span>
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-[var(--border)] pt-2.5">
                <span className={`${BADGE_CLASS} bg-[#00b578]/10 font-medium text-[#00754b] dark:text-[#5ee0a8]`}>{t("seatWatchTag")}</span>
                <span className="text-[13px] text-[var(--dim)]">{t("seatWatchNote")} · {t("seatsHeldFree")}</span>
                <span className="ml-auto shrink-0 text-[13px] tabular-nums text-[var(--dim)]">
                  {t("flightBookingRef")}：DEMO01
                </span>
              </div>
            </section>

            {/* 关键日期条（v1.9.0）：出发前带硬日期的清尾节点，徽章口径
                与到期清单一致（DeadlineChip）。日期为定稿静态信息。 */}
            <section aria-label={t("hardDatesTitle")} className={CARD_CLASS}>
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
            </div>

            {/* 目的地当地天气（v2.1 一致性）：当前天气改用与状态页天气卡
                完全相同的 WeatherCardLine 行式，不再另起一套排版；
                AQI / UV / 日出日落一行小字保留，未来一周预报只在本页有。 */}
            {weatherQuery.data?.destination ? (
              <div className={`${CARD_CLASS} mt-[var(--space-stack)]`}>
                <WeatherCardLine
                  w={weatherQuery.data.destination}
                  label={`${t("weatherDestination")} · 河北`}
                  pending={weatherQuery.isPending}
                  loadingText={t("destinationLoading")}
                  unavailableText={t("destinationUnavailable")}
                  onRetry={() => void weatherQuery.refetch()}
                />
                {aqiText(weatherQuery.data.destination) || uvText(weatherQuery.data.destination) || fmtSunTime(weatherQuery.data.destination.sunrise) || fmtSunTime(weatherQuery.data.destination.sunset) ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {aqiText(weatherQuery.data.destination) ? <span className="text-[13px] text-[var(--dim)]">{aqiText(weatherQuery.data.destination)}</span> : null}
                    {uvText(weatherQuery.data.destination) ? <span className="text-[13px] text-[var(--dim)]">{uvText(weatherQuery.data.destination)}</span> : null}
                    {fmtSunTime(weatherQuery.data.destination.sunrise) || fmtSunTime(weatherQuery.data.destination.sunset) ? <span className="text-[13px] tabular-nums text-[var(--dim)]">{t("sunriseLabel")} {fmtSunTime(weatherQuery.data.destination.sunrise) ?? "—"} · {t("sunsetLabel")} {fmtSunTime(weatherQuery.data.destination.sunset) ?? "—"}</span> : null}
                  </div>
                ) : null}
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
              <div className={`${CARD_CLASS} mt-[var(--space-stack)] text-[13px] text-[var(--dim)]`}>{weatherQuery.isPending ? t("destinationLoading") : t("destinationUnavailable")}</div>
            )}

            {/* 待办清单：勾选完成 / 取消恢复 + 新增 */}
            <section aria-label={t("chinaTitle")} className={`${CARD_CLASS} mt-[var(--space-stack)]`}>
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

            <footer className="mt-[var(--space-stack)] border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : page === "history" ? (
          <>
            
            <div className={`${CARD_CLASS} mt-[var(--space-stack)] flex flex-wrap items-center gap-x-3 gap-y-1`}>
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

            <footer className="mt-[var(--space-stack)] border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : page === "jason" ? (
          <>
                        <JasonPage open={data.jasonOpen} cleared={data.jasonCleared} />
            <footer className="mt-[var(--space-stack)] border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : page === "growth" ? (
          <>
                        <GrowthPage items={data.growth} />
            <footer className="mt-[var(--space-stack)] border-t border-[var(--border)] pt-2 text-center">
              <p className="text-xs text-[var(--dim)]">
                OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
              </p>
            </footer>
          </>
        ) : (
          <>
                {/* Tina 状态行 + 快捷入口 */}
        <TinaPulseStrip tinaStatus={data.tinaStatus} />

        {/* 回国倒计时条：v2.0 起只剩倒计时（天气已移入状态页信息卡）；
            整条可点直达回国页，天数仍是视觉锚点。 */}
        <TripCountdownStrip onOpenChina={() => setPage("china")} />

        {/* 1. 待 Mark 拍板 — 有条目时是永远置顶的强调卡。v1.8.2：为空时
            「暂无待拍板」空条整条不渲染、拍板区直接不出现；仅当有一条
            可撤销的最近拍板时，留一条只含 最近拍板 + 撤销 的细行。 */}
        {data.decisions.length > 0 ? (
        <section aria-label={t("decisionsTitle")} className="mt-2 [@media(max-height:949px)]:mt-1.5">
          <div className="rounded-[10px] border border-[var(--accent)] bg-[var(--surface)] px-[var(--space-card-x)] py-[var(--space-card-y)] shadow-[0_0_0_1px_var(--accent),0_4px_14px_rgba(28,31,35,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-[var(--text)]">
                <SectionTile kind="decisions" />
                {t("decisionsTitle")}
              </h2>
              <span className={`${BADGE_CLASS} bg-[var(--accent)] font-semibold text-white`}>
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

        {/* 宽屏三列：今日时间线 | 到期列表 | Lane。v2.1 COMPACT：
            items-start + 无 h-full — 卡高贴内容走，不再等高拉伸。 */}
        <div className="mt-[var(--space-stack)] grid items-start gap-[var(--space-gap)] md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        {/* 2. 今日定时与动态 — 时间轴 */}
        <section aria-label={t("todayTitle")} className={CARD_CLASS}>
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
                          {past ? <span className="ml-1 inline-flex translate-y-[2px] text-[var(--dim)]"><CheckIcon size={12} /></span> : null}
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

        {/* 3. 到期事项 — v2.2 恢复完整内联列表（Mark 裁定 keeper：
            扫一眼优先于「一个信息一个家」，不许再被去重收敛）。
            近 14 天逐行全列，14 天后分区同卡在下；状态页零渲染。 */}
        <section aria-label={t("deadlinesTitle")} className={CARD_CLASS}>
          <SectionHeading icon={<SectionTile kind="deadlines" />}>{t("deadlinesTitle")}</SectionHeading>
          {nearDeadlines.length === 0 ? (
            <EmptyLineCompact text={t("deadlinesEmpty")} />
          ) : (
            <DeadlineGroups items={nearDeadlines} />
          )}
          {farDeadlines.length > 0 ? (
            <>
              <h3 className="mb-1 mt-2.5 border-t border-[var(--border)] pt-2.5 text-[13px] font-semibold text-[var(--text)]">
                {t("farTitle")}
              </h3>
              <DeadlineGroups items={farDeadlines} />
            </>
          ) : null}
        </section>

        {/* 4. 各 Lane 开放事项 — 可增删改 */}
        <section aria-label={t("lanesTitle")} className={CARD_CLASS}>
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
                    <span className={`ml-2 ${BADGE_CLASS} bg-[var(--fill)] font-normal text-[var(--dim)]`}>
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

        {/* 页面底部 slim 环境条 (v2.2)：天气 · 汇率 · Spotify 一行
            压完 — 状态页撤下的三样在这里安家，不做大卡不占版面。 */}
        <EnvStrip
          weather={weatherQuery.data?.weather ?? null}
          destination={weatherQuery.data?.destination ?? null}
          fx={fxQuery.data?.fx ?? null}
          spotify={spotifyQuery.data?.spotify}
          spotifyPending={spotifyQuery.isPending}
          controlPending={spotifyControlMutation.isPending}
          onSpotifyControl={(args) => spotifyControlMutation.mutate(args)}
        />

        {/* v2.3 subtraction: the footer is the plain version line on
            every page now — the four outward profile links that rode
            here since v1.2.4 (portfolio / GitHub / Typebook /
            FoxShare) are not board content and are gone. */}
        <footer className="mt-[var(--space-stack)] border-t border-[var(--border)] pt-2 text-center">
          <p className="text-xs text-[var(--dim)]">
            OpsDeck · {BOARD_VERSION} · Built by Tina for Mark
          </p>
        </footer>
          </>
        )}
        </main>
      </div>
    </div>
  );
}
