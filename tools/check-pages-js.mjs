// Offline syntax gate for GitHub Pages single-file UI. No npm dependencies / no Actions.
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
const path = new URL('../docs/index.html', import.meta.url);
const html = readFileSync(path, 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(Boolean);
if (scripts.length !== 1) throw new Error(`Expected exactly one inline UI script; found ${scripts.length}`);
new Script(scripts[0], { filename: 'docs/index.html:inline-script' });
const required = ['function render()', 'function dialog(kind)', 'function bindDevice()', 'function run()', 'No device yet — bind later'];
for (const marker of required) if (!scripts[0].includes(marker)) throw new Error(`Missing Pages interaction marker: ${marker}`);
console.log('PASS: GitHub Pages inline JS parses and core interaction functions exist.');
