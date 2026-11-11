# ArchTalk 描述格式（talk.json）

一份 JSON 写一期讲解：模块怎么排、线怎么连、每一镜亮什么、口播说什么。画布固定 1920×1080，不用写坐标。示例见 `examples/deepseek-harness.json`。

## 顶层

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | 是 | 这一期的标题，也是 HTML 标题和口播稿标题 |
| `eyebrow` | | 左上角小字，比如 `PI AGENT-CORE · 3551ec0` |
| `brand` | | 右下角落款，比如 `心晴九天` |
| `legend` | | 底部图例里出现哪些线：`call` 调用、`fact` 写入事实、`proj` 投影 / 读取、`dep` 依赖、`cfg` 配置、`evt` 事件 / 通知；也可以写 `["call","自定义说明"]` |
| `terms` | | 口播里允许出现的专有名词（不触发"像代码"的警告），比如 `["DeepSeek"]` |
| `sources` | | 出处，写进口播稿末尾的不读注释，不上屏。写 `仓库@提交号（日期）` 和 `文件:行`；没有 git 记录时写 `包名@版本（取自 package.json 等）` 和 `文件:行`，并注明"无 git 历史" |
| `layout` | 是 | 模块排版，见下 |
| `edges` | | 连线 |
| `insets` | | 浮层（机制演示、表格、卡片） |
| `scenes` | 是 | 镜头，一镜一段口播 |

## 排版：layout.rows

从上到下若干行，每行放几个模块，每个模块里放几个节点。

```json
"layout": { "rows": [
  { "h": 1, "modules": [
    { "id": "drv", "label": "驱动核心", "span": 0.9, "dir": "col", "nodes": [
      { "id": "loop", "label": "默认驱动", "sub": "推着 Agent 一步步干活" }
    ]}
  ]}
]}
```

- 行：`h` 相对高度（默认 1）。
- 模块：`id`、`label`、`span` 相对宽度、`dir` 节点排列方向（`row` 横排，`col` 竖排）、`gap` 节点间距、`nodeH` 节点最大高度、`style:"outer"`（虚线外框，标题压在边框上，省高度）、`frame:false`（不画框）。
- 节点：`id`、`label`（2–8 个字最好）、`sub`（一句话说它管什么）、`w` 相对宽度、`size` 字号。`{"spacer":true,"w":1}` 是空白占位，给注释腾地方。
- 一张图建议 4–6 个模块、总共不超过 20 个节点；一个模块不超过 6 个节点。
- 节点高度不够 58px 时，副标题会被省略，检查会报出来；调大那一行的 `h`。

## 连线：edges

```json
{ "id": "e_res", "from": "texec", "to": "log", "type": "fact", "label": "工具结果" }
```

- `from` / `to` 可以是节点，也可以是模块。
- `type`：`call` 蓝实线、`fact` 橙实线、`proj` 绿点线、`dep` 灰虚线、`cfg` 灰实线、`evt` 紫虚线。
- 走线自动：左右关系走横向曲线，上下关系走竖向曲线，竖线会尽量对准终点。需要时用 `dir:"h"|"v"` 强制方向，`bend` 把曲线往上（负数）或往下拱，`fromOffset` / `toOffset` 微调端点，`d` 直接写 SVG 路径。
- **线默认不显示。** 每一镜要用 `edges` 点名（或写 `"all"` / `"auto"`）；`flow` 和 `trace` 用到的线会自动显示。
- `label` 写关系（"调用模型"）；光点上的字写流的东西（"请求""工具结果"）。两者重复就去掉连线的 label。用了 `trace` 的镜头会自动藏起连线上的固定标签（要显示就写 `edgeLabels:true`），其他镜头想藏写 `edgeLabels:false`。

## 浮层：insets

浮层盖在图上，用来演示机制。`place`：`full`（几乎全屏）、`center`（中间）、`bottom`（下半屏）、`left` / `right`（半边）。`title` 是浮层标题。

