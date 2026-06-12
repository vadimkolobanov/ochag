import { describe, it, expect } from 'vitest';
import { parseBrestPage } from './rates.js';

// Упрощённый макет таблицы myfin.by/currency/usd/brest: в каждой строке банка
// первые две колонки — курс покупки/продажи в BYN, далее идут кросс-курсы,
// которые парсер обязан игнорировать.
const cell = (v: string) => `<td class="currencies-courses__currency-cell "><span>${v}</span></td>`;
const row = (buy: string, sell: string, cross: string) =>
  `<tr><td>Банк</td>${cell(buy)}${cell(sell)}${cell(cross)}${cell('1.17')}</tr>`;

const html = `
<table class="currencies-courses">
<tbody class="sort_body">
${row('2.810', '2.830', '1.164')}
${row('2.822', '2.829', '1.164')}
${row('2.780', '2.825', '1.170')}
</tbody></table>`;

describe('parseBrestPage', () => {
  it('лучший курс покупки = максимум первой колонки (без кросс-курсов)', () => {
    expect(parseBrestPage(html)).toEqual({ buy: 2.822, sell: 2.825 });
  });

  it('бросает ошибку, если таблицы нет', () => {
    expect(() => parseBrestPage('<html>пусто</html>')).toThrow();
  });
});
