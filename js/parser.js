// Turns OCR'd (or pasted) text from bank / card alert messages into
// structured transactions. Pure functions, no DOM, so it runs in Node tests.
//
// Handles common US / UK / EU / Indian alert formats, e.g.
//   "Chase: You made a $45.67 transaction with STARBUCKS on Nov 3, 2026 at 8:15 AM ET."
//   "INR 1,250.00 spent on HDFC Bank Card XX1234 at SWIGGY on 2026-11-03:12:30:45."
// A single screenshot may contain several messages; each becomes a transaction.

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const CURRENCY_SYMBOLS = { '$': 'USD', '₹': 'INR', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };
const CURRENCY_CODES = {
  usd: 'USD', inr: 'INR', rs: 'INR', 'rs.': 'INR', eur: 'EUR', gbp: 'GBP', cad: 'CAD', aud: 'AUD', sgd: 'SGD', aed: 'AED', jpy: 'JPY', nzd: 'NZD', chf: 'CHF',
};

// Amount: optional currency marker, then a number like 1,234.56 / 1,00,000.00 / 45 / 12,50
const AMOUNT_RE = new RegExp(
  String.raw`(?:(?<sym>[$₹€£¥])\s?|\b(?<code>USD|INR|EUR|GBP|CAD|AUD|SGD|AED|JPY|NZD|CHF|Rs\.?|Rs)\s?\.?\s?)?` +
  String.raw`(?<num>\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?|\d+,\d{2}(?!\d))` +
  String.raw`(?<post>\s?(?:USD|INR|EUR|GBP|CAD|AUD|dollars|rupees))?`,
  'gi',
);

const STRONG_BEFORE = /(spent|spend|charged?|purchase[sd]?|transaction|txn|trxn|debited|debit|paid|payment of|used for|made a|withdrawn|withdrawal|amount|amt|for an? |of |for |authori[sz]ed|pending|approved|declined|refund|credited|reversal|sale)\s*[:\-]?\s*$/i;
const WEAK_KEYWORDS = /(spent|charge|purchase|transaction|txn|debited|paid|used|authori[sz]|swipe|tap|pos|sale|refund|credit)/i;
const NEGATIVE_BEFORE = /(avl|avail|available|limit|lmt|bal\b|balance|outstanding|due|minimum|min\.?|total due|statement|reward|points|cashback earned|credit line|remaining)[^\d]{0,22}$/i;

const STOP_AFTER_MERCHANT = String.raw`(?=\s+(?:on|using|with|was|were|has|have|had|for|via|ref|reference|if|avl|avail|available|txn|card|in|from|thru|through|and|is|are|bal|balance|at\s+\d|dated|date|by|not|to\s+your|ending|-\s)\b|\s+\d{1,2}[/:.-]\d{1,2}|[,;!()\n]|\.(?:\s|$)|\s+[-–]\s|$)`;

