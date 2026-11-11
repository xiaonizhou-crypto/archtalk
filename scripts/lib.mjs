// ArchTalk · 架构讲图 —— 共用：读描述、静态检查、拼单文件 HTML。MIT License, (c) 2026 xiaoni zhou / 心晴九天.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadSpec(path) {
  const raw = readFileSync(path, 'utf8');
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`${path} 不是合法 JSON：${e.message}`); }
}

const cjk = s => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

// 口播里像代码的词：驼峰、下划线、函数调用、文件名、点号路径、版本号、提交号
const CODE_PATTERNS = [
  [/\b[a-z]+[A-Z][A-Za-z0-9]*\b/g, '驼峰命名（像变量或方法名）'],
  [/\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b/g, '拼在一起的类名'],
  [/\b[A-Za-z]+_[A-Za-z0-9_]+\b/g, '下划线命名'],
  [/\b[\w.]+\(\)/g, '函数调用写法'],
  [/\b[\w-]+\.(?:ts|tsx|js|mjs|cjs|py|rs|go|java|kt|swift|json|ya?ml|toml|md)\b/g, '文件名'],
  [/\b[a-z_]+\.[a-z_]+\.[a-z_]+\b/gi, '点号路径'],
  [/\bv?\d+\.\d+\.\d+[\w.-]*\b/g, '版本号'],
  [/\b\d+\.\d+-(?:alpha|beta|rc)[\w.]*\b/gi, '版本号'],
  [/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/g, '提交号'],
];

export function lint(spec) {
  const errors = [], warnings = [];
  const E = m => errors.push(m), W = m => warnings.push(m);
  if (!spec || typeof spec !== 'object') { E('描述不是对象'); return { errors, warnings }; }
  if (!spec.title) E('缺少 title（这一期的标题）');
  const rows = spec.layout?.rows;
  if (!Array.isArray(rows) || !rows.length) E('缺少 layout.rows（模块怎么排）');
  if (!Array.isArray(spec.scenes) || !spec.scenes.length) E('缺少 scenes（镜头）');

  const ids = new Map(); // id → 种类
  const add = (id, kind) => {
    if (!id) { E(`有一个${kind}没写 id`); return; }
    if (!/^[A-Za-z][\w-]*$/.test(id)) E(`${kind} id "${id}" 只能用字母、数字、下划线、连字符，且以字母开头`);
    if (ids.has(id)) E(`id "${id}" 重复（已经用作${ids.get(id)}）`);
    ids.set(id, kind);
  };
  const nodeIds = new Set(), modIds = new Set();
  (rows || []).forEach((r, ri) => {
    if (!Array.isArray(r.modules) || !r.modules.length) E(`layout.rows[${ri}] 没有 modules`);
    (r.modules || []).forEach(m => {
      add(m.id, '模块'); modIds.add(m.id);
      if (m.frame !== false && !m.label) W(`模块 ${m.id} 没有 label，画面上看不出它是什么`);
      (m.nodes || []).forEach(n => {
        if (n.spacer) return;
        add(n.id, '节点'); nodeIds.add(n.id);
        if (!n.label) E(`节点 ${n.id} 缺少 label`);
      });
      if ((m.nodes || []).filter(n => !n.spacer).length > 6) W(`模块 ${m.id} 有 ${(m.nodes || []).length} 个节点，太挤；拆成两个模块或去掉次要节点`);
    });
    if ((r.modules || []).length > 5) W(`第 ${ri + 1} 行放了 ${(r.modules || []).length} 个模块，横向太挤`);
  });
  const boxIds = new Set([...nodeIds, ...modIds]);
  const edgeIds = new Set();
  (spec.edges || []).forEach(e => {
    add(e.id, '连线'); edgeIds.add(e.id);
    if (!boxIds.has(e.from)) E(`连线 ${e.id} 的 from "${e.from}" 不存在`);
    if (!boxIds.has(e.to)) E(`连线 ${e.id} 的 to "${e.to}" 不存在`);
    if (e.type && !['call', 'fact', 'proj', 'dep', 'cfg', 'evt'].includes(e.type)) E(`连线 ${e.id} 的 type "${e.type}" 不认识（call/fact/proj/dep/cfg/evt）`);
  });
  const insetIds = new Set();
  (spec.insets || []).forEach(i => {
    add(i.id, '浮层'); insetIds.add(i.id);
    if (!['text', 'cards', 'steps', 'table', 'race'].includes(i.type)) E(`浮层 ${i.id} 的 type "${i.type}" 不认识（text/cards/steps/table/race）`);
    if (i.place && !['full', 'center', 'bottom', 'right', 'left'].includes(i.place)) E(`浮层 ${i.id} 的 place "${i.place}" 不认识`);
    if (i.type === 'steps') {
      const st = i.steps || [];
      if (st.length > 7) W(`浮层 ${i.id} 有 ${st.length} 步，屏幕放不下也记不住；拆成两镜，或合并成 5–7 步`);
      st.forEach(x => { const l = typeof x === 'string' ? x : x?.label || ''; if (l.length > 12) W(`浮层 ${i.id} 的步骤"${l}"太长，像一句话；压到 10 个字以内，解释放进 lines 或口播`); });
    }
  });

  const terms = new Set((spec.terms || []).map(t => String(t)));
  const usedInsets = new Set();
  (spec.scenes || []).forEach((s, si) => {
    const at = `镜头 ${si + 1}${s.key ? `（${s.key}）` : ''}`;
    if (!s.title) E(`${at} 缺少 title`);
    else if ((s.title.match(/\[/g) || []).length !== (s.title.match(/\]/g) || []).length) E(`${at} 标题的 [ ] 没配对`);
    if (!s.say) E(`${at} 缺少 say（口播）`);
    else {
      const n = cjk(s.say);
      if (n > 260) W(`${at} 口播 ${n} 个汉字，超过 1 分钟；拆成两个镜头`);
      if (n < 20) W(`${at} 口播只有 ${n} 个汉字，画面停留太短`);
      CODE_PATTERNS.forEach(([re, kind]) => {
        const hits = [...new Set((s.say.match(re) || []).filter(h => !terms.has(h)))];
        if (hits.length) W(`${at} 口播里有${kind}：${hits.join('、')}。改成中文说它干什么；确实要保留的专有名词，加进顶层 terms`);
      });
    }
    const ref = (v, ok, what) => (Array.isArray(v) ? v : v == null || v === 'all' || v === 'auto' ? [] : [v]).forEach(id => { if (!ok.has(id)) E(`${at} 的 ${what} 引用了不存在的 "${id}"`); });
    ref(s.show, boxIds, 'show'); ref(s.half, boxIds, 'half'); ref(s.lit, boxIds, 'lit'); ref(s.zoom, boxIds, 'zoom');
    if (Array.isArray(s.edges)) ref(s.edges, edgeIds, 'edges');
    (s.flow || []).forEach(f => ref(f.edge, edgeIds, 'flow'));
    const steps = Array.isArray(s.trace) ? s.trace : s.trace?.steps || [];
    steps.forEach(t => ref(t.edge, edgeIds, 'trace'));
    (s.notes || []).forEach(n => { if (n.at) ref(n.at, boxIds, 'notes.at'); else if (n.x == null || n.y == null) E(`${at} 有一条注释既没有 at 也没有 x/y`); });
    (s.states || []).forEach(st => {
      ref(st.node, boxIds, 'states');
      if (!['failed', 'off', 'flash', 'mount'].includes(st.state)) E(`${at} 的 states.state "${st.state}" 不认识（failed/off/flash/mount）`);
    });
    const ins = s.inset ? (Array.isArray(s.inset) ? s.inset : [s.inset]) : [];
    ins.forEach(i => { if (!insetIds.has(i)) E(`${at} 的 inset "${i}" 不存在`); usedInsets.add(i); });
    if (s.zoom && ins.length) W(`${at} 同时用了 zoom 和浮层：浮层会挡住推近的画面，zoom 已被忽略；二选一`);
    const moves = s.draw || s.flow?.length || steps.length || s.lit?.length || ins.length || s.notes?.length || s.states?.length || s.zoom || Array.isArray(s.show);
    if (!moves) W(`${at} 画面上没有任何变化（没有点亮、光点、注释、浮层），观众会觉得图停了`);
  });
  insetIds.forEach(i => { if (!usedInsets.has(i)) W(`浮层 ${i} 定义了但没有镜头用它`); });
  return { errors, warnings };
}

