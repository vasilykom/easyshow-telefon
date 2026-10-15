// Разговор с api.github.com — единственный адрес, куда страница ходит (CSP в index.html).
import { ХРАНИЛИЩЕ, ПАПКА_ПЛАНОВ } from './logic.js';

const АПИ = 'https://api.github.com';

export class ОшибкаСвязи extends Error {
  constructor(статус, текст) {
    super(текст);
    this.статус = статус;
  }
}

export function клиент({ ключ, ветка = 'main', fetchFn = fetch }) {
  const заголовки = (accept = 'application/vnd.github+json') => ({
    Accept: accept,
    Authorization: `Bearer ${ключ}`,
    'X-GitHub-Api-Version': '2022-11-28',
  });
  const путьВАдрес = (путь) => путь.split('/').map(encodeURIComponent).join('/');
  const адрес = (путь) =>
    `${АПИ}/repos/${ХРАНИЛИЩЕ.owner}/${ХРАНИЛИЩЕ.repo}/contents/${путьВАдрес(путь)}?ref=${encodeURIComponent(ветка)}`;

  async function запрос(url, init) {
    const ответ = await fetchFn(url, init);
    if (!ответ.ok) throw new ОшибкаСвязи(ответ.status, понятно(ответ.status));
    return ответ;
  }

  return {
    async кто() {
      const ответ = await запрос(`${АПИ}/user`, { headers: заголовки() });
      return (await ответ.json()).login;
    },
    // Файлы папки plany/: [{ name, path, sha }]. Папки ещё нет — пустой список.
    async файлыПланов() {
      try {
        const ответ = await запрос(адрес(ПАПКА_ПЛАНОВ), { headers: заголовки() });
        const список = await ответ.json();
        return (Array.isArray(список) ? список : [])
          .filter((ф) => ф.type === 'file' && ф.name.endsWith('.json'))
          .map(({ name, path, sha }) => ({ name, path, sha }));
      } catch (беда) {
        if (беда instanceof ОшибкаСвязи && беда.статус === 404) return [];
        throw беда;
      }
    },
    async текстФайла(путь) {
      const ответ = await запрос(адрес(путь), { headers: заголовки('application/vnd.github.raw+json') });
      return ответ.text();
    },
  };
}

function понятно(статус) {
  if (статус === 401) return 'ключ не подходит или погашен';
  if (статус === 403) return 'ключу не хватает прав на общую базу';
  if (статус === 404) return 'общая база не найдена этим ключом';
  return `GitHub ответил ${статус}`;
}

// Все планы из базы. Битый файл пропускаем, как приём на Маке (priyom.rs).
export async function прочитатьПланы(к) {
  const файлы = await к.файлыПланов();
  const планы = [];
  for (const ф of файлы) {
    try {
      const план = JSON.parse(await к.текстФайла(ф.path));
      if (план && typeof план === 'object' && !Array.isArray(план)) планы.push(план);
    } catch (беда) {
      if (беда instanceof ОшибкаСвязи) throw беда;
    }
  }
  return планы;
}