function normalizeText(raw) {
  return String(raw || '')
    .replace(/\r/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’`]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    // Common OCR slips for currency markers: "S45.67" -> "$45.67", "R5." -> "Rs."
    .replace(/(^|[\s(:])S(?=\d{1,3}(?:,\d{3})*\.\d{2}\b)/g, '$1$')
    .replace(/\bR[s5]\s?[.,]\s?(?=\d)/g, 'Rs.')
    .replace(/\bINR\s?[.,]\s?(?=\d)/gi, 'INR ')
    .replace(/(\d)\s?[,.]\s(?=\d{2}\b)/g, '$1.') // "45. 67" -> "45.67"
    .replace(/[ \t]+/g, ' ');
}

function parseNumber(numStr) {
  let s = numStr.trim();
  if (/^\d+,\d{2}$/.test(s)) s = s.replace(',', '.'); // EU decimal comma
  else s = s.replace(/,/g, '');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function pad(n) { return String(n).padStart(2, '0'); }
export function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function makeDate(y, m, d) {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1) return null;
  return dt;
}
function fixYear(y) {
  if (y == null) return null;
  y = Number(y);
  return y < 100 ? 2000 + y : y;
}
// When no year is given, pick the most recent occurrence that is not in the future.
function inferYear(m, d, ref) {
  let y = ref.getFullYear();
  const dt = makeDate(y, m, d);
  if (dt && dt.getTime() > ref.getTime() + 36 * 3600e3) y -= 1;
  return y;
}

/**
 * Find a date in text. Returns { date: Date, index, length } or null.
 * opts.dayFirst: treat 03/11 as 3 Nov (default false: US month-first).
 */
export function findDate(text, ref = new Date(), opts = {}) {
  const t = text;
  const candidates = [];
  const push = (m, dt) => { if (dt) candidates.push({ date: dt, index: m.index, length: m[0].length }); };
  let m;

  // ISO: 2026-11-03
  const iso = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g;
  while ((m = iso.exec(t))) push(m, makeDate(+m[1], +m[2], +m[3]));

  // Month name first: Nov 3, 2026 / November 3 / Nov 03 2026
  const mdy = new RegExp(String.raw`\b${MONTH_RE}\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}|'\d{2}))?\b`, 'gi');
  while ((m = mdy.exec(t))) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()] || MONTHS[m[1].slice(0, 4).toLowerCase()];
    const day = +m[2];
    const y = m[3] ? fixYear(m[3].replace("'", '')) : inferYear(mon, day, ref);
    push(m, makeDate(y, mon, day));
  }

  // Day first with month name: 3 Nov 2026 / 03-Nov-26 / 03NOV26
  const dmy = new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?[\s\-/]?${MONTH_RE}[\s\-/,]*(\d{4}|\d{2})?\b`, 'gi');
  while ((m = dmy.exec(t))) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const day = +m[1];
    const y = m[3] ? fixYear(m[3]) : inferYear(mon, day, ref);
    push(m, makeDate(y, mon, day));
  }

  // Numeric: 11/03/2026, 11/03/26, 03-11-2026, 11/03 (two-part only with / or -)
  const num = /(?<![\d.,$₹€£])(\d{1,2})([/-])(\d{1,2})(?:\2(\d{4}|\d{2}))?(?![\d/]|\.\d)/g;
  while ((m = num.exec(t))) {
    let a = +m[1], b = +m[3];
    let mon, day;
    if (a > 12) { day = a; mon = b; } else if (b > 12) { mon = a; day = b; } else if (opts.dayFirst) { day = a; mon = b; } else { mon = a; day = b; }
    const y = m[4] ? fixYear(m[4]) : inferYear(mon, day, ref);
    push(m, makeDate(y, mon, day));
  }

  // Relative words
  const rel = /\b(today|yesterday)\b/gi;
  while ((m = rel.exec(t))) {
    const d = new Date(ref);
    if (m[1].toLowerCase() === 'yesterday') d.setDate(d.getDate() - 1);
    push(m, new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  if (!candidates.length) return null;
  candidates.sort((x, y) => x.index - y.index);
  return candidates[0];
}

export function findTime(text) {
  const re = /(?<![\d-])\b(\d{1,2})[:.](\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?(?![\d])/gi;
  let m;
  while ((m = re.exec(text))) {
    let h = +m[1];
    const min = +m[2];
    if (min > 59 || h > 23) continue;
    const ap = m[3] ? m[3].toLowerCase()[0] : null;
    if (!ap && !m[0].includes(':')) continue; // "8.15" alone is too ambiguous (and may be money)
    if (/[$₹€£]\s?$|\b(?:rs|inr|usd)\.?\s?$/i.test(text.slice(Math.max(0, m.index - 5), m.index))) continue;
    if (ap === 'p' && h < 12) h += 12;
    if (ap === 'a' && h === 12) h = 0;
    return `${pad(h)}:${pad(min)}`;
  }
  return null;
}

// Is this line a messaging-app timestamp / day header (e.g. "Today 9:41 AM",
// "Yesterday", "Mon, Nov 3 at 8:15 PM", "Tuesday 10:02")?
function isHeaderLine(line) {
  const l = line.trim();
  if (!l || l.length > 42) return false;
  if (/[$₹€£]|\b(?:rs|inr|usd)\b/i.test(l)) return false;
  const words = l.split(/\s+/).length;
  if (words > 8) return false;
  const hasTime = /\b\d{1,2}:\d{2}\s*(?:[ap]\.?m\.?)?\b/i.test(l);
  const hasDay = /\b(today|yesterday|mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i.test(l);
  const hasMonth = new RegExp(String.raw`\b${MONTH_RE}\b`, 'i').test(l);
  const looksMessage = /\b(card|spent|charge|purchase|transaction|debited|account|ending|limit)\b/i.test(l);
  if (looksMessage) return false;
  return (hasTime && (hasDay || hasMonth || words <= 3)) || (hasDay && words <= 4) || (hasMonth && words <= 5 && /\d/.test(l));
}

function headerDate(line, ref, opts) {
  const l = line.toLowerCase();
  const found = findDate(line, ref, opts);
  if (found) return found.date;
  for (let i = 0; i < 7; i += 1) {
    if (new RegExp(`\\b${WEEKDAYS[i].slice(0, 3)}`).test(l)) {
      const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
      const diff = (d.getDay() - i + 7) % 7 || 7; // a weekday name means within the past week
      d.setDate(d.getDate() - diff);
      return d;
    }
  }
  return null;
}

/** Score each amount in a message, return candidates sorted best-first. */
export function findAmounts(text) {
  const out = [];
  AMOUNT_RE.lastIndex = 0;
  let m;
  while ((m = AMOUNT_RE.exec(text))) {
    const { sym, code, num, post } = m.groups;
    const start = m.index;
    const end = start + m[0].length;
    const before = text.slice(Math.max(0, start - 48), start);
    const after = text.slice(end, end + 24);
    const value = parseNumber(num);
    if (value == null || value <= 0) continue;
    const hasMarker = Boolean(sym || code || post);
    const hasDecimals = /[.,]\d{2}$/.test(num);

    // Skip things that are clearly not money.
    if (/(?:ending(?:\s+in|\s+with)?|xx+|x{1,}|\*+|card\s*(?:no\.?)?|a\/c\s*(?:no\.?)?|acct?\.?)\s*$/i.test(before) && !hasMarker) continue;
    if (/^\s*(?:[:/-]\d|[ap]\.?m\b|hrs?\b)/i.test(after) && !hasMarker) continue; // times / dates
    if (/[/-]\s*$/.test(before) && !hasMarker) continue; // tail of a date
    if (/[a-z]$/i.test(before) && !hasMarker) continue; // part of a word like "A1234"
    if (!hasMarker && !hasDecimals) continue; // bare integers (ids, years, OTPs)

    let score = 0;
    if (hasMarker) score += 4;
    if (hasDecimals) score += 1;
    const near = before.slice(-28);
    if (STRONG_BEFORE.test(near)) score += 4;
    else if (WEAK_KEYWORDS.test(before)) score += 1.5;
    if (/^\s*(?:at|with|to|on|was|has been|is|debited|charged|spent|towards)\b/i.test(after)) score += 1.5;
    if (NEGATIVE_BEFORE.test(before)) score -= 9;
    if (/^\s*(?:is|are)?\s*(?:your\s+)?(?:available|avl|balance|limit)/i.test(after)) score -= 6;
    if (!hasMarker && score < 4) continue; // decimals alone need a strong keyword

    let currency = null;
    if (sym) currency = CURRENCY_SYMBOLS[sym];
    else if (code) currency = CURRENCY_CODES[code.toLowerCase().replace(/\s/g, '')] || CURRENCY_CODES[code.toLowerCase().replace(/\.$/, '')] || null;
    else if (post) currency = /rupee|inr/i.test(post) ? 'INR' : /dollar|usd/i.test(post) ? 'USD' : (CURRENCY_CODES[post.trim().toLowerCase()] || null);

    out.push({ value, currency, score, index: start, length: m[0].length });
  }
  out.sort((a, b) => b.score - a.score || a.index - b.index);
  return out;
}

const NOT_MERCHANT = /^(?:your|the|a|an|card|credit|debit|account|acct|a\/c|bank|you|us|our|this|that|it|least|most|time|online|pos|merchant|ending|xx+\d*|\d+|vpa|upi|india|usa|us|local|am|pm|et|pt|ist|est|pst)$/i;

function cleanMerchant(raw) {
  let s = String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:'"*#-]+|[\s:'"*#.-]+$/g, '')
    .replace(/^(?:the\s+)?merchant\s+/i, '')
    .replace(/\b(?:SQ|TST|SP|PP|PAYPAL|PY|DD|IC|SPO|BT|POS|ACH)\s?\*\s?/gi, '') // processor prefixes
    .replace(/\*\s?[A-Z0-9]{4,}$/i, '') // AMAZON.COM*AB12CD
    .replace(/\s+#?\d{3,}\b.*$/, '') // store numbers and trailing ids
    .replace(/\s+(?:[A-Z]{2}\s+)?\d{5}(?:-\d{4})?$/, '') // trailing ZIP
    .replace(/\s+(?:US|USA|IN|IND)$/i, '')
    .trim();
  if (s.length < 2 || NOT_MERCHANT.test(s)) return null;
  if (/^\d[\d\s.,:/-]*$/.test(s)) return null;
  if (s.length > 40) s = s.slice(0, 40).replace(/\s+\S*$/, '');
  // Title-case shouty merchant names but keep short acronyms (e.g. "CVS", "BP").
  if (s === s.toUpperCase() && /[A-Z]{4,}/.test(s)) {
    s = s.toLowerCase().replace(/(^|[\s&/(-])([a-z])/g, (_, p, c) => p + c.toUpperCase())
      .replace(/\b(?:Cvs|Bp|Kfc|Amc|Atm|Pvr|Ups|Usps|Hbo|Nyc|Llc|Inc|Co|At&t)\b/g, (w) => (w.length <= 3 || w === 'Usps' || w === 'At&t' ? w.toUpperCase() : w))
      .replace(/\.(com|in|co|net|org)\b/gi, (w) => w.toLowerCase());
  }
  return s;
}

export function findMerchant(text, amountIndex = 0) {
  const t = text.replace(/\n/g, ' ');
  const patterns = [
    new RegExp(String.raw`\b(?:merchant(?:\s+name)?|payee|info|desc(?:ription)?)\s*[:\-]\s*([A-Za-z0-9][^\n]*?)${STOP_AFTER_MERCHANT}`, 'gi'),
    new RegExp(String.raw`\b(?:at|@)\s+(?!\d{1,2}[:.]\d{2})(?!your\b)(?!least\b)([A-Za-z0-9&][^\n]*?)${STOP_AFTER_MERCHANT}`, 'gi'),
    new RegExp(String.raw`\b(?:transaction|purchase|payment|txn)\s+with\s+([A-Za-z0-9&][^\n]*?)${STOP_AFTER_MERCHANT}`, 'gi'),
    new RegExp(String.raw`\b(?:to|towards|paid to|sent to|trf to|transfer to)\s+(?:vpa\s+)?(?!your\b)(?!you\b)([A-Za-z0-9&][^\n]*?)${STOP_AFTER_MERCHANT}`, 'gi'),
    new RegExp(String.raw`\b(?:for|on)\s+(?!your\b)(?!a\b)(?!an\b)(?!the\b)([A-Z][A-Z0-9&.' *-]{2,}[A-Z0-9])${STOP_AFTER_MERCHANT}`, 'g'),
    new RegExp(String.raw`\bwith\s+(?!your\b)([A-Za-z0-9&][^\n]*?)${STOP_AFTER_MERCHANT}`, 'gi'),
  ];
  for (const re of patterns) {
    let best = null;
    let m;
    while ((m = re.exec(t))) {
      const candidate = cleanMerchant(m[1]);
      if (!candidate) continue;
      if (/^(?:card|credit card|debit card|account)\b/i.test(candidate)) continue;
      if (/\b(?:ending|xx\d|card ending)\b/i.test(candidate)) continue;
      if (findDate(candidate) && candidate.length < 14) continue; // "on Nov 3"
      // Prefer matches that come after the amount (the usual sentence order).
      const dist = Math.abs(m.index - amountIndex) + (m.index < amountIndex ? 30 : 0);
      if (!best || dist < best.dist) best = { name: candidate, dist };
    }
    if (best) return best.name;
  }
  return null;
}

