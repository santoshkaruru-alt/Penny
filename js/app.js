import { store } from './store.js';
import { CATEGORIES, CATEGORY_BY_ID, icon, guessCategory, merchantKey } from './categories.js';
import { parseTransactions, toISODate } from './parser.js';
import { readImage, warmUp } from './ocr.js';

/* ------------------------------------------------------------------ helpers */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const S = () => store.state.settings;
const todayISO = () => toISODate(new Date());
const monthOf = (iso) => iso.slice(0, 7);
const net = (t) => (t.kind === 'refund' ? -t.amount : t.amount);
const sum = (list) => list.reduce((a, t) => a + net(t), 0);
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const daysIn = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const shiftMonth = (key, by) => { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1 + by, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

const fmtCache = new Map();
function money(n, opts = {}) {
  const cents = opts.cents ?? true;
  const k = `${S().currency}|${cents}`;
  if (!fmtCache.has(k)) {
    try {
      fmtCache.set(k, new Intl.NumberFormat(undefined, { style: 'currency', currency: S().currency, minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }));
    } catch {
      fmtCache.set(k, new Intl.NumberFormat(undefined, { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }));
    }
  }
  return fmtCache.get(k).format(opts.abs ? Math.abs(n) : n);
}
function moneyParts(n) {
  const f = new Intl.NumberFormat(undefined, { style: 'currency', currency: S().currency });
  let main = '', cents = '';
  let afterDecimal = false;
  for (const p of f.formatToParts(n)) {
    if (p.type === 'decimal') { afterDecimal = true; cents += p.value; continue; }
    if (afterDecimal && p.type === 'fraction') cents += p.value; else main += p.value;
  }
  return { main, cents };
}
function currencySymbol() {
  try {
    const p = new Intl.NumberFormat(undefined, { style: 'currency', currency: S().currency }).formatToParts(0).find((x) => x.type === 'currency');
    return p ? p.value : S().currency;
  } catch { return S().currency; }
}
const monthLabel = (key, style = 'long') => parseISO(`${key}-01`).toLocaleDateString(undefined, { month: style, year: key.slice(0, 4) === String(new Date().getFullYear()) ? undefined : 'numeric' });
function dayLabel(iso) {
  const t = todayISO();
  const y = toISODate(new Date(Date.now() - 864e5));
  if (iso === t) return 'Today';
  if (iso === y) return 'Yesterday';
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}
const shortDate = (iso) => parseISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function sortTx(list) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '') || b.createdAt - a.createdAt);
}
function byCategory(list) {
  const map = new Map();
  for (const t of list) {
    const c = map.get(t.category) || { id: t.category, total: 0, count: 0 };
    c.total += net(t);
    c.count += 1;
    map.set(t.category, c);
  }
  return [...map.values()].filter((c) => c.total > 0.004).sort((a, b) => b.total - a.total);
}
const cat = (id) => CATEGORY_BY_ID[id] || CATEGORY_BY_ID.other;

/* --------------------------------------------------------------------- state */

const ui = { tab: 'home', month: monthOf(todayISO()), query: '', filter: 'all' };
const view = $('#view');

