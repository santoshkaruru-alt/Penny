// Local-first persistence. Everything stays on this device (localStorage).
import { merchantKey } from './categories.js';

const KEY = 'penny.v1';

const defaultLocale = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
const guessCurrency = () => {
  if (/-IN$/i.test(defaultLocale)) return 'INR';
  if (/-GB$/i.test(defaultLocale)) return 'GBP';
  if (/-(DE|FR|ES|IT|NL|IE|AT|BE|PT|FI)$/i.test(defaultLocale)) return 'EUR';
  if (/-CA$/i.test(defaultLocale)) return 'CAD';
  if (/-AU$/i.test(defaultLocale)) return 'AUD';
  return 'USD';
};

const DEFAULTS = () => ({
  version: 1,
  transactions: [],
  settings: {
    currency: guessCurrency(),
    monthlyBudget: 0,
    dayFirst: !/-US$/i.test(defaultLocale) && !/^en$/i.test(defaultLocale),
    theme: 'auto',
    name: '',
  },
  rules: {}, // merchantKey -> categoryId (learned from your edits)
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const parsed = JSON.parse(raw);
    const base = DEFAULTS();
    return { ...base, ...parsed, settings: { ...base.settings, ...(parsed.settings || {}) }, rules: parsed.rules || {} };
  } catch {
    return DEFAULTS();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save', err);
  }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  addTransactions(list) {
    const now = Date.now();
    for (const t of list) {
      state.transactions.push({
        id: store.uid(),
        amount: Math.abs(Number(t.amount) || 0),
        merchant: (t.merchant || '').trim() || 'Unknown',
        category: t.category || 'other',
        date: t.date,
        time: t.time || null,
        card: t.card || null,
        issuer: t.issuer || null,
        kind: t.kind === 'refund' ? 'refund' : 'expense',
        note: t.note || '',
        source: t.source || 'manual',
        createdAt: now,
      });
      if (t.category && t.merchant && t.learn !== false) state.rules[merchantKey(t.merchant)] = t.category;
    }
    save();
  },

  updateTransaction(id, patch) {
    const t = state.transactions.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    if (patch.amount != null) t.amount = Math.abs(Number(patch.amount) || 0);
    if (patch.category && t.merchant) state.rules[merchantKey(t.merchant)] = patch.category;
    save();
  },

  deleteTransaction(id) {
    state.transactions = state.transactions.filter((x) => x.id !== id);
    save();
  },

  restore(tx) {
    state.transactions.push(tx);
    save();
  },

  setSettings(patch) {
    state.settings = { ...state.settings, ...patch };
    save();
  },

  forgetRule(key) {
    delete state.rules[key];
    save();
  },

  findDuplicate(t) {
    return state.transactions.find((x) => x.date === t.date
      && Math.abs(x.amount - t.amount) < 0.005
      && (merchantKey(x.merchant) === merchantKey(t.merchant) || !t.merchant || (t.card && x.card === t.card)));
  },

  exportJSON() {
    return JSON.stringify({ app: 'penny', exportedAt: new Date().toISOString(), ...state }, null, 2);
  },

  exportCSV() {
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [['date', 'time', 'merchant', 'category', 'amount', 'type', 'card', 'issuer', 'note']];
    [...state.transactions].sort((a, b) => a.date.localeCompare(b.date)).forEach((t) => {
      rows.push([t.date, t.time, t.merchant, t.category, (t.kind === 'refund' ? -t.amount : t.amount).toFixed(2), t.kind, t.card, t.issuer, t.note]);
    });
    return rows.map((r) => r.map(esc).join(',')).join('\n');
  },

  importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.transactions)) throw new Error('That file is not a Penny backup.');
    const existing = new Set(state.transactions.map((t) => t.id));
    let added = 0;
    for (const t of data.transactions) {
      if (!t || !t.date || t.amount == null) continue;
      if (t.id && existing.has(t.id)) continue;
      state.transactions.push({ ...t, id: t.id || store.uid() });
      added += 1;
    }
    state.rules = { ...(data.rules || {}), ...state.rules };
    if (data.settings) state.settings = { ...state.settings, ...data.settings };
    save();
    return added;
  },

  clearAll() {
    const settings = state.settings;
    state = DEFAULTS();
    state.settings = settings;
    save();
  },
};
