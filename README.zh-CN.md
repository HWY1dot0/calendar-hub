[English](README.md) | **简体中文**

# Calendar Hub

> 一个日历，装下那一天的**每一篇**笔记 —— 不管它放在哪个文件夹。

大多数日历插件只把**一天对应一篇笔记**。Calendar Hub 不这样：点一个日期，它会把**归属于那一天的每一篇笔记**都列出来 —— 无论日期是写在文件名里还是元数据（frontmatter）里，也无论它在库的哪个角落。你可以在同一个侧栏里找到、打开、管理它们。

![Calendar Hub 演示 —— 点一个日期，看到那天散落在各文件夹里的所有笔记](https://raw.githubusercontent.com/HWY1dot0/calendar-hub/main/images/demo.gif)

## 为什么要用 Calendar Hub？

如果你每天生成很多笔记 —— 日记、会议记录、AI 生成的总结 —— 它们会散落在不同文件夹里，越攒越难找。而普通日历只认得你配置的那一篇日记，其它笔记在日历上等于隐形。

Calendar Hub 按笔记所属的日期把它们归到一起，所以点一个日期可以同时浮出很多篇：

- `Daily/2026-05-29.md`
- `Work log/work log 20260529.md`
- `Meeting notes/team sync 20260529.md`

点那一天，三篇全在。

## Calendar Hub 与原版 Calendar 的区别

Calendar Hub 是 Liam Cain 的 Calendar 插件的一个 fork，所以你熟悉的功能都还在 —— 月视图、日记与周记、笔记数量圆点、"在日历中定位当前笔记"。它补上了 Calendar 缺的那部分：

| | Calendar | Calendar Hub |
|---|---|---|
| 每天的笔记 | 只认配置的那一篇日记 | **所有匹配的笔记，任意文件夹** |
| 文件夹范围 | 仅日记文件夹 | **整个库，或你指定的若干文件夹** |
| 日期识别 | 日记文件名 | **元数据 + 文件名（额外格式）+ 创建日期** |
| 周记 · 圆点 · 主题适配 | ✓ | ✓ |

它用的是独立的插件 id（`calendar-hub`），所以可以和原版 Calendar 并存，等你用顺手了再切过来。

## 功能

- 看到归属于任意选中日期的所有笔记（按文件名或元数据匹配），跨文件夹。
- 在一个面板里打开、管理那一天的笔记。
- 扫描整个库，或把匹配范围限定在指定文件夹。
- 直接在日历侧栏里调整文件夹过滤。
- 匹配精确的日记文件名，也匹配嵌在较长文件名里的日期。
- 添加额外的文件名日期格式，例如 `YYYYMMDD`，也支持日期时间格式，例如 `YYYYMMDDTHHmmssZZ`。
- 元数据日期字段优先于文件名日期——不改文件名也能把笔记挂到别的日子。
- 可选：把没有任何声明日期的笔记归到文件创建的那一天。
- 用笔记数量圆点看出每一天有多少篇匹配的笔记。
- 保留可选的周记支持，兼容已有的 Calendar 工作流。

## 日期匹配规则

Calendar Hub 按以下顺序把 Markdown 文件映射到日历日期：

1. 元数据日期字段（启用时）——笔记自己声明的日期最优先。
2. 用你配置的日记格式精确匹配日记文件名。
3. 用日记格式匹配嵌在文件名里的日期。
4. 用你配置的任意额外格式匹配嵌在文件名里的日期。
5. 文件创建日期回退（可选），仅当以上都找不到日期时启用。

元数据日期优先于文件名日期，两者都优先于创建日期回退。文件夹过滤对所有匹配来源同时生效。创建时间由设备记录，文件被复制或重新同步后可能改变，因此声明式日期（文件名、元数据）始终优先。

日期时间格式同样可用：`YYYYMMDDTHHmmssZZ` 能匹配 `20260709T143025Z` 或 `20260709T143025+0800` 这样的时间戳。带时区偏移的时间戳按文件名里写的那一天归入日历，不换算到本机时区。

## 设置项

- **在所有文件夹中检测日记**：扫描配置的日记文件夹之外的 Markdown 文件。
- **扫描日记的文件夹**：用逗号分隔的文件夹路径把匹配范围限定其中。留空则扫描整个库。
- **日记文件名里的日期格式**：添加逗号分隔的额外格式，例如 `YYYYMMDD` 或 `YYYYMMDDTHHmmssZZ`。
- **使用元数据日期**：优先读取配置的元数据字段；没有元数据日期时用文件名匹配。
- **元数据日期字段**：选择诸如 `date`、`daily_date`、`calendar.date` 之类的字段。一篇笔记有多个日期字段时，按你填写的顺序逐个尝试，第一个有效日期生效——把最信任的字段放最前。
- **使用文件创建日期回退**：把没有任何声明日期的笔记归到文件在磁盘上创建的那一天。
- **笔记数量圆点**：用实心圆点显示当天有多少篇匹配的笔记，最多 5 个。
- **创建新笔记前确认**：创建新日记前弹窗确认。
- **显示周数**：显示周数并保留旧版周记行为。

文件夹过滤也可以直接在日历侧栏里调整：Scan folders 面板以可折叠的树形层级展示库里的文件夹、逐个勾选即可（已选文件夹所在分支默认展开），文本框保留用于手动编辑。

## 安装

Calendar Hub 已上架 Obsidian **社区插件**目录：

1. 打开**设置 → 第三方插件 → 浏览**。
2. 搜索 **Calendar Hub** 并安装。
3. 启用后，通过左侧栏图标或**打开日历视图**命令打开它。

<details>
<summary>手动安装 / 测试版安装</summary>

用 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 安装最新提交，仓库填 `HWY1dot0/calendar-hub`；或从[发布页](https://github.com/HWY1dot0/calendar-hub/releases)下载 `main.js`、`manifest.json`、`styles.css`，拷进库里的 `.obsidian/plugins/calendar-hub/`，然后重载 Obsidian 并启用插件。

</details>

## 命令

- **打开日历视图**：打开 Calendar Hub 侧栏视图。
- **在日历中定位当前笔记**：把日历跳到当前这篇带日期的笔记所在的月份。
- **打开周记**：启用旧版周记支持时，打开或创建当前周记。

## 兼容性

Calendar Hub 需要 Obsidian `0.9.11` 或更新版本。

插件使用 Obsidian 的主题变量，无需自定义 CSS 即可跟随浅色 / 深色主题。

## 与 Calendar 的关系

本插件基于 Liam Cain 的 Obsidian 原版 Calendar 插件：

https://github.com/liamcain/obsidian-calendar-plugin

原项目采用 MIT 许可。`LICENSE` 中保留了原始版权声明，以及本 fork 修改部分的版权。

Calendar Hub 使用独立的插件 id `calendar-hub`，因此可以和原版 Calendar 分开安装。

Liam Cain 的两个 MIT 许可库以未修改的形式（已发布的构建产物）内置在 `vendor/` 目录下，各自带有许可与来源说明头：[obsidian-calendar-ui](https://github.com/liamcain/obsidian-calendar-ui) 0.3.12 与 [obsidian-daily-notes-interface](https://github.com/liamcain/obsidian-daily-notes-interface) 0.9.0。内置这两个库是为了让插件运行时不依赖任何 npm 包。

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