/* ------------------------------------------------------------------- charts */

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return ([1, 2, 4, 5, 6, 8, 10].find((x) => n <= x) || 10) * p;
}
function topRoundedBar(x, y, w, h, r) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
/** data: [{label, value, tip, sub, on, tick}] */
function barChart(data, { height = 150, summary = '' } = {}) {
  const W = 340, H = height, top = 16, bottom = 22, left = 0, right = 34;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const step = plotW / data.length;
  const gap = Math.max(2, Math.min(10, step * 0.28));
  const bw = Math.max(2, step - gap);
  let bars = '';
  data.forEach((d, i) => {
    const x = left + i * step + gap / 2;
    const h = d.value > 0 ? Math.max(3, (d.value / max) * plotH) : 0;
    const y = top + plotH - h;
    bars += `<g><rect class="hit" x="${left + i * step}" y="${top}" width="${step}" height="${plotH + 4}" data-i="${i}"/>`;
    bars += h ? `<path class="bar${d.on ? ' on' : ''}" d="${topRoundedBar(x, y, bw, h, Math.min(4, bw / 2))}"/>` : `<rect class="bar" x="${x}" y="${top + plotH - 2}" width="${bw}" height="2" rx="1" opacity="${d.future ? '.25' : '.6'}"/>`;
    bars += '</g>';
    if (d.tick) bars += `<text class="axis" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  const grid = [0.5, 1].map((f) => {
    const y = top + plotH - f * plotH;
    return `<line class="grid" x1="${left}" x2="${W - right + 4}" y1="${y}" y2="${y}"/><text class="axis" x="${W}" y="${y + 3}" text-anchor="end">${esc(money(max * f, { cents: false }))}</text>`;
  }).join('');
  const base = `<line class="grid" x1="${left}" x2="${W - right + 4}" y1="${top + plotH}" y2="${top + plotH}"/>`;
  const tips = esc(JSON.stringify(data.map((d) => [d.tip, d.sub || ''])));
  return `<div class="chart" data-tips="${tips}" role="img" aria-label="${esc(summary)}">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${base}${bars}</svg>
    <div class="tip"></div></div>`;
}
function wireCharts(root) {
  $$('.chart', root).forEach((chart) => {
    const tips = JSON.parse(chart.dataset.tips || '[]');
    const tip = $('.tip', chart);
    const svg = $('svg', chart);
    let current = null;
    const show = (hit) => {
      if (current) current.nextElementSibling?.classList.remove('hover');
      current = hit;
      const i = +hit.dataset.i;
      const [a, b] = tips[i] || ['', ''];
      tip.innerHTML = `${esc(a)}${b ? `<small>${esc(b)}</small>` : ''}`;
      const bar = hit.nextElementSibling;
      bar?.classList.add('hover');
      const cr = chart.getBoundingClientRect();
      const br = (bar || hit).getBoundingClientRect();
      let x = br.left + br.width / 2 - cr.left;
      x = Math.max(50, Math.min(cr.width - 50, x));
      tip.style.left = `${x}px`;
      tip.style.top = `${Math.max(0, br.top - cr.top - 8)}px`;
      tip.classList.add('show');
    };
    const hide = () => { tip.classList.remove('show'); current?.nextElementSibling?.classList.remove('hover'); current = null; };
    svg.addEventListener('pointerover', (e) => { const h = e.target.closest('.hit'); if (h) show(h); });
    svg.addEventListener('pointerdown', (e) => { const h = e.target.closest('.hit'); if (h) show(h); });
    svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  });
}

/* -------------------------------------------------------------- components */

function txRow(t) {
  const c = cat(t.category);
  const bits = [c.name];
  if (t.card) bits.push(`•• ${t.card}`);
  else if (t.note) bits.push(t.note);
  return `<button class="tx" data-action="edit" data-id="${t.id}">
    <span class="icon-tile">${icon(c.icon, 19)}</span>
    <span class="who"><b>${esc(t.merchant)}</b><small>${esc(bits.join(' · '))}</small></span>
    <span class="amt num ${t.kind === 'refund' ? 'refund' : ''}">${t.kind === 'refund' ? '+' : ''}${esc(money(t.amount))}${t.time ? `<small>${esc(fmtTime(t.time))}</small>` : ''}</span>
  </button>`;
}
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function monthSwitch() {
  const isCurrent = ui.month >= monthOf(todayISO());
  return `<div class="month-switch">
    <button data-action="month" data-by="-1" aria-label="Previous month">${icon('chevL', 16)}</button>
    <span>${esc(monthLabel(ui.month, 'short'))}</span>
    <button data-action="month" data-by="1" aria-label="Next month" ${isCurrent ? 'disabled' : ''}>${icon('chevR', 16)}</button>
  </div>`;
}
function catRows(list, total, { clickable = false, limit = 99 } = {}) {
  const max = list[0]?.total || 1;
  return list.slice(0, limit).map((c) => {
    const k = cat(c.id);
    const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
    const tag = clickable ? 'button' : 'div';
    return `<${tag} class="cat-row" ${clickable ? `data-action="filter-cat" data-cat="${c.id}"` : ''}>
      <span class="icon-tile">${icon(k.icon, 18)}</span>
      <span class="meta"><span class="name"><span>${esc(k.name)}</span><span>${pct}%</span></span><span class="meter"><i style="width:${(c.total / max) * 100}%"></i></span></span>
      <span class="amt num">${esc(money(c.total))}</span>
    </${tag}>`;
  }).join('');
}

/* -------------------------------------------------------------------- views */

function greeting() {
  const h = new Date().getHours();
  const g = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return S().name ? `${g}, ${S().name}` : g;
}

function renderHome() {
  const all = store.state.transactions;
  if (!all.length) {
    view.innerHTML = `
      <header class="topbar"><div><div class="eyebrow">${esc(greeting())}</div><h1>Penny</h1></div></header>
      <section class="card empty">
        <div class="art">${icon('scan', 40)}</div>
        <h3>Snap a bank alert. Done.</h3>
        <p>Take a screenshot of the text or email your bank sends for each card purchase. Penny reads the amount, merchant and date for you, right on this device.</p>
        <div class="actions">
          <button class="btn primary" data-action="scan">${icon('image', 18)} Scan a screenshot</button>
          <button class="btn" data-action="manual">${icon('pen', 18)} Add one manually</button>
          <button class="btn" data-action="demo" style="background:none;color:var(--text-2)">${icon('sparkle', 18)} Explore with sample data</button>
        </div>
      </section>`;
    return;
  }
  const key = ui.month;
  const isCurrent = key === monthOf(todayISO());
  const list = all.filter((t) => monthOf(t.date) === key);
  const spent = sum(list);
  const prev = sum(all.filter((t) => monthOf(t.date) === shiftMonth(key, -1)));
  const nDays = daysIn(key);
  const dayNum = isCurrent ? new Date().getDate() : nDays;
  // Compare to the same point last month, so early-month numbers aren't misleading.
  const prevSamePoint = isCurrent
    ? sum(all.filter((t) => monthOf(t.date) === shiftMonth(key, -1) && +t.date.slice(8) <= dayNum))
    : prev;
  const delta = prevSamePoint > 0 ? ((spent - prevSamePoint) / prevSamePoint) * 100 : null;
  const budget = Number(S().monthlyBudget) || 0;
  const left = budget - spent;
  const daysLeft = isCurrent ? nDays - dayNum + 1 : 0;
  const { main, cents } = moneyParts(spent);

  const today = isCurrent ? sum(list.filter((t) => t.date === todayISO())) : null;
  const weekStart = toISODate(new Date(Date.now() - 6 * 864e5));
  const week = isCurrent ? sum(all.filter((t) => t.date >= weekStart && t.date <= todayISO())) : null;
  const avg = spent / Math.max(1, dayNum);

  let budgetHtml = '';
  if (budget > 0) {
    const pct = Math.min(100, (spent / budget) * 100);
    budgetHtml = `<div class="progress ${left < 0 ? 'over' : ''}"><i style="width:${pct}%"></i></div>
      <div class="hero-foot">
        <span>${left >= 0 ? `<b class="num">${esc(money(left, { cents: false }))}</b> <span class="dim">left of ${esc(money(budget, { cents: false }))}</span>` : `<b class="num">${esc(money(-left, { cents: false }))}</b> <span class="dim">over budget</span>`}</span>
        ${isCurrent && left > 0 ? `<span class="dim"><b class="num" style="opacity:1">${esc(money(left / daysLeft, { cents: false }))}</b>/day</span>` : `<span class="dim">${Math.round((spent / budget) * 100)}% used</span>`}
      </div>`;
  } else {
    budgetHtml = `<button class="hero-cta" data-action="set-budget">${icon('plus', 15)} Set a monthly budget</button>`;
  }

  const dayData = [];
  for (let d = 1; d <= nDays; d += 1) {
    const iso = `${key}-${String(d).padStart(2, '0')}`;
    const items = list.filter((t) => t.date === iso);
    const v = Math.max(0, sum(items));
    const future = isCurrent && d > dayNum;
    dayData.push({ label: String(d), value: v, future, tip: future ? 'Upcoming' : money(v), sub: `${shortDate(iso)}${future ? '' : ` · ${items.length} ${items.length === 1 ? 'purchase' : 'purchases'}`}`, on: !isCurrent || iso === todayISO(), tick: d === 1 || d % 5 === 0 });
  }
  const cats = byCategory(list);
  const recent = sortTx(list).slice(0, 6);

  view.innerHTML = `
    <header class="topbar"><div><div class="eyebrow">${esc(greeting())}</div><h1>Overview</h1></div>${monthSwitch()}</header>
    <section class="hero">
      <div class="hero-label">Spent in ${esc(monthLabel(key))}${delta != null && Math.abs(delta) >= 1 ? `<span class="chip-delta">${delta > 0 ? '↑' : '↓'} ${Math.abs(Math.round(delta))}% vs last month</span>` : ''}</div>
      <div class="hero-amount num">${esc(main)}<span class="cents">${esc(cents)}</span></div>
      ${budgetHtml}
    </section>
    <section class="stats">
      ${isCurrent
        ? `<div class="stat"><div class="k">Today</div><div class="v num">${esc(money(today, { cents: false }))}</div></div>
           <div class="stat"><div class="k">Last 7 days</div><div class="v num">${esc(money(week, { cents: false }))}</div></div>`
        : `<div class="stat"><div class="k">Purchases</div><div class="v num">${list.filter((t) => t.kind !== 'refund').length}</div></div>
           <div class="stat"><div class="k">vs prior</div><div class="v num">${delta == null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta)}%`}</div></div>`}
      <div class="stat"><div class="k">Daily avg</div><div class="v num">${esc(money(avg, { cents: false }))}</div></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Daily spending</h2><span class="faint" style="font-size:12px">${esc(monthLabel(key, 'short'))}</span></div>
      ${barChart(dayData, { summary: `Daily spending for ${monthLabel(key)}` })}
    </section>
    ${cats.length ? `<section class="card">
      <div class="card-head"><h2>Where it went</h2><button class="link" data-action="goto" data-tab="insights">Details</button></div>
      ${catRows(cats, spent, { clickable: true, limit: 5 })}
    </section>` : ''}
    <section class="card">
      <div class="card-head"><h2>Recent</h2><button class="link" data-action="goto" data-tab="activity">See all</button></div>
      ${recent.length ? `<div class="tx-list">${recent.map(txRow).join('')}</div>` : `<p class="muted" style="margin:0">No expenses in ${esc(monthLabel(key))} yet.</p>`}
    </section>`;
  wireCharts(view);
}

function renderActivity() {
  const q = ui.query.trim().toLowerCase();
  let list = store.state.transactions;
  if (!q) list = list.filter((t) => monthOf(t.date) === ui.month);
  if (q) list = list.filter((t) => `${t.merchant} ${cat(t.category).name} ${t.note} ${t.card || ''} ${t.amount}`.toLowerCase().includes(q));
  const monthList = store.state.transactions.filter((t) => monthOf(t.date) === ui.month);
  const present = new Set((q ? list : monthList).map((t) => t.category));
  if (ui.filter !== 'all') list = list.filter((t) => t.category === ui.filter);
  const sorted = sortTx(list);
  const groups = [];
  for (const t of sorted) {
    if (!groups.length || groups[groups.length - 1].date !== t.date) groups.push({ date: t.date, items: [] });
    groups[groups.length - 1].items.push(t);
  }
  const chips = [`<button class="chip ${ui.filter === 'all' ? 'on' : ''}" data-action="filter" data-cat="all">All</button>`]
    .concat(CATEGORIES.filter((c) => present.has(c.id) || ui.filter === c.id).map((c) => `<button class="chip ${ui.filter === c.id ? 'on' : ''}" data-action="filter" data-cat="${c.id}">${icon(c.icon, 15)}${esc(c.name)}</button>`))
    .join('');

  view.innerHTML = `
    <header class="topbar"><div><div class="eyebrow">${q ? 'Searching all months' : esc(monthLabel(ui.month))}</div><h1>Activity</h1></div>${q ? '' : monthSwitch()}</header>
    <label class="search">${icon('search', 18)}<input id="q" type="search" placeholder="Search merchant, category, amount" value="${esc(ui.query)}" autocomplete="off"><span class="sr-only">Search</span></label>
    <div class="chips">${chips}</div>
    ${sorted.length ? `<div class="summary-line"><span>${sorted.length} ${sorted.length === 1 ? 'transaction' : 'transactions'}</span><span class="num">${esc(money(sum(sorted)))}</span></div>` : ''}
    <div>${groups.length ? groups.map((g) => `
      <div class="day-head"><span>${esc(dayLabel(g.date))}</span><span class="num">${esc(money(sum(g.items)))}</span></div>
      <div class="tx-list">${g.items.map(txRow).join('')}</div>`).join('')
      : `<div class="card empty"><div class="art">${icon(q ? 'search' : 'list', 36)}</div><h3>${q ? 'No matches' : 'Nothing here yet'}</h3><p>${q ? 'Try another merchant or amount.' : 'Scan a bank alert or add an expense to see it here.'}</p>${q ? '' : `<div class="actions"><button class="btn primary" data-action="open-add">${icon('plus', 18)} Add expense</button></div>`}</div>`}
    </div>`;
  const input = $('#q');
  input.addEventListener('input', () => {
    ui.query = input.value;
    const pos = input.selectionStart;
    render();
    const again = $('#q');
    again.focus();
    try { again.setSelectionRange(pos, pos); } catch { /* type=search may not support it */ }
  });
}

function renderInsights() {
  const all = store.state.transactions;
  const key = ui.month;
  const list = all.filter((t) => monthOf(t.date) === key);
  const spent = sum(list);
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const k = shiftMonth(key, -i);
    const v = Math.max(0, sum(all.filter((t) => monthOf(t.date) === k)));
    months.push({ key: k, label: parseISO(`${k}-01`).toLocaleDateString(undefined, { month: 'short' }), value: v, tip: money(v), sub: monthLabel(k), on: k === key, tick: true });
  }
  const cats = byCategory(list);
  const merchants = new Map();
  for (const t of list) {
    const k = merchantKey(t.merchant) || t.merchant;
    const m = merchants.get(k) || { name: t.merchant, total: 0, count: 0 };
    m.total += net(t);
    m.count += 1;
    merchants.set(k, m);
  }
  const topM = [...merchants.values()].filter((m) => m.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  const purchases = list.filter((t) => t.kind !== 'refund');
  const biggest = purchases.reduce((a, t) => (!a || t.amount > a.amount ? t : a), null);
  const isCurrent = key === monthOf(todayISO());
  const dayCount = isCurrent ? new Date().getDate() : daysIn(key);
  const sixAvg = months.slice(0, 5).filter((m) => m.value > 0);
  const avgPrior = sixAvg.length ? sixAvg.reduce((a, m) => a + m.value, 0) / sixAvg.length : 0;

  view.innerHTML = `
    <header class="topbar"><div><div class="eyebrow">${esc(monthLabel(key))}</div><h1>Insights</h1></div>${monthSwitch()}</header>
    <section class="kv">
      <div class="stat"><div class="k">Total spent</div><div class="v num">${esc(money(spent))}</div><small>${purchases.length} purchases</small></div>
      <div class="stat"><div class="k">Per day</div><div class="v num">${esc(money(spent / Math.max(1, dayCount)))}</div><small>over ${dayCount} days</small></div>
      <div class="stat"><div class="k">Biggest purchase</div><div class="v num">${biggest ? esc(money(biggest.amount)) : '—'}</div><small>${biggest ? esc(biggest.merchant) : 'None yet'}</small></div>
      <div class="stat"><div class="k">Typical month</div><div class="v num">${avgPrior ? esc(money(avgPrior, { cents: false })) : '—'}</div><small>${avgPrior ? 'average of prior months' : 'not enough history'}</small></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Last 6 months</h2></div>
      ${barChart(months, { height: 160, summary: 'Monthly spending, last six months' })}
      <details class="table-toggle"><summary>Show as table</summary>
        <table class="data-table"><tbody>${months.map((m) => `<tr><td>${esc(m.sub)}</td><td class="num">${esc(money(m.value))}</td></tr>`).join('')}</tbody></table>
      </details>
    </section>
    <section class="card">
      <div class="card-head"><h2>By category</h2><span class="faint" style="font-size:12px">tap to see items</span></div>
      ${cats.length ? catRows(cats, spent, { clickable: true }) : '<p class="muted" style="margin:0">No spending this month.</p>'}
    </section>
    <section class="card">
      <div class="card-head"><h2>Top merchants</h2></div>
      ${topM.length ? topM.map((m, i) => `<div class="rank"><span class="n">${i + 1}</span><span class="m">${esc(m.name)}<small>${m.count}×</small></span><span class="num" style="font-weight:650">${esc(money(m.total))}</span></div>`).join('') : '<p class="muted" style="margin:0">No merchants yet.</p>'}
    </section>`;
  wireCharts(view);
}

function renderSettings() {
  const s = S();
  const rules = Object.entries(store.state.rules);
  const hasDemo = store.state.transactions.some((t) => t.source === 'demo');
  const currencies = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED', 'JPY', 'NZD', 'CHF'];
  if (!currencies.includes(s.currency)) currencies.unshift(s.currency);
  view.innerHTML = `
    <header class="topbar"><div><div class="eyebrow">Make it yours</div><h1>Settings</h1></div></header>
    <div class="privacy">${icon('check', 18)}<div><b>Private by design.</b> Screenshots are read on this device and never uploaded. Your data lives only in this browser, so export a backup now and then.</div></div>

    <div class="set-label">Budget</div>
    <div class="set-group">
      <label class="set-row"><span class="l"><span class="icon-tile accent">${icon('chart', 18)}</span><span><b>Monthly budget</b><small>Leave at 0 to hide</small></span></span>
        <input class="input num" id="set-budget" type="number" inputmode="decimal" min="0" step="10" value="${s.monthlyBudget || ''}" placeholder="0"></label>
      <label class="set-row"><span class="l"><span class="icon-tile">${icon('card', 18)}</span><span><b>Currency</b></span></span>
        <select class="select" id="set-currency">${currencies.map((c) => `<option ${c === s.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="set-row"><span class="l"><span class="icon-tile">${icon('pen', 18)}</span><span><b>Your name</b><small>For the greeting</small></span></span>
        <input class="input" id="set-name" type="text" value="${esc(s.name)}" placeholder="Optional" autocomplete="given-name"></label>
    </div>

    <div class="set-label">Reading screenshots</div>
    <div class="set-group">
      <div class="set-row"><span class="l"><span><b>Date order in alerts</b><small>How your bank writes 03/11</small></span></span>
        <div class="seg" style="min-width:170px"><button data-action="dayfirst" data-v="0" class="${!s.dayFirst ? 'on' : ''}">MM/DD</button><button data-action="dayfirst" data-v="1" class="${s.dayFirst ? 'on' : ''}">DD/MM</button></div></div>
      <button class="set-row" data-action="rules"><span class="l"><span><b>Learned merchants</b><small>Penny remembers the category you pick for each merchant</small></span></span><span class="faint num">${rules.length} ${icon('chevR', 16)}</span></button>
    </div>

    <div class="set-label">Appearance</div>
    <div class="set-group">
      <div class="set-row"><span class="l"><span><b>Theme</b></span></span>
        <div class="seg" style="min-width:200px">${['auto', 'light', 'dark'].map((t) => `<button data-action="theme" data-v="${t}" class="${s.theme === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
    </div>

    <div class="set-label">Your data</div>
    <div class="set-group">
      <button class="set-row" data-action="export-csv"><span class="l"><span class="icon-tile">${icon('download', 18)}</span><span><b>Export CSV</b><small>Open in Excel, Numbers or Sheets</small></span></span>${icon('chevR', 16)}</button>
      <button class="set-row" data-action="export-json"><span class="l"><span class="icon-tile">${icon('download', 18)}</span><span><b>Back up</b><small>Save everything to a file</small></span></span>${icon('chevR', 16)}</button>
      <button class="set-row" data-action="import"><span class="l"><span class="icon-tile">${icon('upload', 18)}</span><span><b>Restore from backup</b></span></span>${icon('chevR', 16)}</button>
      ${hasDemo ? `<button class="set-row" data-action="remove-demo"><span class="l"><span class="icon-tile">${icon('sparkle', 18)}</span><span><b>Remove sample data</b></span></span>${icon('chevR', 16)}</button>` : ''}
      <button class="set-row danger" data-action="erase"><span class="l"><span class="icon-tile">${icon('trash', 18)}</span><span><b>Erase all expenses</b></span></span></button>
    </div>
    <p class="hint">Penny ${store.state.transactions.length ? `· ${store.state.transactions.length} expenses stored` : ''}</p>`;

  $('#set-budget').addEventListener('change', (e) => store.setSettings({ monthlyBudget: Math.max(0, Number(e.target.value) || 0) }));
  $('#set-currency').addEventListener('change', (e) => { fmtCache.clear(); store.setSettings({ currency: e.target.value }); });
  $('#set-name').addEventListener('change', (e) => store.setSettings({ name: e.target.value.trim() }));
}

const RENDERERS = { home: renderHome, activity: renderActivity, insights: renderInsights, settings: renderSettings };
function render() {
  RENDERERS[ui.tab]();
  $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
}
function go(tab) {
  if (ui.tab !== tab) { ui.tab = tab; window.scrollTo({ top: 0 }); }
  render();
}

/* ------------------------------------------------------------------- sheets */

let activeSheet = null;
function openSheet({ title, sub = '', body = '', foot = '', onClose }) {
  if (activeSheet) activeSheet.close(true);
  const root = $('#sheet-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-grip"></div>
      <div class="sheet-head"><div><h3>${esc(title)}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}</div><button class="icon-btn" data-close aria-label="Close">${icon('close', 16)}</button></div>
      <div class="sheet-body">${body}</div>
      ${foot ? `<div class="sheet-foot">${foot}</div>` : ''}
    </div>`;
  root.appendChild(wrap);
  document.body.style.overflow = 'hidden';
  const api = {
    el: wrap,
    body: $('.sheet-body', wrap),
    foot: $('.sheet-foot', wrap),
    setTitle(t, s) { $('.sheet-head h3', wrap).textContent = t; const sb = $('.sheet-head .sub', wrap); if (sb && s != null) sb.innerHTML = s; },
    close(instant = false) {
      if (api.closed) return;
      api.closed = true;
      if (activeSheet === api) activeSheet = null;
      onClose?.();
      document.removeEventListener('keydown', onKey);
      if (!activeSheet) document.body.style.overflow = '';
      if (instant) { wrap.remove(); return; }
      $('.sheet', wrap).classList.add('closing');
      $('.sheet-backdrop', wrap).classList.add('closing');
      setTimeout(() => wrap.remove(), 220);
    },
  };
  const onKey = (e) => { if (e.key === 'Escape') api.close(); };
  document.addEventListener('keydown', onKey);
  $('.sheet-backdrop', wrap).addEventListener('click', () => api.close());
  $('[data-close]', wrap).addEventListener('click', () => api.close());
  activeSheet = api;
  return api;
}

let toastTimer;
function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  if (action) $('button', el).onclick = () => { action.run(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2600);
}

/* --------------------------------------------------------------- add sheet */

function openAdd() {
  warmUp(); // start loading the text reader so a scan feels instant
  openSheet({
    title: 'Add expense',
    sub: 'Screenshots are read on this device',
    body: `
      <button class="option featured" data-action="scan"><span class="icon-tile">${icon('image', 22)}</span><span><b>Scan screenshots</b><small>Bank texts, card app or email alerts. Pick several at once.</small></span>${icon('chevR', 18)}</button>
      <button class="option" data-action="paste"><span class="icon-tile">${icon('text', 22)}</span><span><b>Paste alert text</b><small>Copy the message and paste it in</small></span>${icon('chevR', 18)}</button>
      <button class="option" data-action="manual"><span class="icon-tile">${icon('pen', 22)}</span><span><b>Enter manually</b><small>Cash or anything without an alert</small></span>${icon('chevR', 18)}</button>
      <p class="hint">Tip: paste a screenshot with <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>V</kbd> or drop it anywhere. On Android, share a screenshot straight to Penny once it's installed.</p>`,
  });
}

function pickFiles() {
  const input = $('#file-input');
  input.value = '';
  input.click();
}

function fileDate(f) {
  const t = f && f.lastModified;
  if (!t) return new Date();
  const age = Date.now() - t;
  return age >= 0 && age < 400 * 864e5 ? new Date(t) : new Date();
}

async function scanFiles(fileList) {
  const files = [...fileList].filter((f) => f && f.type && f.type.startsWith('image/'));
  if (!files.length) { toast('Those files are not images'); return; }
  const urls = files.map((f) => URL.createObjectURL(f));
  const sheet = openSheet({
    title: files.length > 1 ? `Reading ${files.length} screenshots` : 'Reading screenshot',
    sub: 'On-device text recognition. Nothing is uploaded.',
    body: `<div class="scan-stage">${files.map((f, i) => `
      <div class="scan-item" data-i="${i}"><div class="thumb"><img src="${urls[i]}" alt=""><div class="beam"></div></div>
      <div><b>${esc(f.name && !/^image\.\w+$/.test(f.name) ? f.name : `Screenshot ${i + 1}`)}</b><div class="st">Waiting…</div><div class="bar-mini"><i></i></div></div></div>`).join('')}</div>`,
    onClose: () => { cancelled = true; setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 500); },
  });
  let cancelled = false;
  const found = [];
  const texts = [];
  for (let i = 0; i < files.length; i += 1) {
    if (cancelled) return;
    const item = $(`.scan-item[data-i="${i}"]`, sheet.el);
    const st = $('.st', item);
    const bar = $('.bar-mini i', item);
    item.classList.add('active');
    st.textContent = 'Starting the reader…';
    try {
      const text = await readImage(files[i], (p) => {
        if (p.stage === 'load') { st.textContent = 'Loading the reader (first time only)…'; bar.style.width = `${Math.round(p.progress * 30)}%`; }
        else { st.textContent = `Reading text… ${Math.round(p.progress * 100)}%`; bar.style.width = `${30 + Math.round(p.progress * 70)}%`; }
      });
      texts.push(text);
      const tx = parseTransactions(text, { ref: new Date(), fallbackDate: fileDate(files[i]), dayFirst: S().dayFirst });
      tx.forEach((t) => found.push({ ...t, source: 'scan', shot: i }));
      bar.style.width = '100%';
      item.classList.remove('active');
      item.classList.add('done');
      st.textContent = tx.length ? `Found ${tx.length} ${tx.length === 1 ? 'transaction' : 'transactions'}` : 'No transaction found';
    } catch (err) {
      console.error(err);
      texts.push('');
      item.classList.remove('active');
      item.classList.add('fail');
      st.textContent = 'Could not read this image';
    }
  }
  if (cancelled) return;
  await new Promise((r) => setTimeout(r, 350));
  openReview(found, texts);
}

function openPaste() {
  const sheet = openSheet({
    title: 'Paste alert text',
    sub: 'One or many messages. Penny finds each purchase.',
    body: `<textarea class="input" id="paste-text" placeholder="e.g. Chase: You made a $45.67 transaction with STARBUCKS on Nov 3, 2026 at 8:15 AM ET."></textarea>`,
    foot: `<button class="btn primary" id="paste-go">${icon('sparkle', 18)} Find expenses</button>`,
  });
  const ta = $('#paste-text', sheet.el);
  setTimeout(() => ta.focus(), 250);
  $('#paste-go', sheet.el).addEventListener('click', () => {
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    openReview(parseTransactions(text, { ref: new Date(), dayFirst: S().dayFirst }).map((t) => ({ ...t, source: 'text' })), [text]);
  });
}

/* ------------------------------------------------------------------ review */

function openReview(found, texts = []) {
  // Also catch the same alert appearing in two screenshots of one batch.
  const seen = new Set();
  const sig = (t) => `${t.date}|${t.amount}|${merchantKey(t.merchant)}`;
  const items = found.map((t) => {
    const category = guessCategory(t.merchant, store.state.rules);
    const dup = store.findDuplicate(t) || seen.has(sig(t));
    seen.add(sig(t));
    const usable = t.kind === 'expense' || t.kind === 'refund';
    return { ...t, category, dup: Boolean(dup), include: usable && !dup, kind: t.kind === 'refund' ? 'refund' : t.kind };
  });
  const rawText = texts.filter(Boolean).join('\n\n— — —\n\n');

  if (!items.length) {
    const sheet = openSheet({
      title: 'No purchase found',
      sub: 'The text did not look like a card alert',
      body: `<div class="empty" style="padding:10px 0 4px"><div class="art">${icon('alert', 36)}</div>
        <p>Try a screenshot where the alert text is clearly visible and not cropped, or add it manually.</p></div>
        ${rawText ? `<details class="raw"><summary>Text Penny read</summary><pre>${esc(rawText)}</pre></details>` : ''}`,
      foot: `<button class="btn" data-action="scan">Try another</button><button class="btn primary" data-action="manual">Enter manually</button>`,
    });
    return sheet;
  }

  // If this is the first data and the alerts use another currency, adopt it.
  const detected = items.find((t) => t.currency)?.currency;
  if (detected && detected !== S().currency && !store.state.transactions.length) {
    fmtCache.clear();
    store.setSettings({ currency: detected });
    toast(`Currency set to ${detected}`);
  }

  const catOptions = (sel) => CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const badgeFor = (t) => {
    const b = [];
    if (t.dup) b.push(`<span class="badge warn">${icon('alert', 13)} Looks like a duplicate</span>`);
    if (t.kind === 'refund') b.push(`<span class="badge good">Refund</span>`);
    if (t.kind === 'payment') b.push(`<span class="badge">Card payment, not spending</span>`);
    if (t.kind === 'declined') b.push(`<span class="badge bad">Declined</span>`);
    if (t.kind === 'otp') b.push(`<span class="badge">One-time code, may not be a purchase</span>`);
    if (t.currency && t.currency !== S().currency) b.push(`<span class="badge warn">${esc(t.currency)} detected</span>`);
    if (!t.dateFound) b.push(`<span class="badge">Date guessed</span>`);
    if (!t.merchant) b.push(`<span class="badge warn">Merchant needed</span>`);
    if (t.card) b.push(`<span class="badge">${icon('card', 13)} ${t.issuer ? `${esc(t.issuer)} ` : ''}•• ${esc(t.card)}</span>`);
    return b.join('');
  };
  const card = (t, i) => `
    <div class="review ${t.include ? '' : 'off'} ${t.merchant ? '' : 'editing'}" data-i="${i}">
      <div class="review-top">
        <button class="toggle ${t.include ? 'on' : ''}" data-toggle aria-label="Include">${icon('check', 15)}</button>
        <div class="title"><b>${esc(t.merchant || 'Unknown merchant')}</b><small>${esc(shortDate(t.date))}${t.time ? ` · ${esc(fmtTime(t.time))}` : ''}</small></div>
        <div class="big num">${t.kind === 'refund' ? '+' : ''}${esc(money(t.amount))}</div>
      </div>
      <div class="badges">${badgeFor(t)}</div>
      <div class="review-quick">
        <select class="select" data-f="category" aria-label="Category">${catOptions(t.category)}</select>
        <button class="btn sm" data-edit>${icon('pen', 15)} Edit</button>
      </div>
      <div class="review-fields">
        <label class="field"><span>Amount</span><input class="input num" data-f="amount" type="number" inputmode="decimal" step="0.01" min="0" value="${t.amount}"></label>
        <label class="field"><span>Date</span><input class="input" data-f="date" type="date" value="${t.date}" max="${todayISO()}"></label>
        <label class="field full"><span>Merchant</span><input class="input" data-f="merchant" type="text" value="${esc(t.merchant)}" placeholder="Where did you spend?"></label>
      </div>
    </div>`;

  const sheet = openSheet({
    title: 'Review',
    sub: '',
    body: `${items.map(card).join('')}${rawText ? `<details class="raw"><summary>Text Penny read</summary><pre>${esc(rawText)}</pre></details>` : ''}`,
    foot: `<button class="btn primary" id="review-save"></button>`,
  });
  const btn = $('#review-save', sheet.el);
  const refresh = () => {
    const n = items.filter((t) => t.include).length;
    const total = items.filter((t) => t.include).reduce((a, t) => a + net(t), 0);
    btn.disabled = n === 0;
    btn.innerHTML = n ? `${icon('check', 18)} Add ${n} ${n === 1 ? 'expense' : 'expenses'} · ${esc(money(total))}` : 'Select something to add';
    sheet.setTitle(`Found ${items.length} ${items.length === 1 ? 'transaction' : 'transactions'}`, 'Check the details, then add');
  };
  refresh();
  sheet.body.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { ed.closest('.review').classList.toggle('editing'); return; }
    const tg = e.target.closest('[data-toggle]');
    if (!tg) return;
    const el = tg.closest('.review');
    const t = items[+el.dataset.i];
    t.include = !t.include;
    el.classList.toggle('off', !t.include);
    tg.classList.toggle('on', t.include);
    refresh();
  });
  sheet.body.addEventListener('input', (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    const el = e.target.closest('.review');
    const t = items[+el.dataset.i];
    t[f] = f === 'amount' ? Number(e.target.value) || 0 : e.target.value;
    if (f === 'merchant') {
      if (!t.categoryTouched) { t.category = guessCategory(t.merchant, store.state.rules); $('[data-f="category"]', el).value = t.category; }
      $('.title b', el).textContent = t.merchant || 'Unknown merchant';
    }
    if (f === 'category') t.categoryTouched = true;
    if (f === 'amount') $('.big', el).textContent = `${t.kind === 'refund' ? '+' : ''}${money(t.amount)}`;
    if (f === 'date' && t.date) $('.title small', el).textContent = shortDate(t.date) + (t.time ? ` · ${fmtTime(t.time)}` : '');
    refresh();
  });
  btn.addEventListener('click', () => {
    const chosen = items.filter((t) => t.include && t.amount > 0 && t.date);
    if (!chosen.length) return;
    store.addTransactions(chosen.map((t) => ({ ...t, kind: t.kind === 'refund' ? 'refund' : 'expense', merchant: t.merchant || 'Unknown' })));
    sheet.close();
    const latest = chosen.map((t) => t.date).sort().pop();
    ui.month = monthOf(latest);
    toast(`Added ${chosen.length} ${chosen.length === 1 ? 'expense' : 'expenses'}`);
    render();
  });
  return sheet;
}

