# Tina Ops Board

**An AI chief-of-staff work dashboard.** One screen that answers, at a glance:
*What needs my decision? What is running today? What is about to expire? What is still open? Is everything up?*

给你的 Muse 一个链接，它就能照着给你做一个同款工作台。见下方 [给 Muse 的话](#give-this-link-to-your-claude)。

![status](https://img.shields.io/badge/layout-one%20screen%20%40%201080p-success) ![i18n](https://img.shields.io/badge/UI-%E4%B8%AD%E6%96%87%20%2F%20English-blue) ![theme](https://img.shields.io/badge/theme-dark%20%2F%20light-black) ![license](https://img.shields.io/badge/license-MIT-green)

---

## New to Muse?

This entire board was designed and built by **Muse** — Meta's personal AI agent — working as the owner's chief of staff: it keeps the board fed, reads the verdicts, and does the follow-up work behind every card.

If you don't have Muse yet, join with the owner's invite code **`4DF30T`** — redeem it in *Settings* within 48 hours of joining, and you both get **1 billion Muse tokens**.

还没有 Muse？这个工作台就是 Muse 一手搭的。用仓库主人的邀请码 **`4DF30T`** 加入（注册后 48 小时内在设置里兑换），你俩各得 **10 亿 Muse tokens**。

## Give this link to your Muse

Paste this to your own Muse (or any capable AI agent):

> Build me a personal ops board like this one: https://github.com/marksong0917/tina-ops-board
> Read the README and the source, use it as the reference implementation, seed it with the demo data first so I can see the layout, then ask me for my real items: my decision queue, today's scheduled jobs, my deadlines, my work lanes, the websites and servers to watch, my city for weather, and my timezone.

The board is maintained *by* the assistant, not by you: the assistant pushes its live status line, today's completed work, schedule changes, and server inspection results into the board through its actions API. Your only jobs are tapping **Yes / No** on decisions and glancing at the screen.

（中文版提示词在 [PROMPT.md](PROMPT.md)。)

## What is on the board

**Page 1 — the workbench (fits one 1080p screen, no scrolling)**

- **Action hero, top center** — "N things need you" (pending decisions + items explicitly waiting on you). Zero is a first-class state: a calm "all clear" bar.
- **Decision queue** — each item gets ✓ Yes / ✗ No / Dismiss, with undo. The assistant reads the verdict back and acts on it.
- **Today's schedule** — the day's timed jobs with live states (done / in progress / next).
- **14-day deadline radar** — countdown chips, right-aligned; anything further out lives on page 2.
- **Open items by lane** — work streams (bookkeeping, product, outreach, …) with full CRUD: add, edit inline, mark done, delete with a two-tap confirm.
- **Status chip** — "6/6 all normal" as one compact fraction; turns red only on a *confirmed* outage (probes retry once before declaring down). Full detail on page 2.
- **Assistant pulse** — a "Tina is currently…" status line and a "Done today" strip, both fed by the assistant.
- **Dual-city glance strip** (new in v1.5.0) — home vs destination weather side by side on page 1: the China-trip countdown, the temperature difference between the two cities, and sunrise/sunset for both.
- **Header** — dual-city weather (home + destination) and dual clocks (home + second city), off-work countdown chip, one-tap refresh, quick links to your daily tools.
- **Dark / light themes** and a **中文 / English** UI toggle, both persisted.

**Page 2 — the back office**: deadlines beyond 14 days, and full status detail for every monitored site and server.

**Page 3 — China Trip checklist** (new in v1.3.0): a check-off to-do list for a trip home — tick an item and it is marked done in place (stays visible, struck through, untick to undo), and new items can be added right on the page.

第 3 页「回国待办」（v1.3.0 新增）：回国行程的勾选清单——点一下复选框就标记完成（条目留在原地、划线显示，再点可取消），也能直接在页面上新增条目。

**Page 4 — History** (new in v1.4.0): the "Done today" strip grew into a read-only 7-day archive of completions, grouped by day; page 1 keeps a slim one-line count that links here. Each night an archive action rolls the day's completions into history and prunes anything older than 7 days.

第 4 页「完成记录」（v1.4.0 新增）：「今日已完成」升级成按天分组的 7 天只读归档，第 1 页只留一行计数摘要、点一下跳过来；每晚的归档动作把当天完成卷进历史，超过 7 天的自动删除。

## Design principles

- **One screen, no scroll** at 1920×1080; a height-based compact tier kicks in under ~950 px viewport height (e.g. 125% display scaling).
- **Chinese workbench style** （飞书/钉钉-like): card grid, colored icon tiles, pill status tags, friendly empty states — warm and dense, not minimal-grey.
- **Calm technology**: a single transient probe failure never cries wolf; freshness is shown once ("data updated at …"), in one place.
- **Toronto-time discipline** in the original: every timestamp follows the owner's working timezone, even when travelling.

## How it works

Built as a **Muse Space** (TypeScript web artifact): React client + typed server actions + SQLite (Drizzle migrations in `drizzle/`). The assistant drives it through these actions:

| Action | Who calls it | Purpose |
| --- | --- | --- |
| `getBoard` | client | All sections in one read |
| `answerDecision` / `undoDecision` / `getLastVerdict` | client / assistant | Yes-No verdicts the assistant consumes |
| `addItem` / `updateItem` / `closeItem` | both | CRUD on lane items |
| `toggleChinaDone` | client | Ticks a page-3 checklist item done / not done in place |
| `replaceTodaySchedule` | assistant (scheduled jobs) | Mirrors the day's real cron schedule, read-only for the user |
| `updateBoardPulse` | assistant | "Currently…" line + done-today list |
| `archiveDoneToday` | assistant (nightly job) | Rolls the done-today list into the 7-day history archive (page 4), clears it, and prunes buckets older than 7 days |
| `getStatus` / `recordServerCheck` | server / assistant | HTTPS probes for public sites; inspection records for private servers |
| `getWeather` | server | Cached dual-city weather (1 h TTL, stale-flagged fallback) |
| `seedBoard` | first run | Demo data so a fresh board shows its layout |

## Notes

- The code in this repo is the **reference implementation** from a live, daily-used board. All personal operational data has been replaced with demo seeds; monitored sites/servers are example entries — your Muse will swap in yours.
- It runs on the Muse artifact platform (server actions, storage and weather channel are platform features). Your Muse adapts the same design to its own runtime.
- Times, cities, lanes and links are configuration, not constants — make it yours.

## License

[MIT](LICENSE) © 2026 Mark Song
