// Category definitions, icons and merchant keyword rules.

// Built-in categories. Each has a fixed color slot so a category keeps the
// same color everywhere (donut, meters, chips), whatever the month.
export const CATEGORIES = [
  { id: 'groceries',     name: 'Groceries',         icon: 'basket', color: 'aqua' },
  { id: 'dining',        name: 'Dining',            icon: 'cup',    color: 'orange' },
  { id: 'transport',     name: 'Transport',         icon: 'car',    color: 'blue' },
  { id: 'fuel',          name: 'Fuel',              icon: 'fuel',   color: 'yellow' },
  { id: 'shopping',      name: 'Shopping',          icon: 'bag',    color: 'magenta' },
  { id: 'bills',         name: 'Bills & Utilities', icon: 'bolt',   color: 'violet' },
  { id: 'subscriptions', name: 'Subscriptions',     icon: 'repeat', color: 'red' },
  { id: 'entertainment', name: 'Entertainment',     icon: 'ticket', color: 'green' },
  { id: 'health',        name: 'Health',            icon: 'heart',  color: 'cyan' },
  { id: 'travel',        name: 'Travel',            icon: 'plane',  color: 'brown' },
  { id: 'home',          name: 'Home',              icon: 'house',  color: 'lime' },
  { id: 'other',         name: 'Other',             icon: 'dots',   color: 'gray' },
];

// Color slots (defined as --c-<slot> CSS variables for light and dark themes).
export const COLOR_SLOTS = ['aqua', 'orange', 'blue', 'yellow', 'magenta', 'violet', 'red', 'green', 'cyan', 'brown', 'lime', 'gray'];

// Icons offered when creating a custom category.
export const ICON_CHOICES = ['basket', 'cup', 'car', 'fuel', 'bag', 'bolt', 'repeat', 'ticket', 'heart', 'plane', 'house', 'gift',
  'book', 'grad', 'paw', 'baby', 'dumbbell', 'music', 'shirt', 'scissors', 'phone', 'wifi', 'cash', 'tools', 'star', 'globe', 'card', 'dots'];

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
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9S10.5 4 8 4.5 7.5 9 12 9ZM12 9s1.5-5 4-4.5S16.5 9 12 9Z"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5Z"/><path d="M12 6.5v13"/>',
  grad: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z"/><path d="M6.5 11v5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-5"/><path d="M21.5 9v5"/>',
  paw: '<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="6.2" r="1.8"/><circle cx="14" cy="6.2" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/><path d="M12 12c-3 0-5.5 3.5-5 5.5s3 1.5 5 1.5 4.5.5 5-1.5S15 12 12 12Z"/>',
  baby: '<circle cx="12" cy="12" r="8"/><path d="M9.5 11v.01M14.5 11v.01"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/><path d="M12 4c-1 1.5 0 3 1.5 2.5"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  shirt: '<path d="M8 4 3.5 6.5l2 4 2-1V20h9V9.5l2 1 2-4L16 4a4 4 0 0 1-8 0Z"/>',
  scissors: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="6" cy="17.5" r="2.5"/><path d="M8 8l12 10M8 16 20 6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.2v.01"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
  tools: '<path d="M15 3.5a5 5 0 0 0-4.6 6.9L3.5 17.3V20.5h3.2l6.9-6.9A5 5 0 0 0 20.5 9l-3 1-2.5-2.5 1-3a5 5 0 0 0-1-1Z"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5Z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3.5 3.5l17 17"/><path d="M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a16.5 16.5 0 0 1-3 3.8M6.3 7.4A16.5 16.5 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  donut: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 4v4.5M19.5 15l-4.2-1.5"/>',
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
