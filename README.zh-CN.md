[English](README.md) | **简体中文**

# Calendar Hub

> 一个日历，装下那一天的**每一篇**笔记 —— 还有一个 List 视图，按周、月、季、年把它们摊开来读。

大多数日历插件只把**一天对应一篇笔记**。Calendar Hub 不这样：点一个日期，它会把**归属于那一天的每一篇笔记**都列出来 —— 无论日期写在元数据（frontmatter）里、文件名里，还是（可选地）来自文件创建时间，也无论它在库的哪个角落。想看更大的图景时，同一个面板一键翻成 **List 视图**，按时间段浏览全部笔记，还能只聚焦你关心的那几个文件夹。

![Calendar Hub 演示 —— 点一个日期，看到那天散落在各文件夹里的所有笔记](https://raw.githubusercontent.com/HWY1dot0/calendar-hub/main/images/demo.gif)

## 为什么要用 Calendar Hub？

如果你每天生成很多笔记 —— 日记、会议记录、AI 生成的总结 —— 它们会散落在不同文件夹里，越攒越难找。而普通日历只认得你配置的那一篇日记，其它笔记在日历上等于隐形。

Calendar Hub 按笔记所属的日期把它们归到一起，所以点一个日期可以同时浮出很多篇：

- `Daily/2026-05-29.md`
- `Work log/work log 20260529.md`
- `Meeting notes/team sync 20260529.md`

点那一天，三篇全在。或者打开 List 视图，把那一周、那一个月、那一个季度的笔记按领域逐篇过一遍。

## Calendar Hub 与原版 Calendar 的区别

Calendar Hub 是 Liam Cain 的 Calendar 插件的一个 fork，所以你熟悉的功能都还在 —— 月视图、日记与周记、笔记数量圆点、"在日历中定位当前笔记"。它补上了 Calendar 缺的那部分：

| | Calendar | Calendar Hub |
|---|---|---|
| 每天的笔记 | 只认配置的那一篇日记 | **所有匹配的笔记，任意文件夹** |
| 浏览方式 | 仅月视图 | **List 视图按年 / 季 / 月 / 周分组** |
| 文件夹范围 | 仅日记文件夹 | **整个库，或带排除规则的文件夹过滤** |
| 日期识别 | 日记文件名 | **元数据 + 文件名（额外格式）+ 创建日期** |
| 周记 · 圆点 · 主题适配 | ✓ | ✓ |

它用的是独立的插件 id（`calendar-hub`），所以可以和原版 Calendar 并存，等你用顺手了再切过来。

## 日历

- 点一个日期，更新日历下方的笔记列表：只有一篇匹配笔记时直接打开；有多篇时从列表中选择；没有匹配笔记时进入日记创建流程，遵循“创建新笔记前确认”设置。
- 点击所选日期列表顶部的 **+ New note**，立即新建并打开另一篇笔记，不弹确认框。使用 Daily Notes 或 Periodic Notes 配置的文件夹、文件名格式和模板，例如 `2026-10-28.md`，接着是 `2026-10-28 (1).md`、`2026-10-28 (2).md`。模板中的 `{{date}}` 保持为日期，`{{title}}` 包含编号后缀。
- 要让编号笔记进入索引，请保持“在所有文件夹中检测日记”开启（默认开启），并确保日记文件夹在扫描范围内。关闭此设置后只识别与日记格式精确匹配的文件名，带编号的笔记不会显示。
- 笔记数量圆点显示当天的匹配笔记数量。通过 **Maximum dots per day** 设置 1–5 个圆点上限（默认 5），列表仍显示全部匹配笔记。
- 周记支持仍可通过“显示周数”设置启用。

## List 视图

List 视图把所有已索引的笔记组织成可折叠的树 —— **年**、**年›季**、**年›月**、**年›周**四档分组，新旧排序可切换，每级分组标题带笔记计数。今天所在的分支默认展开，点击笔记直接打开。

它有两个家：

- **Calendar Hub 面板内切换**：侧栏顶部靠右的按钮把同一个面板切换成列表、再切回来。将面板移到主工作区后，使用视图标题栏中的按钮；标题栏可见时，面板内的重复工具栏会隐藏。某些主题会在鼠标悬停时才显示侧栏按钮。你选的模式会被记住。想要更简洁的面板，可以关闭设置项**在侧栏面板中显示视图切换按钮**；切换视图时使用 **Open list view** 和 **Open calendar view** 命令。
- **独立标签页**：用命令**「Open list view」**打开，标签页可以拖到任何位置 —— 包括主工作区，整页高度舒展浏览。

列表还自带 **Filter folders** 过滤镜头：和扫描范围同一棵勾选树，点选即时生效、一键清空。想按季度通读 `30 Macro`，开镜头聚焦即可，日历索引的范围毫发不动。如果笔记出现在日历里却不在列表里，请检查这个列表专用过滤器。

## 文件夹过滤

两层过滤，各司其职：

- **扫描范围**（设置 → 扫描日记的文件夹）决定日历索引什么。它是一张规则表：普通条目包含整个子树，`-` 前缀条目排除一支，**更深的规则优先** —— `30 Macro, -30 Macro/Archive` 就是"扫 30 Macro、但不扫它的 Archive"。文本框下方的可折叠勾选树替你写规则：勾选母文件夹即覆盖子树，取消某个被覆盖的子文件夹会自动写入排除条目，横杠半选标记提示分支内有包含/排除混合。
- **List 的 Filter folders 镜头**只收窄列表显示什么，作用于扫描范围**之内**，永远不影响日历。

## 日期匹配规则

Calendar Hub 按以下顺序把 Markdown 文件映射到日历日期：

1. 元数据日期字段（启用时）——笔记自己声明的日期最优先。
2. 用你配置的日记格式精确匹配日记文件名。
3. 用日记格式匹配嵌在文件名里的日期。
4. 用你配置的任意额外格式匹配嵌在文件名里的日期。
5. 文件创建日期回退（可选），仅当以上都找不到日期时启用。

元数据日期优先于文件名日期，两者都优先于创建日期回退 —— 创建时间由设备记录，文件被复制或重新同步后可能改变，因此声明式日期始终优先。文件夹过滤对所有匹配来源同时生效。

日期时间格式同样可用：`YYYYMMDDTHHmmssZZ` 能匹配 `20260709T143025Z` 或 `20260709T143025+0800` 这样的时间戳。带时区偏移的时间戳按文件名里写的那一天归入日历，不换算到本机时区 —— 同一个库在不同时区的机器上归档结果完全一致。

## 设置项

- **在所有文件夹中检测日记**：扫描配置的日记文件夹之外的 Markdown 文件。
- **扫描日记的文件夹**：用逗号分隔的文件夹路径把匹配范围限定其中。留空则扫描整个库。路径加 `-` 前缀即排除该子树（如 `30 Macro, -30 Macro/Archive`）；更深的规则优先。
- **使用元数据日期**：优先读取配置的元数据字段；没有元数据日期时用文件名匹配。
- **元数据日期字段**：选择诸如 `date`、`daily_date`、`calendar.date` 之类的字段。一篇笔记有多个日期字段时，按你填写的顺序逐个尝试，第一个有效日期生效——把最信任的字段放最前。
- **日记文件名里的日期格式**：从下拉菜单选常见格式（每选一个追加进列表），也可以手写逗号分隔的格式，例如 `YYYYMMDD` 或 `YYYYMMDDTHHmmssZZ`。
- **使用文件创建日期回退**：把没有任何声明日期的笔记归到文件在磁盘上创建的那一天。
- **Maximum dots per day（每日圆点上限）**：选择 1–5 个笔记数量圆点，默认 5 个。此上限也适用于周记数量圆点，不限制列表显示的笔记数量。
- **创建新笔记前确认**：点击没有匹配笔记的日期或周数来创建笔记时弹窗确认；明确的 **+ New note** 按钮始终立即创建。
- **在侧栏面板中显示视图切换按钮**：Calendar Hub 停靠在侧栏时，在面板顶部显示日历/列表切换按钮。关闭后界面更简洁；**Open list view** 和 **Open calendar view** 命令仍然可用。
- **显示周数**：显示周数并保留旧版周记行为。

## 安装

Calendar Hub 已上架 Obsidian **社区插件**目录：

1. 打开**设置 → 第三方插件 → 浏览**。
2. 搜索 **Calendar Hub** 并安装。
3. 启用后，Calendar Hub 会在右侧栏创建面板；通过 **Open calendar view（打开日历视图）**命令将它显示出来。

<details>
<summary>手动安装 / 测试版安装</summary>

用 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 安装最新提交，仓库填 `HWY1dot0/calendar-hub`；或从[发布页](https://github.com/HWY1dot0/calendar-hub/releases)下载 `main.js`、`manifest.json`、`styles.css`，拷进库里的 `.obsidian/plugins/calendar-hub/`，然后重载 Obsidian 并启用插件。

</details>

## 命令

- **Open calendar view（打开日历视图）**：显示 Calendar Hub 面板；不存在时在右侧栏创建，正在显示列表时切回日历。
- **Open list view**：打开独立的 List 视图（默认落在右侧栏，可拖到任何位置）。
- **在日历中定位当前笔记**：当前笔记的文件名与配置的日记或周记格式精确匹配时，把日历跳到对应月份；若面板正显示列表，会先切回日历。
- **打开周记**：启用旧版周记支持时，打开或创建当前周记。

## 兼容性

Calendar Hub 需要 Obsidian `1.7.2` 或更新版本。

插件使用 Obsidian 的主题变量，无需自定义 CSS 即可跟随浅色 / 深色主题。

## 与 Calendar 的关系

本插件基于 Liam Cain 的 Obsidian 原版 Calendar 插件：

https://github.com/liamcain/obsidian-calendar-plugin

原项目采用 MIT 许可。`LICENSE` 中保留了原始版权声明，以及本 fork 修改部分的版权。

Calendar Hub 使用独立的插件 id `calendar-hub`，因此可以和原版 Calendar 分开安装。

Liam Cain 的两个 MIT 许可库以未修改的形式（已发布的构建产物）内置在 `vendor/` 目录下，各自带有许可与来源说明头：[obsidian-calendar-ui](https://github.com/liamcain/obsidian-calendar-ui) 0.3.12 与 [obsidian-daily-notes-interface](https://github.com/liamcain/obsidian-daily-notes-interface) 0.9.0。内置这两个库是为了让插件运行时不依赖任何 npm 包。

## 贡献者致谢

感谢 [@yszhou2019](https://github.com/yszhou2019) 在 [PR #5](https://github.com/HWY1dot0/calendar-hub/pull/5) 中贡献同一天新建多篇笔记及文件名自动编号、可配置的笔记数量圆点，以及视图切换按钮改进。这些功能已随 0.2.4 版本发布。

## 开发

```bash
npm install
npm run build
```

## HWY1dot0 的其它插件

- [Screenshot Selection](https://github.com/HWY1dot0/obsidian-screenshot-selection) —— 把选中的笔记内容截成忠于主题的 PNG。
- [Copy for Email](https://github.com/HWY1dot0/obsidian-copy-for-email) —— 把笔记复制成富文本，粘进 Gmail、Outlook、Apple Mail 排版不散。

## 请我喝杯咖啡

如果 Calendar Hub 帮到了你的工作流，可以请我喝杯咖啡：

https://www.buymeacoffee.com/hwy1dot0
