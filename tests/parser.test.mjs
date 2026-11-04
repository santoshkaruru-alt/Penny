import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTransactions, findDate, splitMessages } from '../js/parser.js';
import { guessCategory } from '../js/categories.js';

const REF = new Date(2026, 10, 4, 18, 0); // Nov 4, 2026, 6pm

function one(text, opts = {}) {
  const r = parseTransactions(text, { ref: REF, ...opts });
  assert.equal(r.length, 1, `expected 1 transaction, got ${r.length}: ${JSON.stringify(r, null, 1)}`);
  return r[0];
}

const CASES = [
  ['Chase: You made a $45.67 transaction with STARBUCKS STORE 1234 on Nov 3, 2026 at 8:15 AM ET.',
    { amount: 45.67, merchant: 'Starbucks Store', date: '2026-11-03', currency: 'USD', issuer: 'Chase', time: '08:15' }],
  ['A charge of $12.34 at AMAZON.COM*2K4LM9 was made on your Capital One card ending in 4821.',
    { amount: 12.34, merchant: 'Amazon.com', card: '4821', issuer: 'Capital One' }],
  ['Citi Alert: A $1,204.50 purchase was made at DELTA AIR LINES on card ending in 7723 on 11/02/2026.',
    { amount: 1204.5, merchant: 'Delta Air Lines', card: '7723', date: '2026-11-02' }],
  ['Amex: A charge of $23.45 was approved at UBER *TRIP on your card ending 1001.',
    { amount: 23.45, merchant: 'Uber', card: '1001', issuer: 'Amex' }],
  ['BofA: Purchase of $9.99 at NETFLIX.COM on card ending 1234. Not you? Call 800-432-1000.',
    { amount: 9.99, merchant: 'Netflix.com', card: '1234' }],
  ['Discover Card: A transaction of $64.20 at WHOLE FOODS MARKET #10235 was authorized on 11/01.',
    { amount: 64.2, merchant: 'Whole Foods Market', date: '2026-11-01' }],
  ['INR 1,250.00 spent on HDFC Bank Card XX1234 at SWIGGY on 2026-11-03:12:30:45. Avl Lmt: INR 1,00,000.00. Not you? Call 18002586161',
    { amount: 1250, merchant: 'Swiggy', card: '1234', date: '2026-11-03', currency: 'INR', issuer: 'HDFC' }],
  ['Rs.499.00 debited from your ICICI Bank Credit Card XX5678 at AMAZON PAY on 03-Nov-26. Avl Limit: Rs.85,432.10',
    { amount: 499, merchant: 'Amazon Pay', card: '5678', date: '2026-11-03', currency: 'INR' }],
  ['Thank you for using your SBI Credit Card ending 9012 for Rs. 850.00 at ZOMATO on 02/11/26. Available limit Rs 45,000',
    { amount: 850, merchant: 'Zomato', card: '9012', date: '2026-11-02', currency: 'INR', opts: { dayFirst: true } }],
  ['Your Axis Bank Credit Card no. XX3344 has been used for a transaction of INR 2,340.75 at BIGBASKET on 01-11-2026 18:22:10 IST.',
    { amount: 2340.75, merchant: 'Bigbasket', card: '3344', currency: 'INR', opts: { dayFirst: true }, date: '2026-11-01' }],
  ['Wells Fargo: Your card ending in 0099 was charged $5.75 at BLUE BOTTLE COFFEE.',
    { amount: 5.75, merchant: 'Blue Bottle Coffee', card: '0099' }],
  ['You spent £18.40 at Pret A Manger with your Monzo card.',
    { amount: 18.4, merchant: 'Pret A Manger', currency: 'GBP' }],
  ['Apple Card: Purchase at Trader Joe\'s for $42.18 was approved.',
    { amount: 42.18, merchant: "Trader Joe's" }],
  ['Your $150.00 payment was received. Thank you for your payment. Chase',
    { amount: 150, kind: 'payment' }],
  ['A refund of $25.00 from TARGET has been credited to your card ending 4821.',
    { amount: 25, kind: 'refund' }],
  ['Transaction declined: $300.00 at BEST BUY on card ending 1111.',
    { amount: 300, kind: 'declined' }],
];

