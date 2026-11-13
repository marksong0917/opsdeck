# OpsDeck

**A personal operations console.** OpsDeck is the one board Tina — an AI chief-of-staff — runs for Mark: his whole working day, his open decisions, his systems' health, and his product's growth, on six pages in a single board. Nothing on it is typed in by hand for show: the working lanes that do the work write their own results back to the board as they finish, so what Mark reads in the morning is what actually happened.

It is built for one person to run a small company with an AI operator: Mark decides and directs; Tina triages, executes, verifies, and keeps this board true.

## The six pages

Grouped, Semi-style tabs — daily work first, topics second, records last:

| Page | 这页回答什么问题 — what this page answers |
| --- | --- |
| **今天** Today | 今天要做什么、已经做完了什么 — What needs doing today, and what is already done |
| **待拍板** Awaiting decisions | 哪些事卡在决策人那里、卡了多久 — What is blocked on a decision-maker, and for how many days |
| **状态** Status | 四个网站和服务器还活着吗 — Are the websites and servers still alive |
| **增长** Growth | Foxuma 在长吗、Founding 还剩几席 — Is Foxuma growing, and how many Founding seats are left |
| **回国** China trip | 走之前要清什么、在华要办什么、航班什么状态 — What to clear before departure, what to handle in China, and the flight status |
| **历史** History | 做完的事去哪查、哪天做的 — Where finished work goes, and on which day it was done |

Each new page carries a one-line purpose statement at its top and its own **data-updated timestamp** (the newest write-back in that page's section) — a page is only as fresh as its lane's last write, and the board says so.

## Architecture

- **Board actions are the only write path.** Every lane — bookkeeping, product, outreach, monitoring — updates the board through the same small set of typed actions (`addItem`, `updateItem`, `closeItem`, `appendDoneToday`, …) against one items table. There is no second write path, no hand-edited state, and no page-private database.
- **Nightly reset.** A scheduled job archives the day's completed work into History shortly after midnight (Toronto time) and starts 今天 clean. Nothing is deleted — done work moves, it doesn't vanish.
- **Read models are derived, not stored.** Each page's view (open items, this week's cleared decisions, growth lanes) is computed from the same item rows at read time, so pages can never disagree with each other.
- **Data discipline.** Numbers on this board only ever come from source ledgers and registers — the accounting system's own reports, the product's own database counts, the bank-feed register. A page whose verified feed has not landed yet shows an honest **“尚未同步 / Not synced yet”** state. The board never invents a number to fill a space: an empty page with a truthful label beats a populated page with a guess.
- **Secrets stay out.** No credentials, payment details, or third-party personal data live in the board; it holds operational state, not the underlying records.

## A note on this repository

This repo is the **sanitized public twin** of the live board. The live OpsDeck runs on real operational data — real amounts, real client names, real people's names — and none of that is published here. Demo seeds, example sites, and the fictional demo tenant (“Maple & Grain”) stand in for the real feeds, so the code, layout, and conventions can be read exactly as they run, without the data.

**Screenshots:** none are included, deliberately. The live board's screens contain real operational data, and captures are only ever published from a fully fictional dataset — until a mock-data capture harness exists, this README describes the pages instead of picturing them.

## Tech

- Client: React + TypeScript, with a Semi Design–informed component layer (grouped tabs, tables, tags, deadline chips), bilingual （中文 / English) throughout.
- Server: typed action layer over a single SQLite database (Drizzle schema + migrations), Toronto-time day boundaries everywhere.
- One artifact, one board: the six pages are tabs of a single app, not six apps.

## Version notes

**v1.9.1 (2026-11-13)**

- **CFO page retired, one day after it shipped, on Mark's call** — collections are not his job and he never opened it, so the page answered a question he doesn't ask. The tab and the page are removed; the board is six pages. Only the display is gone: the money data pipeline — the server-side `money` section, its rows, and the write-back actions the bookkeeping lane feeds — is retained dormant server-side, ready to power another surface if one is ever wanted.

**v1.9.0 (2026-11-13)**

- **Renamed: Tina Ops Board → OpsDeck.** Outward references only — the app title, header wordmark, page titles, and this repo. Internal identifiers (data keys, action names) are unchanged on purpose.
- **Three new pages:** 待拍板 (everything waiting on a decision, sorted by drag days, with a “cleared this week” strip), CFO (receivables / payables over the next 30 days, totals summed only from written-back rows), and 增长 (Founding seats, funnel, outreach — fed by verified counts only).
- **回国 expanded in place:** the trip checklist gains a flight card, a key-dates strip with live day-count badges, and the destination weather card.
- **Navigation:** the flat tab row becomes grouped Semi-style tabs （日常 / 专题 / 记录）, one line at every width, scrolling horizontally on narrow screens with the active tab kept in view.
- **Every page footer** now reads, in one line: the version stamp below.

---

OpsDeck · v1.9.1 · Built by Tina for Mark