export function buildHtml(spec) {
  const css = readFileSync(join(ROOT, 'engine/engine.css'), 'utf8');
  const engine = readFileSync(join(ROOT, 'engine/engine.js'), 'utf8');
  const runtime = readFileSync(join(ROOT, 'engine/runtime.js'), 'utf8');
  const notices = [readFileSync(join(ROOT, 'LICENSE'), 'utf8'), readFileSync(join(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8')].join('\n\n').replace(/-->/g, '--&gt;');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const json = JSON.stringify(spec).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${esc(spec.lang || 'zh-CN')}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="ArchTalk · 架构讲图">
<title>${esc(spec.title)}</title>
<!-- ArchTalk · 架构讲图（by 心晴九天）。按 → / 空格 下一镜，← 上一镜，R 重播，C 口播字幕，H 隐藏图例，L 浅色，A 自动播放；?s=3 直达第 3 镜。 -->
<!--
${notices}
-->
<style>${css}</style>
</head>
<body>
<div id="stage">
  <svg id="world" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"></svg>
  <svg id="hud" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"></svg>
</div>
<script>${engine}</script>
<script>window.ARCHTALK_SPEC=${json};</script>
<script>${runtime}</script>
</body>
</html>
`;
}

export function buildScript(spec, htmlName) {
  const L = [];
  L.push(`# ${spec.title}`, '');
  L.push(`配图：${htmlName}（按 → 翻镜，S01–S${String(spec.scenes.length).padStart(2, '0')} 和下面段落一一对应）。HTML 注释不读。`, '');
  let total = 0;
  spec.scenes.forEach((s, i) => {
    const n = cjk(s.say || ''); total += n;
    L.push(`<!-- 不读｜S${String(i + 1).padStart(2, '0')}｜${s.key || ''}｜画面：${(s.title || '').replace(/[[\]]/g, '')}${s.visual ? '；' + s.visual : ''} -->`, '');
    L.push(s.say || '', '');
  });
  L.push('<!-- 不读', `共 ${spec.scenes.length} 镜，${total} 个汉字；按每分钟 240–270 字，中文部分约 ${(total / 270).toFixed(1)}–${(total / 240).toFixed(1)} 分钟，另加看图停顿。`);
  if (spec.sources?.length) { L.push('', '出处：'); spec.sources.forEach(s => L.push(`- ${s}`)); }
  L.push('-->', '');
  return L.join('\n');
}

export function findChrome() {
  const c = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  return c.find(p => existsSync(p)) || null;
}
