// Compatibility check against a separately downloaded, inspected vendor script; never fetches or navigates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
if (!process.argv[2]) throw new Error('Pass the path to an inspected local copy of the official Utmify script.');
const vendor = fs.readFileSync(process.argv[2], 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const app = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(code => code.includes('const CHECKOUT_URLS'));
const source = '?utm_source=FB&utm_campaign=CNH%7C123&utm_medium=Conjunto%7C456&utm_content=Anuncio%7C789&utm_term=feed';
const eventTarget = () => ({ listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } });
const pending = { hidden: true };
const button = Object.assign(eventTarget(), { dataset: { plan: 'completo' }, parentElement: { querySelector: () => pending } });
const anchors = ['#inicio', '#conteudo', '#duvidas', '#bonus', '#bonus', '#bonus'].map(hash => ({ href: 'https://page.example.test/' + source + hash }));
const originalAnchors = anchors.map(a => a.href);
const track = Object.assign(eventTarget(), { querySelectorAll: () => [{ offsetLeft: 0 }] });
const controls = { 'proof-track': track, 'proof-prev': eventTarget(), 'proof-next': eventTarget() };
const redirects = [], storage = new Map(), retries = [];
const assign = href => redirects.push(href);
const context = vm.createContext({ URL, URLSearchParams, console, Date, Math,
  setTimeout: fn => retries.push(fn), Node: { ELEMENT_NODE: 1 }, MutationObserver: class { observe() {} },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  window: { location: { search: source, href: 'https://page.example.test/' + source, assign }, open() {} },
  document: { readyState: 'complete', body: {},
    querySelector: selector => ['[data-utmify-prevent-xcod-sck]', '[data-utmify-prevent-subids]'].includes(selector) ? {} : null,
    querySelectorAll: selector => ({ a: anchors, form: [], iframe: [], '.plan-button': [button], '.plan-pending': [pending] })[selector] || [],
    getElementById: id => controls[id],
  },
});
// Exercise vendor load, app initialization, vendor reload and the vendor's retry pass.
for (const code of [vendor, app, vendor]) {
  vm.runInContext(code, context, { timeout: 3000 });
  assert.deepEqual(anchors.map(a => a.href), originalAnchors);
  assert.equal(context.window.location.assign, assign);
}
for (const retry of [...retries]) retry();
vm.runInContext("CHECKOUT_URLS.completo = 'https://pay.cakto.com.br/confirmed-offer?affiliate=kept'", context);
for (let i = 0; i < 3; i++) button.listeners.click();
assert.equal(redirects.length, 3);
for (const href of redirects) {
  const parsed = new URL(href);
  assert.equal(parsed.searchParams.get('affiliate'), 'kept');
  for (const key of ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term']) assert.equal(parsed.searchParams.getAll(key).length, 1);
  assert.equal(parsed.searchParams.has('sck'), false);
  assert.equal(parsed.searchParams.has('xcod'), false);
}
assert.deepEqual(anchors.map(a => a.href), originalAnchors);
assert.equal(storage.get('utm_source'), 'FB');
console.log('PASS: actual Utmify script preserves anchor targets and location.assign; 3 checkout redirects contain no duplicate UTMs. No request was sent.');
console.log('Vendor SHA-256:', crypto.createHash('sha256').update(vendor).digest('hex'));
