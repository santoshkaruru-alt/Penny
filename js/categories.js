// Category definitions, icons and merchant keyword rules.

export const CATEGORIES = [
  { id: 'groceries',     name: 'Groceries',        icon: 'basket' },
  { id: 'dining',        name: 'Dining',           icon: 'cup' },
  { id: 'transport',     name: 'Transport',        icon: 'car' },
  { id: 'fuel',          name: 'Fuel',             icon: 'fuel' },
  { id: 'shopping',      name: 'Shopping',         icon: 'bag' },
  { id: 'bills',         name: 'Bills & Utilities', icon: 'bolt' },
  { id: 'subscriptions', name: 'Subscriptions',    icon: 'repeat' },
  { id: 'entertainment', name: 'Entertainment',    icon: 'ticket' },
  { id: 'health',        name: 'Health',           icon: 'heart' },
  { id: 'travel',        name: 'Travel',           icon: 'plane' },
  { id: 'home',          name: 'Home',             icon: 'house' },
  { id: 'other',         name: 'Other',            icon: 'dots' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Lightweight 24px stroke icons (paths only; rendered with stroke="currentColor").
export const ICONS = {
  basket: '<path d="M5 10h14l-1.4 8.4a2 2 0 0 1-2 1.6H8.4a2 2 0 0 1-2-1.6L5 10Z"/><path d="m9 10 3-6 3 6"/><path d="M3.5 10h17"/>',
  cup: '<path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8Z"/><path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v2M11 3v2M14 3v2"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3.5 11h17"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="M5 16.5H3.5M20.5 16.5H19M9 16.5h6"/>',
  fuel: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15"/><path d="M3.5 20h12"/><path d="M7 8h5"/><path d="M14 10h2a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 0 3 0V8l-2.5-2.5"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z"/>',
  repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
  ticket: '<path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7Z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  plane: '<path d="M10.5 13.5 4 11l1.5-1.5 7 .5 4-4a2 2 0 0 1 3 3l-4 4 .5 7L14.5 21 12 14.5l-3 3V20l-1.5 1L6 17.5 2.5 16l1-1.5h2.5l3-3"/>',
  house: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  dots: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  // UI icons
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 2.5-2.5L20 19"/>',
  text: '<path d="M5 6h14M5 11h14M5 16h9"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  chevL: '<path d="m15 5-7 7 7 7"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5"/><path d="M5 4h14"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  alert: '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5v.01"/>',
};

export function icon(name, size = 20, extra = '') {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONS[name] || ''}</svg>`;
}

// Keyword rules: first match wins. Keywords are matched against a lowercased
// merchant string with punctuation collapsed to spaces.
const RULES = [
  ['subscriptions', ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'max com', 'youtube', 'apple com bill', 'itunes', 'icloud', 'google storage', 'google one', 'prime video', 'amazon prime', 'audible', 'patreon', 'chatgpt', 'openai', 'anthropic', 'claude ai', 'adobe', 'microsoft 365', 'dropbox', 'paramount', 'peacock', 'hotstar', 'sonyliv', 'zee5', 'jiocinema', 'linkedin', 'duolingo', 'nyt', 'substack']],
  ['groceries', ['whole foods', 'wholefds', 'trader joe', 'kroger', 'safeway', 'costco', 'aldi', 'publix', 'wegmans', 'heb ', 'h e b', 'sprouts', 'albertsons', 'instacart', 'grocery', 'market', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'dmart', 'd mart', 'reliance fresh', 'more retail', 'spencer', 'nature s basket', 'freshdirect', 'food lion', 'giant', 'stop shop', 'meijer', 'mart ']],
  ['dining', ['starbucks', 'mcdonald', 'burger', 'pizza', 'domino', 'subway', 'chipotle', 'taco', 'kfc', 'wendy', 'dunkin', 'cafe', 'coffee', 'restaurant', 'grill', 'kitchen', 'bistro', 'bar ', 'pub', 'diner', 'bakery', 'doordash', 'uber eats', 'ubereats', 'grubhub', 'postmates', 'swiggy', 'zomato', 'chick fil', 'panera', 'shake shack', 'sweetgreen', 'blue bottle', 'tim hortons', 'eatery', 'sushi', 'ramen', 'noodle', 'bbq', 'tst ', 'toast ', 'food']],
  ['fuel', ['shell', 'chevron', 'exxon', 'mobil', 'bp ', 'arco', 'valero', 'sunoco', 'citgo', 'marathon', 'speedway', 'wawa', 'sheetz', 'fuel', 'petrol', 'gas station', 'hpcl', 'iocl', 'indian oil', 'bharat petroleum', 'bpcl', 'hp petrol', '76 ', 'circle k']],
  ['transport', ['uber', 'lyft', 'ola ', 'rapido', 'metro', 'transit', 'mta', 'bart', 'parking', 'park mobile', 'parkmobile', 'toll', 'fastag', 'ez pass', 'ezpass', 'taxi', 'cab ', 'irctc', 'amtrak', 'clipper', 'caltrain', 'bird ', 'lime ']],
  ['travel', ['airline', 'airways', 'air lines', 'delta', 'united', 'american air', 'southwest', 'jetblue', 'alaska air', 'spirit', 'frontier', 'marriott', 'hilton', 'hyatt', 'ihg', 'airbnb', 'expedia', 'booking com', 'hotels com', 'makemytrip', 'goibibo', 'indigo', 'air india', 'vistara', 'akasa', 'hotel', 'resort', 'oyo', 'cleartrip', 'agoda', 'vrbo']],
  ['health', ['cvs ', 'walgreens', 'rite aid', 'pharmacy', 'apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'clinic', 'hospital', 'dental', 'dentist', 'doctor', 'medical', 'health', 'lab ', 'optical', 'gym', 'fitness', 'yoga', 'peloton', 'cult fit', 'cultfit']],
  ['bills', ['at t', 'verizon', 'comcast', 'xfinity', 't mobile', 'tmobile', 'spectrum', 'electric', 'power', 'energy', 'water', 'utility', 'utilities', 'pg e', 'con ed', 'coned', 'duke energy', 'airtel', 'jio', 'vodafone', 'vi ', 'bsnl', 'tata power', 'adani', 'bescom', 'insurance', 'geico', 'state farm', 'progressive', 'lic ', 'rent', 'mortgage', 'internet', 'broadband', 'mobile bill', 'recharge']],
  ['entertainment', ['amc ', 'regal', 'cinema', 'cinemas', 'movie', 'pvr', 'inox', 'bookmyshow', 'ticketmaster', 'stubhub', 'steam', 'playstation', 'xbox', 'nintendo', 'epic games', 'concert', 'museum', 'bowling', 'golf', 'theatre', 'theater']],
  ['home', ['home depot', 'lowe s', 'lowes', 'ikea', 'wayfair', 'bed bath', 'crate barrel', 'pottery barn', 'west elm', 'ace hardware', 'hardware', 'urban ladder', 'pepperfry', 'home centre', 'furniture', 'cleaning', 'laundry', 'urban company']],
  ['shopping', ['amazon', 'amzn', 'walmart', 'target', 'best buy', 'apple store', 'apple com', 'ebay', 'etsy', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'tata cliq', 'croma', 'reliance digital', 'h m', 'zara', 'uniqlo', 'nike', 'adidas', 'gap ', 'old navy', 'macy', 'nordstrom', 'tj maxx', 'marshalls', 'ross ', 'sephora', 'ulta', 'kohl', 'shein', 'temu', 'store', 'shop', 'mall']],
];

export function merchantKey(merchant) {
  return String(merchant || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ') // store numbers, ids
    .replace(/\s+/g, ' ')
    .trim();
}

export function guessCategory(merchant, learned = {}) {
  const key = merchantKey(merchant);
  if (!key) return 'other';
  if (learned[key]) return learned[key];
  // Learned rules also match by first word (e.g. "uber trip" vs "uber trip help").
  const first = key.split(' ')[0];
  for (const [k, cat] of Object.entries(learned)) {
    if (k.split(' ')[0] === first && first.length >= 4) return cat;
  }
  const padded = ` ${key} `;
  for (const [cat, words] of RULES) {
    for (const w of words) {
      // "word " means exact word; otherwise a word-prefix match ("mcdonald" ~ "mcdonalds").
      const needle = ' ' + w.trim() + (w.endsWith(' ') ? ' ' : '');
      if (padded.includes(needle)) return cat;
    }
  }
  return 'other';
}