export function findCard(text) {
  const m = /(?:ending(?:\s+(?:in|with))?|card\s*(?:no\.?|number|#)?\s*(?:x+|\*+)?|(?:x{2,}|\*{2,}|\bx)|a\/c\s*(?:no\.?)?\s*x*)\s*[-:]?\s*(\d{4})\b/i.exec(text);
  return m ? m[1] : null;
}

const ISSUERS = [
  ['Chase', /\bchase\b/i], ['Amex', /\b(?:amex|american express)\b/i], ['Citi', /\bciti(?:bank)?\b/i],
  ['Capital One', /\bcapital\s?one\b/i], ['Bank of America', /\b(?:bofa|bank of america)\b/i], ['Discover', /\bdiscover\b/i],
  ['Wells Fargo', /\bwells\s?fargo\b/i], ['Apple Card', /\bapple card\b/i], ['Barclays', /\bbarclay/i], ['US Bank', /\bu\.?s\.? bank\b/i],
  ['HDFC', /\bhdfc\b/i], ['ICICI', /\bicici\b/i], ['SBI', /\bsbi\b/i], ['Axis', /\baxis\b/i], ['Kotak', /\bkotak\b/i],
  ['IDFC', /\bidfc\b/i], ['Yes Bank', /\byes bank\b/i], ['IndusInd', /\bindusind\b/i], ['AU Bank', /\bau (?:small finance )?bank\b/i],
  ['HSBC', /\bhsbc\b/i], ['Revolut', /\brevolut\b/i], ['Monzo', /\bmonzo\b/i], ['Synchrony', /\bsynchrony\b/i],
];
export function findIssuer(text) {
  for (const [name, re] of ISSUERS) if (re.test(text)) return name;
  return null;
}

export function detectKind(text) {
  const t = text.toLowerCase();
  if (/\b(otp|one[\s-]time password|verification code)\b/.test(t)) return 'otp';
  if (/\b(declined|was not approved|could not be (?:processed|completed)|failed|unsuccessful)\b/.test(t)) return 'declined';
  if (/\b(payment (?:of .{0,24})?(?:has been |was )?(?:received|posted|credited|successful)|thank you for (?:your|the) payment|autopay|we(?:'ve| have) received your payment|payment received)\b/.test(t)) return 'payment';
  if (/\b(refund(?:ed)?|reversal|reversed|returned|credited to your (?:card|account)|credit of|has been credited|chargeback)\b/.test(t) && !/\b(debited|spent|charged)\b/.test(t)) return 'refund';
  return 'expense';
}

// Split a big blob of OCR text into individual messages.
export function splitMessages(text, ref = new Date(), opts = {}) {
  const lines = normalizeText(text).split('\n');
  const messages = [];
  let cur = null;
  let ctxDate = null;
  const flush = () => {
    if (cur && cur.lines.join(' ').trim()) messages.push({ text: cur.lines.join('\n').trim(), contextDate: cur.contextDate });
    cur = null;
  };
  const hasStrongAmount = (s) => findAmounts(s).some((a) => a.score >= 5);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      // Blank line: a message boundary only once we have a transaction in hand.
      if (cur && hasStrongAmount(cur.lines.join(' '))) flush();
      continue;
    }
    if (isHeaderLine(line)) {
      flush();
      const d = headerDate(line, ref, opts);
      if (d) ctxDate = d;
      continue;
    }
    // A new message that starts while the current one already has a transaction
    // (e.g. "Chase: ..." directly under the previous alert with no blank line).
    if (cur && hasStrongAmount(cur.lines.join(' ')) && (hasStrongAmount(line) || /^[A-Z][A-Za-z ]{1,24}:\s/.test(line)) && /[.!]\s*$|\d\s*$/.test(cur.lines[cur.lines.length - 1])) {
      flush();
    }
    if (!cur) cur = { lines: [], contextDate: ctxDate };
    cur.lines.push(line);
  }
  flush();
  return messages;
}

/**
 * Parse text (from OCR or paste) into transactions.
 * @param {string} text
 * @param {{ref?: Date, fallbackDate?: Date, dayFirst?: boolean, defaultCurrency?: string}} opts
 */
export function parseTransactions(text, opts = {}) {
  const ref = opts.ref || new Date();
  const fallback = opts.fallbackDate || ref;
  const results = [];
  for (const msg of splitMessages(text, ref, opts)) {
    // Re-join values that wrapped across lines ("2026-11-\n03"), then flatten.
    const flat = msg.text.replace(/([\d][-/])\n(?=\d)/g, '$1').replace(/\n/g, ' ');
    const amounts = findAmounts(flat);
    if (!amounts.length) continue;
    const best = amounts[0];
    if (best.score < 3) continue;
    const kind = detectKind(flat);
    const found = findDate(flat.slice(best.index), ref, opts) || findDate(flat, ref, opts);
    const date = found ? found.date : (msg.contextDate || fallback);
    const merchant = findMerchant(flat, best.index);
    results.push({
      amount: Math.round(best.value * 100) / 100,
      currency: best.currency || opts.defaultCurrency || null,
      merchant: merchant || (kind === 'payment' ? 'Card payment' : ''),
      date: toISODate(date),
      dateFound: Boolean(found || msg.contextDate),
      time: findTime(flat.slice(best.index)) || findTime(flat),
      card: findCard(flat),
      issuer: findIssuer(flat),
      kind,
      confidence: Math.min(1, (best.score + (merchant ? 2 : 0) + (found ? 1 : 0)) / 12),
      raw: msg.text,
    });
  }
  return results;
}
