# Penny: a sleek home budget tracker

Penny tracks your daily spending without the typing. Take a screenshot of the
text or email your bank sends after each card purchase. Penny reads the amount,
merchant, date and card, suggests a category, and adds it to your budget.

Everything runs **on your device**. Screenshots are read in the browser with a
bundled OCR engine (Tesseract), and are never uploaded anywhere. Your data is
stored in the browser's local storage.

| Overview | Review a scan | Insights |
|---|---|---|
| ![Overview](docs/screen-home.png) | ![Review](docs/screen-review.png) | ![Insights](docs/screen-insights.png) |

## Features

- **Scan screenshots**: pick one or many at once. A single screenshot with
  several alerts becomes several expenses. Messaging-app headers like
  "Yesterday 7:42 PM" are used for the date when the alert itself has none.
- **Smart parsing**: picks the purchase amount and ignores "available limit" and
  "balance" figures. Flags refunds, card payments, declined charges and one-time
  codes so they are not counted as spending by mistake.
- **Duplicate guard**: an alert you already added (or two screenshots of the
  same alert) is unticked automatically.
- **Auto-categories that learn**: built-in rules for common US, UK and Indian
  merchants, and Penny remembers whatever category you choose for a merchant.
- **Other ways in**: paste alert text, paste a screenshot (Ctrl/⌘ + V), drag
  and drop, share a screenshot to the installed app on Android, or enter an
  expense manually.
- **Budget at a glance**: month total, budget progress, safe-to-spend per day,
  daily chart, category breakdown, top merchants and a 6-month trend.
- **Installable and offline**: add it to your home screen and it works offline.
- **Your data, portable**: export CSV, back up and restore JSON.
- Light and dark themes, USD / INR / EUR / GBP and more, MM/DD or DD/MM alerts.

The unit tests cover alert wording modeled on Chase, Amex, Citi, Capital One,
Bank of America, Discover, Wells Fargo, Apple Card, Monzo, HDFC, ICICI, SBI and
Axis. The parser is general enough for most "You spent X at Y" style messages,
and anything it gets wrong can be fixed on the review screen before saving.

## Run it

It is a static site with no build step and no dependencies.

```bash
npm start          # or: python3 -m http.server 8080
# open http://localhost:8080
npm test           # parser tests (Node 18+)
```

### Put it on your phone (GitHub Pages)

1. In the repository on GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick the
   branch with this code and the `/ (root)` folder, then **Save**.
3. Open the URL GitHub shows you on your phone.
   - **iPhone**: Safari → Share → **Add to Home Screen**.
   - **Android**: Chrome → menu → **Install app**. You can then share a
     screenshot straight to Penny from the share sheet.

Tip: the app is served over HTTPS by Pages, which the offline mode and
install features need.

## How it works

```
index.html          app shell
css/styles.css      design tokens (light + dark), components
js/app.js           views, sheets, scanning and review flow, charts
js/parser.js        turns alert text into transactions (pure, unit-tested)
js/categories.js    categories, icons, merchant keyword rules
js/store.js         local-first storage, export / import
js/ocr.js           image prep (upscale, dark-mode invert, tone curve) + Tesseract
sw.js               offline cache and Android share target
vendor/tesseract/   bundled OCR engine and English model (Apache-2.0)
tests/              parser tests
```

## Privacy notes

- Data lives only in this browser on this device. Clearing site data erases it,
  so use **Settings → Back up** now and then.
- On iPhone, add Penny to the Home Screen; Safari may clear storage for sites
  you have not opened in a while, but Home Screen apps are kept.
