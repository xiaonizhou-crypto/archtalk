# ArchTalk · 架构讲图

**会讲话的架构图：一段口播 = 一个镜头。** by 心晴九天

写一份 JSON 描述（模块、连线、每一镜亮什么、口播说什么），ArchTalk 生成一个单文件 HTML：按 → 翻镜，模块逐个点亮，光点标着流的是什么，关键机制现场演示（并发后按顺序提交、组件出错不自愈、写进内存不等于存住）。同时生成口播稿，一段对应一镜。适合录视频、讲课、做技术分享。

它也是一个 Agent Skill：装进 Claude Code、Codex 这类 Agent，说一句"把这个仓库讲成架构讲图"，Agent 会先读源码、按"讲透标准"排镜头、写描述、渲染，再逐镜截图检查。

## 和普通架构图有什么不同

- **按口播分镜**：稿子和图一起设计，讲到哪亮到哪，不是先画图再配话。
- **机制能演出来**：不只画谁连谁，还能演"跑完了也得等前面""依赖走了自动下线"。
- **光点带内容**：每颗光点写着流的是什么。
- **讲透四问 + 排查表**：每个模块讲管什么、跟谁交接、为什么这么切、代价，最后一张"状态归谁管"的 bad case 排查表。
- **自带检查**：静态规则（口播里有没有代码名、引用对不对）+ 浏览器里量版面（字有没有溢出、注释有没有压住节点）+ 逐镜截图总览。

[在线演示](https://xiaonizhou-crypto.github.io/archtalk/) · 按 → 翻镜，C 显示口播。

## 快速开始

需要 Node 18+；检查截图需要 Chrome / Chromium / Edge。

```bash
git clone https://github.com/xiaonizhou-crypto/archtalk.git
cd archtalk
```

```bash
node scripts/render.mjs examples/deepseek-harness.json        # 生成 HTML + 口播稿
node scripts/check.mjs  examples/deepseek-harness.json        # 检查 + 逐镜截图
```

打开生成的 `deepseek-harness.html`，按 → 翻镜，按 C 显示口播字幕。格式说明见 [`reference/spec.md`](reference/spec.md)。

作为 skill 安装：把整个文件夹放到 `~/.claude/skills/archtalk`（Claude Code）或 `~/.codex/skills/archtalk`（Codex）。

## 运行与公开范围

这是本地渲染工具，不需要 API Key、账户或后台服务。生成的 HTML 内嵌脚本与样式，不加载外部字体或资源，并用页面策略禁止网络连接。口播、来源和 JSON 中的其他字段都会随 HTML 交付；公开前请检查里面是否包含私有源码、客户资料或个人信息。

使用自己检查过的 JSON 和源码运行脚本；不要执行陌生人提供的脚本或 HTML。检查器会启动本机浏览器，使用独立的临时配置目录，不读取日常浏览器的登录状态。没有找到浏览器时只完成静态检查，不能据此声称通过了画面验收。

内置示例按 `sources` 标注的版本制作，是代码讲解与机制示意，不是所讲框架的运行实测或性能评测。安全边界与报告方式见 [SECURITY.md](SECURITY.md)。

```bash
node --test tests/security.test.mjs
```

## 致谢

暗底手绘、光点流动的画风，参考了岚叔的动态架构图（[cclank/lanshu-animated-architecture-diagram](https://github.com/cclank/lanshu-animated-architecture-diagram)）等作品。ArchTalk 的重点不在画风，而在"一段口播对应一个镜头"的讲解方式。

## English

**ArchTalk — narrated architecture diagrams.** One paragraph of narration = one scene. Describe modules, edges and scenes in a JSON file; ArchTalk renders a single self-contained HTML you step through with the arrow keys: modules light up, labeled particles show what flows where, and mechanisms are animated (ordered commit after parallel tool calls, failed components that don't self-heal, "written to memory" vs. "flushed to disk"). It also writes the narration script, one paragraph per scene.

It ships as an Agent Skill for Claude Code / Codex: the agent reads the source, plans scenes against an "explain it fully" checklist, writes the spec, renders it, and checks every scene with headless-browser screenshots.

```bash
node scripts/render.mjs examples/deepseek-harness.json
node scripts/check.mjs  examples/deepseek-harness.json
```

Visual style inspired by lanshu's animated architecture diagrams. MIT License.

Runs locally without API keys or a backend. Generated HTML embeds its assets and blocks network connections. All spec fields are included in the output: review private code, personal information and client data before sharing. Examples describe the pinned source versions, rather than runtime or performance tests. See [SECURITY.md](SECURITY.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
