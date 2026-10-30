"""Structural regressions for the static landing page (Python standard library)."""
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'index.html').read_text()
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Element:
    def __init__(self, tag, attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children, self.content = [], []
    def has_class(self, name):
        return name in self.attrs.get('class', '').split()
    @property
    def text(self):
        return ''.join(part.text if isinstance(part, Element) else part for part in self.content)
    def descendants(self):
        for child in self.children:
            yield child
            yield from child.descendants()

class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = Element('document')
        self.stack, self.errors = [self.root], []
    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(element)
        self.stack[-1].content.append(element)
        if tag not in VOID:
            self.stack.append(element)
    def handle_endtag(self, tag):
        if self.stack[-1].tag != tag:
            self.errors.append(f'Unexpected closing {tag}; open: {self.stack[-1].tag}')
        else:
            self.stack.pop()
    def handle_data(self, data):
        self.stack[-1].content.append(data)

DOC = Document()
DOC.feed(HTML)
ELEMENTS = list(DOC.root.descendants())
IDS = {e.attrs['id']: e for e in ELEMENTS if 'id' in e.attrs}
CTAS = [e for e in ELEMENTS if e.has_class('btn') or e.has_class('navbtn')]

class CROTests(unittest.TestCase):
    def test_html_is_balanced(self):
        self.assertEqual(DOC.errors, [])
        self.assertEqual(len(DOC.stack), 1)

    def test_ids_are_unique_and_all_local_anchors_resolve(self):
        ids = [e.attrs['id'] for e in ELEMENTS if 'id' in e.attrs]
        self.assertEqual(len(ids), len(set(ids)))
        for e in ELEMENTS:
            href = e.attrs.get('href', '')
            if href.startswith('#'):
                self.assertIn(href[1:], IDS)

    def test_no_early_commercial_cta_or_price(self):
        header = next(e for e in ELEMENTS if e.tag == 'header')
        for container in [header, IDS['inicio']]:
            self.assertFalse(any(e in CTAS for e in container.descendants()))
            self.assertFalse(any(e.attrs.get('href') in ['#oferta', '#bonus', '#preco'] for e in container.descendants()))
            self.assertNotIn('R$', container.text)
        self.assertFalse(any(e.has_class('sticky') for e in ELEMENTS))

    def test_first_cta_follows_the_initial_value_blocks(self):
        first = CTAS[0]
        self.assertIn(first, list(IDS['proposta'].descendants()))
        sections = next(e for e in ELEMENTS if e.tag == 'main').children
        self.assertGreaterEqual(sections.index(IDS['proposta']), 3)
        self.assertGreater(IDS['proposta'].text.index('VER OFERTA ESPECIAL'), IDS['proposta'].text.index('Volte para revisar'))

    def test_editorial_ctas_have_exact_label_and_bonus_anchor(self):
        editorial = [e for e in CTAS if not e.has_class('plan-button')]
        self.assertEqual(len(editorial), 3)
        for e in editorial:
            self.assertEqual(e.tag, 'a')
            self.assertEqual(e.text, 'VER OFERTA ESPECIAL')
            self.assertEqual(e.attrs['href'], '#bonus')

    def test_preoffer_section_is_immediately_above_price(self):
        siblings = IDS['bonus'].parent.children
        self.assertIs(siblings[siblings.index(IDS['bonus']) + 1], IDS['oferta'])
        self.assertEqual(IDS['bonus'].attrs['tabindex'], '-1')
        self.assertEqual(IDS['bonus'].attrs['aria-labelledby'], 'bonus-title')
        self.assertNotIn('R$', IDS['bonus'].text)

    def test_neutral_heading_does_not_invent_bonus_or_deadline(self):
        headings = [e for e in IDS['bonus'].descendants() if e.tag == 'h2']
        self.assertEqual([e.text for e in headings], ['Conheça os materiais da oferta'])
        self.assertFalse(any(e.has_class('eyebrow') for e in IDS['bonus'].descendants()))
        self.assertIn('Não são bônus e não estão incluídos nos planos.', IDS['bonus'].text)
        self.assertNotIn('válidos somente até', HTML)
        self.assertNotIn('DATA_ATUAL', HTML)

    def test_purchase_ctas_are_unchanged(self):
        purchases = [e for e in CTAS if e.has_class('plan-button')]
        self.assertEqual([(e.attrs['data-plan'], e.text) for e in purchases], [
            ('completo', 'QUERO O PLANO COMPLETO →'),
            ('essencial', 'QUERO O PLANO ESSENCIAL →'),
        ])
        self.assertIn("const CHECKOUT_URLS = { completo: '', essencial: '' };", HTML)

    def test_smooth_scroll_has_reduced_motion_fallback(self):
        self.assertIn('html{scroll-behavior:smooth}', HTML)
        self.assertIn('@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto!important}', HTML)
        self.assertIn('.bonus-preview{scroll-margin-top:24px}', HTML)
        self.assertIn('.btn:focus-visible', HTML)

    def test_new_cards_have_responsive_single_column_rule(self):
        self.assertIn('.offer-materials{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))', HTML)
        self.assertIn('@media(max-width:760px){.offer-materials{grid-template-columns:1fr}}', HTML)

    def test_local_images_exist(self):
        images = [e for e in ELEMENTS if e.tag == 'img' and not e.attrs['src'].startswith('https://')]
        for e in images:
            self.assertTrue((ROOT / e.attrs['src']).is_file(), e.attrs['src'])
            self.assertIn('alt', e.attrs)

    def test_official_utmify_loader_is_single_and_not_obfuscated(self):
        scripts = [e for e in ELEMENTS if e.tag == 'script' and e.attrs.get('src') == 'https://cdn.utmify.com.br/scripts/utms/latest.js']
        self.assertEqual(len(scripts), 1)
        for attribute in ['async', 'defer', 'data-utmify-prevent-xcod-sck', 'data-utmify-prevent-subids']:
            self.assertIn(attribute, scripts[0].attrs)
        self.assertNotIn('atob(', HTML)

    def test_meta_pixel_is_preserved(self):
        self.assertIn("fbq('init', '1083875994701692')", HTML)
        self.assertIn("fbq('track', 'PageView')", HTML)

if __name__ == '__main__':
    unittest.main(verbosity=2)
