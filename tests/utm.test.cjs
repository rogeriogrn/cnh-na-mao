// No external requests: exercise the exact URL builder and purchase listeners in a minimal DOM.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(code => code.includes('const CHECKOUT_URLS'));
const eventTarget = () => ({ listeners: {}, addEventListener(event, handler) { this.listeners[event] = handler; } });
const pending = [{ hidden: true }, { hidden: true }];
const buttons = ['completo', 'essencial'].map((plan, i) => Object.assign(eventTarget(), {
  dataset: { plan }, parentElement: { querySelector: () => pending[i] },
}));
const track = Object.assign(eventTarget(), { querySelectorAll: () => [{ offsetLeft: 0 }] });
const controls = { 'proof-track': track, 'proof-prev': eventTarget(), 'proof-next': eventTarget() };
const redirects = [];
const window = { location: { search: '', assign: href => redirects.push(href) } };
const context = vm.createContext({ URL, URLSearchParams, window, document: {
  querySelectorAll: selector => selector === '.plan-button' ? buttons : pending,
  getElementById: id => controls[id],
} });
vm.runInContext(script, context);
const build = (checkoutUrl, search = '') => context.buildCheckoutUrl(checkoutUrl, search);
const base = 'https://pay.cakto.com.br/confirmed-offer';
let tests = 0;
function test(name, fn) { fn(); tests++; console.log(`PASS: ${name}`); }

test('empty, invalid, non-HTTPS and credential-bearing checkouts do not navigate', () => {
  for (const input of ['', '/checkout', 'invalid', 'http://pay.cakto.com.br/test', 'javascript:alert(1)', 'https://user:secret@pay.cakto.com.br/test']) {
    assert.equal(build(input, '?utm_source=FB'), null);
  }
});
test('direct visits do not acquire invented Facebook attribution', () => {
  assert.equal(build(base), base);
  assert.equal(build(base, '?name=Ana&email=ana%40example.test&cpf=000&phone=123&fbclid=test'), base);
});
test('all five resolved Meta UTM values survive with names, IDs and placement', () => {
  const values = { utm_source: 'FB', utm_campaign: 'CNH Outubro|123', utm_medium: 'Público 18–25|456', utm_content: 'Vídeo 01|789', utm_term: 'Instagram_Reels' };
  const result = new URL(build(base, '?' + new URLSearchParams(values)));
  assert.deepEqual(Object.fromEntries(result.searchParams), values);
  assert.equal(result.origin, 'https://pay.cakto.com.br');
  assert.equal(result.pathname, '/confirmed-offer');
});
test('reserved characters and Unicode round-trip without adding query keys', () => {
  const value = 'CNH + revisão & placas / 100% | ação 🚗';
  const result = new URL(build(base, '?' + new URLSearchParams({ utm_campaign: value })));
  assert.equal(result.searchParams.get('utm_campaign'), value);
  assert.equal([...result.searchParams].length, 1);
});
test('configured offer, affiliate, coupon and fragment remain intact', () => {
  const result = new URL(build(base + '?affiliate=owner&coupon=CONFIRMED&utm_source=old#summary', '?affiliate=attacker&coupon=unapproved&redirect=https://evil.example&utm_source=FB'));
  assert.equal(result.searchParams.get('affiliate'), 'owner');
  assert.equal(result.searchParams.get('coupon'), 'CONFIRMED');
  assert.equal(result.searchParams.get('utm_source'), 'FB');
  assert.equal(result.searchParams.has('redirect'), false);
  assert.equal(result.hash, '#summary');
});
test('literal Meta macros are not resolved or forwarded as campaign facts', () => {
  const raw = 'utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}';
  const result = new URL(build(base, '?' + raw));
  assert.deepEqual(Object.fromEntries(result.searchParams), { utm_source: 'FB' });
  assert.equal(new URL(build(base, '?' + new URLSearchParams({ utm_campaign: '{{campaign.name}}|{{campaign.id}}' }))).search, '');
});
test('blank, duplicated, overlong and control-character values are ignored', () => {
  for (const search of ['?utm_source=', '?utm_source=%20%20', '?utm_source=FB&utm_source=other', '?utm_source=' + 'x'.repeat(1001), '?utm_source=FB%0AInjected']) {
    assert.equal(build(base, search), base);
  }
  assert.equal(new URL(build(base + '?utm_source=configured', '?utm_source=')).searchParams.get('utm_source'), 'configured');
});
test('unknown tags, lowercase variants, src and sck are not synthesized', () => {
  const result = new URL(build(base, '?UTM_SOURCE=FB&src=unapproved&sck=unapproved&utm_custom=unapproved&utm_term=feed'));
  assert.deepEqual(Object.fromEntries(result.searchParams), { utm_term: 'feed' });
});
test('repeated URL construction does not duplicate parameters', () => {
  const once = build(base, '?utm_source=FB&utm_campaign=launch');
  assert.equal(build(once, '?utm_source=FB&utm_campaign=launch'), once);
});
test('confirmed checkout mappings receive UTMs without real network calls', () => {
  const expected = ['https://pay.cakto.com.br/pc7bv5d_1261231', 'https://pay.cakto.com.br/35b52pn'];
  assert.equal(vm.runInContext('CHECKOUT_URLS.completo', context), expected[0]);
  assert.equal(vm.runInContext('CHECKOUT_URLS.essencial', context), expected[1]);
  window.location.search = '?utm_source=FB&utm_campaign=Confirmado%7C123';
  for (const index of [0, 1]) {
    buttons[index].listeners.click();
    const actual = new URL(redirects.at(-1));
    assert.equal(actual.origin + actual.pathname, expected[index]);
    assert.equal(actual.searchParams.get('utm_source'), 'FB');
    assert.equal(actual.searchParams.get('utm_campaign'), 'Confirmado|123');
  }
});
test('missing checkout configuration still shows a preparation notice', () => {
  vm.runInContext("CHECKOUT_URLS.completo = ''", context);
  const before = redirects.length;
  buttons[0].listeners.click();
  assert.equal(redirects.length, before);
  assert.equal(pending[0].hidden, false);
});
test('both purchase paths use current query only when a link is explicitly configured', () => {
  // Test-only placeholders are injected into the VM, never into the page configuration.
  vm.runInContext(`CHECKOUT_URLS.completo = '${base}'; CHECKOUT_URLS.essencial = '${base}?offer=essential'`, context);
  for (const [index, source] of [[0, 'FB'], [1, 'Instagram'], [0, 'FB']]) {
    window.location.search = '?utm_source=' + source + '&utm_campaign=Teste%7C123';
    buttons[index].listeners.click();
    const result = new URL(redirects.at(-1));
    assert.equal(result.searchParams.get('utm_source'), source);
    assert.equal(result.searchParams.get('utm_campaign'), 'Teste|123');
    assert.equal(result.searchParams.getAll('utm_source').length, 1);
  }
});
console.log(`PASS: ${tests} UTM test groups. No checkout request or purchase was sent.`);