/* ------------------------------------------------------------------ editor */

function openEditor(tx) {
  const isNew = !tx;
  const d = tx ? { ...tx } : { amount: '', merchant: '', category: 'other', date: todayISO(), note: '', kind: 'expense' };
  let touched = !isNew;
  const sheet = openSheet({
    title: isNew ? 'New expense' : 'Edit expense',
    sub: tx && tx.source === 'scan' ? 'Added from a screenshot' : '',
    body: `
      <div class="seg" style="max-width:240px;margin:0 auto 4px"><button data-kind="expense" class="${d.kind !== 'refund' ? 'on' : ''}">Expense</button><button data-kind="refund" class="${d.kind === 'refund' ? 'on' : ''}">Refund</button></div>
      <div class="amount-input"><span class="cur">${esc(currencySymbol())}</span><input id="ed-amount" class="num" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${d.amount}"></div>
      <div class="form-grid">
        <label class="field"><span>Merchant</span><input class="input" id="ed-merchant" type="text" value="${esc(d.merchant)}" placeholder="e.g. Whole Foods" autocomplete="off"></label>
        <div class="field"><span>Category</span><div class="cat-grid">${CATEGORIES.map((c) => `<button class="cat-pick ${c.id === d.category ? 'on' : ''}" data-cat="${c.id}">${icon(c.icon, 20)}${esc(c.name)}</button>`).join('')}</div></div>
        <div class="two">
          <label class="field"><span>Date</span><input class="input" id="ed-date" type="date" value="${d.date}" max="${todayISO()}"></label>
          <label class="field"><span>Card</span><input class="input" id="ed-card" type="text" inputmode="numeric" maxlength="4" value="${esc(d.card || '')}" placeholder="Last 4"></label>
        </div>
        <label class="field"><span>Note</span><input class="input" id="ed-note" type="text" value="${esc(d.note || '')}" placeholder="Optional"></label>
      </div>`,
    foot: `${isNew ? '' : `<button class="btn danger" id="ed-del" style="flex:0 0 auto;width:52px;padding:0" aria-label="Delete">${icon('trash', 19)}</button>`}<button class="btn primary" id="ed-save">${isNew ? 'Add expense' : 'Save changes'}</button>`,
  });
  const el = sheet.el;
  autosize($('#ed-amount', el));
  if (isNew) setTimeout(() => $('#ed-amount', el).focus(), 280);
  $$('[data-kind]', el).forEach((b) => b.addEventListener('click', () => {
    d.kind = b.dataset.kind;
    $$('[data-kind]', el).forEach((x) => x.classList.toggle('on', x === b));
  }));
  $$('.cat-pick', el).forEach((b) => b.addEventListener('click', () => {
    d.category = b.dataset.cat;
    touched = true;
    $$('.cat-pick', el).forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('#ed-merchant', el).addEventListener('input', (e) => {
    if (touched) return;
    const g = guessCategory(e.target.value, store.state.rules);
    d.category = g;
    $$('.cat-pick', el).forEach((x) => x.classList.toggle('on', x.dataset.cat === g));
  });
  $('#ed-save', el).addEventListener('click', () => {
    const amount = Number($('#ed-amount', el).value);
    if (!(amount > 0)) { $('#ed-amount', el).focus(); toast('Enter an amount'); return; }
    const patch = {
      amount,
      merchant: $('#ed-merchant', el).value.trim() || 'Unknown',
      category: d.category,
      date: $('#ed-date', el).value || todayISO(),
      card: $('#ed-card', el).value.replace(/\D/g, '').slice(0, 4) || null,
      note: $('#ed-note', el).value.trim(),
      kind: d.kind,
    };
    if (isNew) store.addTransactions([{ ...patch, source: 'manual' }]);
    else store.updateTransaction(tx.id, patch);
    sheet.close();
    ui.month = monthOf(patch.date);
    toast(isNew ? 'Expense added' : 'Saved');
    render();
  });
  $('#ed-del', el)?.addEventListener('click', () => {
    const copy = { ...tx };
    store.deleteTransaction(tx.id);
    sheet.close();
    render();
    toast('Expense deleted', { label: 'Undo', run: () => { store.restore(copy); render(); } });
  });
}

function autosize(input) {
  const fit = () => { input.style.width = `${Math.max(3, (input.value || input.placeholder).length + 0.6)}ch`; };
  input.addEventListener('input', fit);
  fit();
}

/* -------------------------------------------------------------- misc flows */

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function openRules() {
  const rules = Object.entries(store.state.rules).sort((a, b) => a[0].localeCompare(b[0]));
  const sheet = openSheet({
    title: 'Learned merchants',
    sub: 'Used to pre-fill the category next time',
    body: rules.length ? rules.map(([k, c]) => `<div class="rule"><span><b>${esc(k)}</b> <span class="muted">→ ${esc(cat(c).name)}</span></span><button class="icon-btn" data-forget="${esc(k)}" aria-label="Forget">${icon('close', 14)}</button></div>`).join('')
      : '<p class="muted">Nothing learned yet. When you pick a category for a merchant, Penny remembers it.</p>',
  });
  sheet.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-forget]');
    if (!b) return;
    store.forgetRule(b.dataset.forget);
    b.closest('.rule').remove();
  });
}

