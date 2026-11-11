#!/usr/bin/env node
// ArchTalk · 架构讲图 —— 把场景描述渲染成单文件 HTML + 口播稿。MIT License, (c) 2026 xiaoni zhou / 心晴九天.
// 用法：node scripts/render.mjs talk.json [--out 目录]
// 输出：<名字>.html（可直接双击打开、可部署）和 <名字>.script.md（口播稿，一段对应一镜）。
import { writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { loadSpec, lint, buildHtml, buildScript } from './lib.mjs';

const args = process.argv.slice(2);
const specPath = args.find(a => !a.startsWith('--'));
if (!specPath) { console.log(JSON.stringify({ ok: false, error: '用法：node scripts/render.mjs talk.json [--out 目录]' })); process.exit(2); }
const outIdx = args.indexOf('--out');
const outDir = resolve(outIdx >= 0 ? args[outIdx + 1] : dirname(resolve(specPath)));

let spec;
try { spec = loadSpec(specPath); } catch (e) { console.log(JSON.stringify({ ok: false, error: e.message })); process.exit(1); }
const { errors, warnings } = lint(spec);
if (errors.length) { console.log(JSON.stringify({ ok: false, errors, warnings }, null, 1)); process.exit(1); }

const name = basename(specPath).replace(/\.json$/i, '');
mkdirSync(outDir, { recursive: true });
const html = join(outDir, `${name}.html`), script = join(outDir, `${name}.script.md`);
writeFileSync(html, buildHtml(spec));
writeFileSync(script, buildScript(spec, `${name}.html`));
console.log(JSON.stringify({ ok: true, html, script, scenes: spec.scenes.length, warnings, next: `node scripts/check.mjs ${specPath}` }, null, 1));