| type | 用途 | 字段 |
|---|---|---|
| `text` | 论点、钩子、结论 | `lines:[{text,color}]`；`hero:true` 时第一行当大标题 |
| `cards` | 分档、判断标准、选型 | `items:[{head,text,color}]`、`footer` |
| `steps` | 一个流程的几步（两道锁、生命周期） | `steps:["一步",{label,lock:true}]`（lock 标黄，表示关键关卡）、`lines`。每步 10 个字以内，5–7 步为宜，解释写进 `lines` 或口播 |
| `table` | 状态归属表、对照表 | `columns`、`rows`、`widths`；三列以上时最后一列标黄（放"最常见的坑"） |
| `race` | 并发演示：一起跑、按什么顺序进历史 | `tasks:[{label,len,exclusive}]`（len 是 0–1 的相对时长）、`order:"model"`（按发起顺序，默认）或 `"finish"`、`footer` |

颜色可选：`blue` `amber` `mint` `coral` `violet` `ink` `ink2`。

## 镜头：scenes

```json
{ "key": "工具系统", "title": "Function Call 落地：[工具系统三层]",
  "show": ["drv","tools"], "lit": ["texec"], "zoom": ["drv","tools"],
  "flow":  [{ "edge": "e_msg", "label": "模型回复" }],
  "trace": [{ "edge": "e_tool", "label": "调用" }, { "edge": "e_res", "label": "工具结果" }],
  "notes": [{ "at": "tools", "pos": "above", "text": "一句要点" }],
  "states":[{ "node": "loop", "state": "failed", "at": 2000 }],
  "inset": "race",
  "say": "这一镜的口播……" }
```

| 字段 | 说明 |
|---|---|
| `key` | 镜头短名，显示在左上角 |
| `title` | 大标题，`[ ]` 里的词会做成高亮胶囊 |
| `say` | 口播，一镜一段（必填） |
| `visual` | 给录制的人看的画面说明，写进口播稿注释，不上屏 |
| `show` | 这一镜亮哪些模块或节点，其余变暗；不写就是全亮。写节点时，它所在的模块框会半亮 |
| `half` | 半亮（作背景） |
| `lit` | 加蓝色呼吸边框，表示"正在讲它" |
| `zoom` | 镜头推近这些模块或节点；这一镜有浮层时会被忽略 |
| `edges` | 显示哪些线：数组、`"all"`，或 `"auto"`（只显示亮着的模块之间的线）；`flow` 和 `trace` 用到的线会自动显示 |
| `flow` | 循环流动的光点：`{edge,label,count,dur,rev}`，`rev:true` 反向走（比如回复） |
| `trace` | 一颗光点按顺序走完一串线，走到哪个节点哪个闪一下，讲"一圈流程"用 |
| `notes` | 注释：`{at,pos,text,color,size,width}`，`pos` 可选 `below` `above` `right` `left` `inside`；也可以给 `x`、`y` |
| `states` | 节点状态动画：`{node,state,at,until}`，`state` 可选 `off`（下线）、`failed`（出错）、`flash`（闪亮）、`mount`（装上） |
| `inset` | 这一镜显示的浮层 id（可以是数组） |
| `draw` | `true` 时模块逐个手绘画出，用在第一次看全景那一镜 |

浮层是 `full` 或 `center`，而且这一镜没写 `show` 时，背后的图会自动变暗当背景。

## 播放

- `→` / 空格：下一镜；`←`：上一镜；`R`：重播本镜；`C`：口播字幕（排练用）；`H`：隐藏图例；`L`：浅色；`A`：自动播放。
- `?s=5` 直达第 5 镜；`?caption=1` 打开字幕；`?shot=1` 截图模式（关过渡）；`?check=1` 版面自检。
- 生成的是单个 HTML，不依赖网络，可以直接双击打开、发给别人、放到网站上。
- 检查截图是在第 5.5 秒拍的静帧（`--wait` 可调）；动画循环的镜头偶尔拍在中间，以真人播放为准。
