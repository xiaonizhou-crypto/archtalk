import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildHtml, findChrome } from '../scripts/lib.mjs';

const fixture = JSON.parse(readFileSync(new URL('../examples/deepseek-harness.json', import.meta.url), 'utf8'));
const marker = "document.documentElement.setAttribute('data-archtalk-injected','yes')";

test('spec text cannot close a title or script element', () => {
  const spec = structuredClone(fixture);
  spec.title = `</title><script>${marker}</script>`;
  spec.scenes[0].say = `</script><script>${marker}</script>`;
  const html = buildHtml(spec);
  assert.equal((html.match(/<script>/g) || []).length, 3);
  assert.ok(!html.includes(`<script>${marker}</script>`));
  assert.ok(html.includes('&lt;/title>'));
});

test('language is confined to its HTML attribute', () => {
  const spec = { ...fixture, lang: `zh-CN" onload="${marker}` };
  const opening = buildHtml(spec).match(/<html[^>]*>/)[0];
  assert.equal((opening.match(/"/g) || []).length, 2);
  assert.ok(opening.includes('&quot;'));
});

test('adversarial strings stay inert in the rendered browser page', { skip: !findChrome() }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'archtalk-security-'));
  try {
    const spec = structuredClone(fixture);
    spec.lang = `zh-CN" onload="${marker}`;
    spec.title = `</title><script>${marker}</script>`;
    spec.scenes[0].say = `</script><script>${marker}</script>`;
    const file = join(dir, 'input.html');
    writeFileSync(file, buildHtml(spec));
    const dom = execFileSync(findChrome(), [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${join(dir, 'profile')}`, '--virtual-time-budget=4000', '--dump-dom',
      `${pathToFileURL(file).href}?check=1`,
    ], { encoding: 'utf8', timeout: 90000, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    assert.ok(dom.includes('<pre id="archtalk-report">'));
    assert.ok(!dom.match(/<html[^>]* data-archtalk-injected=/));
    assert.ok(!dom.match(/<html[^>]*\sonload="/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