function setBudgetPrompt() {
  const sheet = openSheet({
    title: 'Monthly budget',
    sub: 'How much do you want to spend each month?',
    body: `<div class="amount-input"><span class="cur">${esc(currencySymbol())}</span><input id="bud" class="num" type="number" inputmode="decimal" min="0" step="10" placeholder="0" value="${S().monthlyBudget || ''}"></div>`,
    foot: `<button class="btn primary" id="bud-save">Save budget</button>`,
  });
  autosize($('#bud', sheet.el));
  setTimeout(() => $('#bud', sheet.el).focus(), 280);
  const save = () => { store.setSettings({ monthlyBudget: Math.max(0, Number($('#bud', sheet.el).value) || 0) }); sheet.close(); render(); };
  $('#bud-save', sheet.el).addEventListener('click', save);
  $('#bud', sheet.el).addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}

function loadDemo() {
  const M = [
    ['Whole Foods Market', 'groceries', 35, 140], ["Trader Joe's", 'groceries', 25, 90], ['Starbucks', 'dining', 4, 9], ['Sweetgreen', 'dining', 12, 19],
    ['Chipotle', 'dining', 11, 16], ['Uber', 'transport', 9, 38], ['Shell', 'fuel', 35, 65], ['Amazon.com', 'shopping', 12, 120], ['Target', 'shopping', 18, 95],
    ['Netflix', 'subscriptions', 15.49, 15.49], ['Spotify', 'subscriptions', 11.99, 11.99], ['CVS Pharmacy', 'health', 8, 45], ['AMC Theatres', 'entertainment', 18, 42],
    ['Comcast Xfinity', 'bills', 79.99, 79.99], ['Home Depot', 'home', 20, 160], ['DoorDash', 'dining', 22, 48], ['Blue Bottle Coffee', 'dining', 5, 8],
  ];
  const cards = ['4821', '1001', '7723'];
  const txs = [];
  const now = new Date();
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let back = 0; back < 80; back += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const n = 1 + Math.floor(rnd() * 2.6);
    for (let k = 0; k < n; k += 1) {
      const [merchant, category, lo, hi] = M[Math.floor(rnd() * M.length)];
      if (category === 'subscriptions' || category === 'bills') continue;
      txs.push({ merchant, category, amount: Math.round((lo + rnd() * (hi - lo)) * 100) / 100, date: toISODate(day), time: `${String(8 + Math.floor(rnd() * 13)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`, card: cards[Math.floor(rnd() * 3)], source: 'demo', learn: false });
    }
    if (day.getDate() === 3) txs.push({ merchant: 'Netflix', category: 'subscriptions', amount: 15.49, date: toISODate(day), card: '4821', source: 'demo', learn: false });
    if (day.getDate() === 9) txs.push({ merchant: 'Spotify', category: 'subscriptions', amount: 11.99, date: toISODate(day), card: '1001', source: 'demo', learn: false });
    if (day.getDate() === 15) txs.push({ merchant: 'Comcast Xfinity', category: 'bills', amount: 79.99, date: toISODate(day), card: '7723', source: 'demo', learn: false });
  }
  store.addTransactions(txs);
  if (!S().monthlyBudget) store.setSettings({ monthlyBudget: 2500 });
  toast('Sample data loaded. Remove it any time in Settings.');
  render();
}

