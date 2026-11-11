---
name: archtalk
description: Use when the user wants a codebase, agent harness, framework or system architecture explained as a narrated animated diagram for a video, course or talk — e.g. "讲清这个仓库的架构", "做动态架构图", "一镜一讲", "口播配架构图", "ArchTalk", "架构讲图", "按模块拆开讲".
license: MIT
metadata:
  version: "0.1.0"
  author: "xiaoni zhou / 心晴九天"
---

# ArchTalk · 架构讲图

一段口播 = 一个镜头。读懂源码后写一份 `talk.json`（模块、连线、镜头、口播），脚本渲染成单文件 HTML 和口播稿，再逐镜截图检查。**不要手写 HTML / SVG。**

`AT` = `node <本 skill 文件夹>/scripts`。需要 Node 18+；检查截图需要本机有 Chrome / Chromium / Edge。

## 流程

1. **读源码，定模块。** 每个模块对应真实的代码单元（包、目录、类），别为了好讲自造"几层"。每条要讲的结论记下出处（文件:行）。源码里没有的东西，就讲"没有"，再说怎么自己补。
2. **按下面的"讲透标准"排镜头。**
3. **写 `talk.json`。** 格式见 `reference/spec.md`；照 `examples/deepseek-harness.json` 改最快。
4. **检查：** `node AT/check.mjs talk.json`。`errors` 必须改；`layout` 和 `warnings` 逐条处理；然后打开 `<名字>-shots/index.html`，逐镜看画面和口播对不对得上。改完重跑，直到干净。
5. **交付：** `<名字>.html`（按 → 翻镜，C 开口播字幕排练）和 `<名字>.script.md`（口播稿，一段对应一镜）。只渲染不检查：`node AT/render.mjs talk.json`。

## 讲透标准

| 位置 | 必须有 |
|---|---|
| 第 1 镜 | 钩子：一个反差事实或数字，再说观众为什么要懂这层（写插件、二次开发、查 bad case） |
| 第 2 镜 | 全景：`draw:true`，每个模块对应观众的一个问题 |
| 每个模块 1–2 镜 | 讲清四件事：管什么、跟谁交接、为什么这么切、代价。至少有一样在动：带字的光点（`flow` / `trace`）、状态变化（`states`），或机制浮层（`race` / `steps`） |
| 收尾几镜 | 状态归属表（出了 bad case 先查这段状态归谁）→ 一圈流程（`trace`）→ 二次开发或可迁移的判断 |

模块按观众的问题排：谁调模型 → 工具怎么跑 → 上下文怎么维护 → 插件从哪接 → 出问题查哪。别从最抽象的底座讲起。

## 口播规矩

- 说它"干什么"，不念类名、方法名、文件路径、版本号。模块自己的名字（比如 Session）第一次出现时解释一句，并写进 `terms`。
- 行话可以用，第一次出现就地解释，比如"队头等待，行话叫 head-of-line blocking"。
- 只讲源码能确认的。推论要说"我的判断"，数字写进 `sources`。
- 一镜 80–220 字。屏幕上只放关键词和机制演示，不把口播原句搬上屏。

## 常见错误

| 错误 | 改法 |
|---|---|
| 只有高亮、变暗，图是静的 | 每个模块镜头至少加一个 flow、trace、states 或浮层 |
| 光点不带字，看不出流的是什么 | `flow` / `trace` 的 `label` 写流的东西："请求""工具结果" |
| 屏幕底部列要点，和口播重复 | 删掉，换成机制演示；解释交给口播 |
| 口播里出现驼峰名、函数名 | 换成中文说它干什么；检查会在 warnings 里列出来 |
| 只讲设计多好 | 每个模块补一句代价 |
| 截图里字叠在一起、被截断 | 看 `layout` 报告：调行的 `h`，换注释的 `pos`，或者用 `spacer` 腾位置 |

## 停下来重做的信号

- 想直接写 HTML / SVG → 回去写 `talk.json`。
- 没跑 `check.mjs`、没看截图就要交付 → 先跑、先看。
- 口播里有一句你在源码里没看到依据 → 删掉，或者明说"我的判断"。
