#!/usr/bin/env node
// ArchTalk · 架构讲图 —— 检查：静态规则 + 浏览器里量版面 + 逐镜截图。MIT License, (c) 2026 xiaoni zhou / 心晴九天.
// 用法：node scripts/check.mjs talk.json [--out 目录] [--no-shots] [--wait 毫秒]
// 输出 JSON：errors（必须改）、warnings（建议改）、layout（浏览器量出来的版面问题）、shots（逐镜截图和总览页）。
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadSpec, lint, buildHtml, buildScript, findChrome } from './lib.mjs';

const args = process.argv.slice(2);
const specPath = args.find(a => !a.startsWith('--'));
if (!specPath) { console.log(JSON.stringify({ ok: false, error: '用法：node scripts/check.mjs talk.json [--out 目录] [--no-shots]' })); process.exit(2); }
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const outDir = resolve(opt('--out') || dirname(resolve(specPath)));
const wait = +(opt('--wait') || 5500);
const shotsOn = !args.includes('--no-shots');

const report = { ok: false, errors: [], warnings: [], layout: [], shots: null };
let spec;
try { spec = loadSpec(specPath); } catch (e) { report.errors.push(e.message); done(1); }
const r = lint(spec);
report.errors.push(...r.errors); report.warnings.push(...r.warnings);
if (report.errors.length) done(1);

const name = basename(specPath).replace(/\.json$/i, '');
mkdirSync(outDir, { recursive: true });
const htmlPath = join(outDir, `${name}.html`);
writeFileSync(htmlPath, buildHtml(spec));
writeFileSync(join(outDir, `${name}.script.md`), buildScript(spec, `${name}.html`));
const url = pathToFileURL(htmlPath).href;

const chrome = findChrome();
if (!chrome) {
  report.warnings.push('没找到 Chrome / Chromium / Edge，跳过版面自检和截图；装一个，或设置环境变量 CHROME_PATH');
  report.ok = true; done(0);
}
const profiles = [];
const newProfile = () => { const p = mkdtempSync(join(tmpdir(), 'archtalk-chrome-')); profiles.push(p); return p; };
const base = p => ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${p}`, '--window-size=1920,1080'];
const run = (extra, ms = 90000) => execFileSync(chrome, [...base(newProfile()), ...extra], { encoding: 'utf8', timeout: ms, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
// 截图并行跑，每个 Chrome 用自己的配置目录；只要 PNG 写出来了就算成功
const shootAsync = (f, target, ms) => new Promise(res => {
  try { rmSync(f, { force: true }); } catch {}
  execFile(chrome, [...base(newProfile()), `--virtual-time-budget=${wait}`, `--screenshot=${f}`, target], { timeout: ms, maxBuffer: 16 * 1024 * 1024 }, (err, _o, stderr) => {
    const okFile = existsSync(f) && statSync(f).size > 0;
    res(okFile ? null : (err ? `${String(err.message).split('\n')[0].slice(0, 120)}${stderr ? ' ｜ ' + String(stderr).trim().split('\n').pop().slice(0, 160) : ''}` : '没写出截图'));
  });
});

try {
  const dom = run(['--virtual-time-budget=4000', '--dump-dom', `${url}?check=1`]);
  const m = dom.match(/<pre id="archtalk-report">([\s\S]*?)<\/pre>/);
  if (!m) report.errors.push('浏览器里没跑出自检结果：页面可能报错了。用浏览器打开 HTML，看开发者工具的控制台');
  else {
    const data = JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    if (data.scenes !== spec.scenes.length) report.errors.push(`页面里只建出 ${data.scenes} 个镜头，描述里有 ${spec.scenes.length} 个`);
    report.layout = [...new Map(data.issues.map(i => [i.where + i.msg, `${i.where}：${i.msg}`])).values()];
  }
} catch (e) { report.errors.push(`浏览器自检失败：${String(e.message).split('\n')[0]}`); }

if (shotsOn && !report.errors.length) {
  const dir = join(outDir, `${name}-shots`);
  mkdirSync(dir, { recursive: true });
  const files = [];
  const jobs = spec.scenes.map((s, i) => i);
  const worker = async () => {
    while (jobs.length) {
      const i = jobs.shift();
      const f = join(dir, `s${String(i + 1).padStart(2, '0')}.png`);
      let err = null;
      for (let t = 0; t < 3; t++) { err = await shootAsync(f, `${url}?s=${i + 1}&shot=1`, 150000); if (!err) break; }
      if (err) report.errors.push(`第 ${i + 1} 镜截图失败（试了 3 次）：${err}`); else files.push(f);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cards = spec.scenes.map((s, i) => `<figure><img src="s${String(i + 1).padStart(2, '0')}.png" loading="lazy"><figcaption><b>S${String(i + 1).padStart(2, '0')} · ${esc(s.title.replace(/[[\]]/g, ''))}</b><p>${esc(s.say)}</p></figcaption></figure>`).join('\n');
  writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><title>${esc(spec.title)} · 逐镜总览</title>
<style>body{margin:0;padding:32px;background:#111;color:#ddd;font:15px/1.6 -apple-system,"PingFang SC",sans-serif}h1{font-size:22px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:24px}figure{margin:0;background:#1b1b1d;border-radius:10px;overflow:hidden}
img{width:100%;display:block}figcaption{padding:12px 16px}figcaption p{margin:6px 0 0;color:#aaa}</style>
<h1>${esc(spec.title)} · 逐镜总览（${spec.scenes.length} 镜）</h1><main>${cards}</main>`);
  report.shots = { dir, index: join(dir, 'index.html'), count: files.length };
}
profiles.forEach(p => { try { rmSync(p, { recursive: true, force: true }); } catch {} });
report.ok = !report.errors.length;
report.html = htmlPath;
report.next = report.ok
  ? (report.layout.length || report.warnings.length ? '逐条处理 layout 和 warnings，改完重跑；然后打开 shots/index.html 逐镜看一遍' : '打开 shots/index.html 逐镜看一遍，确认每一镜画面和口播对得上')
  : '先改 errors，再重跑';
done(report.ok ? 0 : 1);

function done(code) { console.log(JSON.stringify(report, null, 1)); process.exit(code); }
