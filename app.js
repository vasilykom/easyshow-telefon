// Окно страницы. Шаг 0: ввести ключ — увидеть ближайшие планы из общей базы. Только чтение.
import { ближайшиеПланы, датаСтрокой } from './logic.js';
import { клиент, прочитатьПланы } from './github.js';

const ЗАПИСИ = { ключ: 'easyshow.klyuch', подпись: 'easyshow.podpis', ветка: 'easyshow.vetka' };
const $ = (id) => document.getElementById(id);

function взять(имя) {
  try { return localStorage.getItem(имя) || ''; } catch { return ''; }
}
function положить(имя, значение) {
  try { значение ? localStorage.setItem(имя, значение) : localStorage.removeItem(имя); } catch { /* приватное окно */ }
}

function сказать(текст, беда = false) {
  const п = $('sostoyanie');
  п.textContent = текст;
  п.classList.toggle('beda', беда);
}

function показатьНастройки(да) {
  $('nastroyki').hidden = !да;
  if (да) {
    $('pole-klyucha').value = взять(ЗАПИСИ.ключ);
    $('pole-podpisi').value = взять(ЗАПИСИ.подпись);
    $('pole-vetki').value = взять(ЗАПИСИ.ветка) || 'main';
  }
}

function нарисовать(планы) {
  const список = $('spisok-planov');
  список.replaceChildren();
  for (const п of планы) {
    const li = document.createElement('li');
    const дата = document.createElement('div');
    дата.className = 'data';
    дата.textContent = `${датаПоРусски(п.date)} · ${п.name || ''}`;
    const песни = document.createElement('div');
    песни.className = 'pesni';
    const названия = (п.items || []).filter((x) => x && x.type === 'song').map((x) => x.title);
    песни.textContent = названия.length ? названия.join(' · ') : 'песен нет';
    li.append(дата, песни);
    список.append(li);
  }
}

function датаПоРусски(s) {
  const [г, м, д] = s.split('-').map(Number);
  return new Date(г, м - 1, д).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
}

async function загрузить() {
  const ключ = взять(ЗАПИСИ.ключ);
  if (!ключ) {
    $('spisok-planov').replaceChildren();
    сказать('Вставь ключ общей базы — ⚙︎');
    показатьНастройки(true);
    return;
  }
  сказать('Загружаю…');
  try {
    const к = клиент({ ключ, ветка: взять(ЗАПИСИ.ветка) || 'main' });
    if (!взять(ЗАПИСИ.подпись)) положить(ЗАПИСИ.подпись, await к.кто());
    const планы = ближайшиеПланы(await прочитатьПланы(к), датаСтрокой(new Date()));
    нарисовать(планы);
    сказать(планы.length ? '' : 'Ближайших планов нет');
  } catch (беда) {
    сказать(беда.message || 'нет связи', true);
  }
}

$('knopka-nastroek').addEventListener('click', () => показатьНастройки($('nastroyki').hidden));
$('knopka-sohranit').addEventListener('click', () => {
  положить(ЗАПИСИ.ключ, $('pole-klyucha').value.trim());
  положить(ЗАПИСИ.подпись, $('pole-podpisi').value.trim());
  положить(ЗАПИСИ.ветка, $('pole-vetki').value.trim() || 'main');
  показатьНастройки(false);
  загрузить();
});
$('knopka-zabyt').addEventListener('click', () => {
  положить(ЗАПИСИ.ключ, '');
  $('pole-klyucha').value = '';
  загрузить();
});

загрузить();
