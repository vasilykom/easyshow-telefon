import { test } from 'node:test';
import assert from 'node:assert/strict';
import { клиент, прочитатьПланы, ОшибкаСвязи } from '../github.js';

function подмена(ответы) {
  const вызовы = [];
  const fetchFn = async (url, init) => {
    вызовы.push({ url, init });
    for (const [часть, ответ] of ответы) if (url.includes(часть)) return ответ();
    return new Response('', { status: 404 });
  };
  return { fetchFn, вызовы };
}

const json = (x, status = 200) => () => new Response(JSON.stringify(x), { status });
const text = (x) => () => new Response(x, { status: 200 });

test('ходит только на api.github.com в easyshow-pesni, с ключом и веткой', async () => {
  const { fetchFn, вызовы } = подмена([
    ['/contents/plany/2026-10-18.json', text('{"id":"p1","name":"Утро","date":"2026-10-18","items":[]}')],
    ['/contents/plany?', json([{ type: 'file', name: '2026-10-18.json', path: 'plany/2026-10-18.json', sha: 'a' }])],
  ]);
  const к = клиент({ ключ: 'K', ветка: 'glavnaya', fetchFn });
  const планы = await прочитатьПланы(к);
  assert.equal(планы.length, 1);
  for (const { url, init } of вызовы) {
    assert.ok(url.startsWith('https://api.github.com/repos/vasilykom/easyshow-pesni/contents/'), url);
    assert.ok(url.endsWith('?ref=glavnaya'), url);
    assert.equal(init.headers.Authorization, 'Bearer K');
    assert.equal(init.method ?? 'GET', 'GET');
  }
});

test('папки plany/ ещё нет — пустой список, не ошибка', async () => {
  const { fetchFn } = подмена([]);
  assert.deepEqual(await прочитатьПланы(клиент({ ключ: 'K', fetchFn })), []);
});

test('битый файл плана пропускается, как на Маке', async () => {
  const { fetchFn } = подмена([
    ['/contents/plany/a.json', text('{не json')],
    ['/contents/plany/b.json', text('{"id":"b","date":"2026-10-18","items":[]}')],
    ['/contents/plany?', json([
      { type: 'file', name: 'a.json', path: 'plany/a.json', sha: '1' },
      { type: 'file', name: 'b.json', path: 'plany/b.json', sha: '2' },
      { type: 'dir', name: 'x', path: 'plany/x', sha: '3' },
    ])],
  ]);
  const планы = await прочитатьПланы(клиент({ ключ: 'K', fetchFn }));
  assert.deepEqual(планы.map((п) => п.id), ['b']);
});

test('погашенный ключ — понятная ошибка', async () => {
  const { fetchFn } = подмена([['/contents/plany?', json({}, 401)]]);
  await assert.rejects(прочитатьПланы(клиент({ ключ: 'K', fetchFn })), (e) => e instanceof ОшибкаСвязи && /ключ/.test(e.message));
});

test('подпись по умолчанию — логин из /user', async () => {
  const { fetchFn, вызовы } = подмена([['/user', json({ login: 'vasilykom' })]]);
  assert.equal(await клиент({ ключ: 'K', fetchFn }).кто(), 'vasilykom');
  assert.equal(вызовы[0].url, 'https://api.github.com/user');
});
