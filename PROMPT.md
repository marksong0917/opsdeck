# Copy-paste prompts / 复制即用

## English

> Build me a personal ops board like this one: https://github.com/marksong0917/tina-ops-board
> Read the README and the source, use it as the reference implementation, seed it with the demo data first so I can see the layout, then ask me for my real items: my decision queue, today's scheduled jobs, my deadlines, my work lanes, the websites and servers to watch, my city for weather, and my timezone.
> Keep the design rules: page 1 fits one 1080p screen with no scrolling, the action count sits top-center, only deadlines within 14 days are on page 1, status is one compact fraction that turns red only on a confirmed outage, and you (the assistant) keep the board fed — your status line, today's completed work, schedule changes and server checks — through its actions.

## 中文

> 照这个给我做一个同款的个人工作台：https://github.com/marksong0917/tina-ops-board
> 先读 README 和源码，把它当参考实现；先用仓库里的演示数据把版式跑出来给我看，然后再问我真实内容：等我拍板的事、今天的定时任务、我的截止日期、我的工作 lane、要监测的网站和服务器、天气城市和时区。
> 设计规矩照旧：第一页 1080p 一屏不滚动；"几样东西需要你处理"在正上方中间；第一页只放 14 天内到期；状态只显示一个 X/X 分数，确认真挂了才变红；板子由你（助理）持续喂数据——你的状态行、今日已完成、定时表变化、服务器巡检，都走它的 actions 接口。
