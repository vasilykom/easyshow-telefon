// Чистые правила страницы: без сети, без DOM. Их гоняют тесты (tests/).
// Правила — те же, что у программы на Маке (vasilykom/easyshow, v2):
//   * файл плана — serde_json::to_string_pretty + "\n" (obshchie/vygruzka.rs, текст_плана);
//   * номер плана — ASCII буквы, цифры, '-', '_', до 80 знаков (obshchie/priyom.rs, годный_номер_плана);
//   * дата занята — `<дата>_<id>.json` (obshchie/otpravka.rs);
//   * пункт-песня — { id, type: 'song', songId, title } (web/src/types.ts, Item).

export const ХРАНИЛИЩЕ = { owner: 'vasilykom', repo: 'easyshow-pesni' };
export const ПАПКА_ПЛАНОВ = 'plany';

export function годныйНомерПлана(s) {
  return typeof s === 'string' && s.length > 0 && s.length <= 80 && /^[A-Za-z0-9_-]+$/.test(s);
}

// Ближайшее воскресенье (сегодня воскресенье — сегодня), по местным часам.
export function ближайшееВоскресенье(сейчас = new Date()) {
  const д = new Date(сейчас.getFullYear(), сейчас.getMonth(), сейчас.getDate());
  д.setDate(д.getDate() + ((7 - д.getDay()) % 7));
  return датаСтрокой(д);
}

export function датаСтрокой(д) {
  const два = (n) => String(n).padStart(2, '0');
  return `${д.getFullYear()}-${два(д.getMonth() + 1)}-${два(д.getDate())}`;
}

export function годнаяДата(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [г, м, д] = s.split('-').map(Number);
  const дата = new Date(г, м - 1, д);
  return дата.getFullYear() === г && дата.getMonth() === м - 1 && дата.getDate() === д;
}

const АЗБУКА = 'abcdefghijklmnopqrstuvwxyz0123456789';
export function новыйНомерПлана(дата, случай = Math.random) {
  let хвост = '';
  for (let i = 0; i < 6; i++) хвост += АЗБУКА[Math.floor(случай() * АЗБУКА.length)];
  return `tel-${дата}-${хвост}`;
}

// serde_json::to_string_pretty: отступ два пробела, ключи в порядке вставки,
// пустой массив — "[]", пустой объект — "{}". JSON.stringify(_, null, 2) пишет так же,
// кроме не-ASCII: serde оставляет как есть, JSON.stringify тоже. Совпадение держат тесты.
export function текстПлана(план) {
  return JSON.stringify(план, null, 2) + '\n';
}

export function новыйПлан({ дата, название, песни, сейчасМс, номер }) {
  if (!годнаяДата(дата)) throw new Error('дата не годится');
  if (!годныйНомерПлана(номер)) throw new Error('номер плана не годится');
  return {
    id: номер,
    name: (название || '').trim() || 'Служение',
    date: дата,
    items: (песни || []).map((п, i) => ({ id: `${номер}-${i + 1}`, type: 'song', songId: п.id, title: п.title })),
    updatedAt: сейчасМс,
  };
}

// Куда положить план: `<дата>.json`, а если имя занято — `<дата>_<id>.json`.
export function путьПлана(план, занятыеИмена) {
  const простое = `${план.date}.json`;
  if (!занятыеИмена.has(простое)) return `${ПАПКА_ПЛАНОВ}/${простое}`;
  return `${ПАПКА_ПЛАНОВ}/${план.date}_${план.id}.json`;
}

// Планы для списка: только с годной датой, ближайшие сверху, прошлые не показываем.
export function ближайшиеПланы(планы, сегодня) {
  return планы
    .filter((п) => п && typeof п.date === 'string' && годнаяДата(п.date) && п.date >= сегодня)
    .sort((а, б) => (а.date === б.date ? String(а.name).localeCompare(String(б.name)) : а.date < б.date ? -1 : 1));
}

// UTF-8 → base64 для Contents API (btoa сам кириллицу не берёт).
export function вBase64(текст) {
  const байты = new TextEncoder().encode(текст);
  let s = '';
  for (let i = 0; i < байты.length; i += 0x8000) s += String.fromCharCode(...байты.subarray(i, i + 0x8000));
  return btoa(s);
}