/* ------------------------------------------------------------------ events */

const ACTIONS = {
  goto: (el) => go(el.dataset.tab),
  month: (el) => { ui.month = shiftMonth(ui.month, +el.dataset.by); render(); },
  'open-add': () => openAdd(),
  scan: () => { activeSheet?.close(true); pickFiles(); },
  paste: () => openPaste(),
  manual: () => openEditor(null),
  edit: (el) => { const t = store.state.transactions.find((x) => x.id === el.dataset.id); if (t) openEditor(t); },
  filter: (el) => { ui.filter = el.dataset.cat; render(); },
  'filter-cat': (el) => { ui.filter = el.dataset.cat; ui.query = ''; go('activity'); },
  demo: () => loadDemo(),
  'set-budget': () => setBudgetPrompt(),
  dayfirst: (el) => { store.setSettings({ dayFirst: el.dataset.v === '1' }); render(); },
  theme: (el) => {
    const v = el.dataset.v;
    store.setSettings({ theme: v });
    if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
    render();
  },
  rules: () => openRules(),
  'export-csv': () => download(`penny-expenses-${todayISO()}.csv`, store.exportCSV(), 'text/csv'),
  'export-json': () => download(`penny-backup-${todayISO()}.json`, store.exportJSON(), 'application/json'),
  import: () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      try {
        const n = store.importJSON(await inp.files[0].text());
        fmtCache.clear();
        toast(`Restored ${n} expenses`);
        render();
      } catch (err) { toast(err.message || 'Could not read that file'); }
    };
    inp.click();
  },
  'remove-demo': () => {
    store.state.transactions.filter((t) => t.source === 'demo').forEach((t) => store.deleteTransaction(t.id));
    toast('Sample data removed');
    render();
  },
  erase: () => {
    if (!window.confirm('Erase all expenses from this device? This cannot be undone. Consider exporting a backup first.')) return;
    store.clearAll();
    toast('All expenses erased');
    render();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});

