// Сторож: в этом открытом репозитории не бывает ни песен, ни планов, ни ключей.
// Правило архитектора общей базы (15.10.2026): страница — только код, без ключа бесполезна.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const КОРЕНЬ = new URL('..', import.meta.url).pathname;

function все(папка) {
  return readdirSync(папка).flatMap((имя) => {
    if (имя === '.git' || имя === 'node_modules') return [];
    const путь = join(папка, имя);
    return statSync(путь).isDirectory() ? все(путь) : [путь];
  });
}
const файлы = все(КОРЕНЬ).map((п) => relative(КОРЕНЬ, п));

test('нет путей pesni/ и plany/', () => {
  assert.deepEqual(файлы.filter((п) => /(^|\/)(pesni|plany|biblii)(\/|$)/.test(п)), []);
});

test('нет JSON с песнями или планами', () => {
  const плохие = файлы.filter((п) => п.endsWith('.json')).filter((п) => /"(sections|items)"\s*:/.test(readFileSync(join(КОРЕНЬ, п), 'utf8')));
  assert.deepEqual(плохие, []);
});

test('нет ключей GitHub', () => {
  const плохие = файлы.filter((п) => /github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,}/.test(readFileSync(join(КОРЕНЬ, п), 'utf8')));
  assert.deepEqual(плохие, []);
});

test('страница ходит только на api.github.com и без чужих скриптов', () => {
  const html = readFileSync(join(КОРЕНЬ, 'index.html'), 'utf8');
  assert.match(html, /connect-src https:\/\/api\.github\.com;/);
  assert.match(html, /script-src 'self';/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
  assert.doesNotMatch(html, /<link[^>]+href="https?:/);
  for (const п of файлы.filter((п) => п.endsWith('.js') && !п.startsWith('tests/'))) {
    const код = readFileSync(join(КОРЕНЬ, п), 'utf8');
    const адреса = [...код.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((м) => м[0]);
    assert.deepEqual(адреса.filter((а) => !а.startsWith('https://api.github.com')), [], п);
  }
});