for (const [text, exp] of CASES) {
  test(`parses: ${text.slice(0, 60)}`, () => {
    const { opts, ...expected } = exp;
    const r = one(text, opts);
    for (const [k, v] of Object.entries(expected)) assert.equal(r[k], v, `${k} in ${JSON.stringify(r)}`);
  });
}

test('ignores balance / limit amounts when choosing the transaction amount', () => {
  const r = one('Avl bal: $2,450.00. A purchase of $19.99 was made at SPOTIFY USA on card ending 4821.');
  assert.equal(r.amount, 19.99);
  assert.equal(r.merchant, 'Spotify');
});

test('splits a screenshot with several alerts and uses header dates', () => {
  const ocr = `Chase
Text Message
Yesterday 7:42 PM
Chase: You made a $8.25 transaction with SHAKE SHACK on your card ending 4821.

Today 9:15 AM
Chase: You made a $52.10 transaction with SHELL OIL 57444 on your card ending 4821.

Chase: You made a $3.50 transaction with MTA*NYCT PAYGO on your card ending 4821.`;
  const r = parseTransactions(ocr, { ref: REF });
  assert.equal(r.length, 3, JSON.stringify(r, null, 1));
  assert.deepEqual(r.map((x) => x.amount), [8.25, 52.1, 3.5]);
  assert.equal(r[0].date, '2026-11-03');
  assert.equal(r[1].date, '2026-11-04');
  assert.equal(r[1].merchant, 'Shell Oil');
});

test('splits back-to-back alerts without blank lines', () => {
  const ocr = `INR 349.00 spent on HDFC Bank Card XX1234 at NETFLIX on 2026-11-01.
INR 120.00 spent on HDFC Bank Card XX1234 at UBER INDIA on 2026-11-02.`;
  const r = parseTransactions(ocr, { ref: REF });
  assert.equal(r.length, 2, JSON.stringify(r, null, 1));
  assert.equal(r[1].merchant, 'Uber India');
});

test('handles OCR misreading $ as S', () => {
  const r = one('You made a S45.67 transaction with STARBUCKS on Nov 3.');
  assert.equal(r.amount, 45.67);
  assert.equal(r.date, '2026-11-03');
});

test('message without a date falls back to provided date', () => {
  const r = one('A charge of $10.00 at CVS PHARMACY was made.', { fallbackDate: new Date(2026, 9, 30) });
  assert.equal(r.date, '2026-10-30');
  assert.equal(r.dateFound, false);
});

test('dates without a year never land in the future', () => {
  const d = findDate('on Dec 20', REF);
  assert.equal(d.date.getFullYear(), 2025);
});

test('OTP messages are flagged', () => {
  const r = one('123456 is your OTP for txn of INR 2,000.00 at FLIPKART on HDFC Bank card XX1234.');
  assert.equal(r.kind, 'otp');
});

test('ignores non-transaction messages', () => {
  assert.equal(parseTransactions('Your statement is ready. Log in to view it.', { ref: REF }).length, 0);
  assert.equal(splitMessages('', REF).length, 0);
});

test('category guessing', () => {
  assert.equal(guessCategory('Starbucks Store'), 'dining');
  assert.equal(guessCategory('Whole Foods Market'), 'groceries');
  assert.equal(guessCategory('Shell Oil'), 'fuel');
  assert.equal(guessCategory('Uber'), 'transport');
  assert.equal(guessCategory('Uber Eats'), 'dining');
  assert.equal(guessCategory('Netflix.com'), 'subscriptions');
  assert.equal(guessCategory('Amazon.com'), 'shopping');
  assert.equal(guessCategory('Delta Air Lines'), 'travel');
  assert.equal(guessCategory('Walmart'), 'shopping');
  assert.equal(guessCategory('Mystery Shop Co', { 'mystery shop co': 'home' }), 'home');
  assert.equal(guessCategory('Zzz'), 'other');
});

test('rejoins a date that wrapped onto the next line', () => {
  const r = one('INR 1,250.00 spent on HDFC Bank Card XX1234 at SWIGGY on 2026-11-\n03:20:14:05. Avl Lmt: INR 1,82,340.50.');
  assert.equal(r.date, '2026-11-03');
  assert.equal(r.time, '20:14');
  assert.equal(r.amount, 1250);
});
