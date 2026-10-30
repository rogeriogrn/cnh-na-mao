// Behavioral smoke tests using a minimal DOM, not a substitute for browser QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).filter(code => code.trim());
for (const [index, code] of scripts.entries()) new vm.Script(code, { filename: `inline-${index + 1}.js` });
const main = scripts.find(code => code.includes('const CHECKOUT_URLS'));
assert.ok(main, 'The checkout behavior script exists');
const element = () => ({ listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } });
const pending = [{ hidden: true }, { hidden: true }];
const buttons = ['completo', 'essencial'].map((plan, index) => Object.assign(element(), {
  dataset: { plan }, parentElement: { querySelector: () => pending[index] },
}));
const cards = Array.from({ length: 5 }, (_, index) => ({ offsetLeft: index * 200 }));
const track = Object.assign(element(), {
  scrollLeft: 0, querySelectorAll: () => cards,
  scrollTo({ left }) { this.scrollLeft = left; },
  classList: { add() {}, remove() {} }, setPointerCapture() {},
});
const previous = element(), next = element(), redirects = [];
const context = vm.createContext({ URL, URLSearchParams, window: { location: { assign: link => redirects.push(link) } }, document: {
  querySelectorAll: selector => selector === '.plan-button' ? buttons : pending,
  getElementById: id => ({ 'proof-track': track, 'proof-prev': previous, 'proof-next': next })[id],
} });
vm.runInContext(main, context);
let count = 0;
for (const index of [0, 1, 0, 0]) {
  buttons[index].listeners.click();
  assert.equal(pending[index].hidden, false);
  assert.equal(pending[1 - index].hidden, true);
  count += 2;
}
for (const value of ['http://checkout.example.test', 'javascript:alert(1)', 'not a URL']) {
  vm.runInContext(`CHECKOUT_URLS.completo = ${JSON.stringify(value)}`, context);
  buttons[0].listeners.click();
  assert.equal(redirects.length, 0);
  assert.equal(pending[0].hidden, false);
  count += 2;
}
vm.runInContext("CHECKOUT_URLS.completo = 'https://checkout.example.test/completo'", context);
buttons[0].listeners.click();
assert.deepEqual(redirects, ['https://checkout.example.test/completo']);
count++;
next.listeners.click(); assert.equal(track.scrollLeft, 200);
previous.listeners.click(); assert.equal(track.scrollLeft, 0);
let prevented = false;
track.listeners.keydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
assert.equal(track.scrollLeft, 200); assert.equal(prevented, true);
track.listeners.pointerdown({ pointerType: 'mouse', button: 0, clientX: 200, pointerId: 1 });
track.listeners.pointermove({ clientX: 150 }); assert.equal(track.scrollLeft, 250);
track.listeners.pointercancel();
track.listeners.pointermove({ clientX: 100 }); assert.equal(track.scrollLeft, 250);
count += 6;
console.log(`PASS: ${scripts.length} inline scripts parse; ${count} behavioral assertions (checkout fallback, safe URLs, carousel, canceled drag).`);