$$('.tab').forEach((b) => {
  const map = { home: ['home', 'Home'], activity: ['list', 'Activity'], insights: ['chart', 'Insights'], settings: ['gear', 'Settings'] };
  const [ic, label] = map[b.dataset.tab];
  b.innerHTML = `${icon(ic, 22)}<span>${label}</span>`;
  b.addEventListener('click', () => go(b.dataset.tab));
});
$('#fab').innerHTML = icon('plus', 26);
$('#fab').addEventListener('click', openAdd);
$('#file-input').addEventListener('change', (e) => { if (e.target.files.length) scanFiles(e.target.files); });

// Paste a screenshot (or alert text) anywhere.
document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); scanFiles(files); return; }
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const text = e.clipboardData?.getData('text') || '';
  const found = parseTransactions(text, { ref: new Date(), dayFirst: S().dayFirst });
  if (found.length) { e.preventDefault(); openReview(found.map((t) => ({ ...t, source: 'text' })), [text]); }
});

// Drag and drop screenshots.
let dragDepth = 0;
const drop = $('#drop');
window.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth += 1; drop.classList.add('show'); } });
window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) drop.classList.remove('show'); });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  drop.classList.remove('show');
  if (e.dataTransfer?.files?.length) scanFiles(e.dataTransfer.files);
});

// Screenshots shared to the installed app (Android share sheet -> service worker).
async function receiveShared() {
  const params = new URLSearchParams(location.search);
  if (!params.has('shared')) return;
  history.replaceState(null, '', location.pathname);
  if (!('caches' in window)) return;
  const cache = await caches.open('penny-share-inbox');
  const keys = await cache.keys();
  const files = [];
  for (const req of keys) {
    const res = await cache.match(req);
    const blob = await res.blob();
    files.push(new File([blob], decodeURIComponent(req.url.split('/').pop()), { type: blob.type || 'image/png', lastModified: Date.now() }));
    await cache.delete(req);
  }
  if (files.length) scanFiles(files);
}

render();
receiveShared();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
