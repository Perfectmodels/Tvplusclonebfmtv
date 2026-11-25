import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanText, isoDate, xml } from '../lib/seo/xml.ts';
import { seoDocumentMetrics, seoScore } from '../lib/seo/score.ts';

test('les données du catalogue sont échappées et les dates invalides ignorées', () => {
  assert.equal(xml('A & < B "c"'), 'A &amp; &lt; B &quot;c&quot;');
  assert.equal(cleanText('<p>L’actualité</p> <strong>au Gabon</strong>'), 'L’actualité au Gabon');
  assert.equal(isoDate('date illisible'), undefined);
  assert.equal(isoDate('2026-11-25T10:00:00+01:00'), '2026-11-25T09:00:00.000Z');
});

test('le score totalise 100 points et explique les critères manquants', () => {
  const draft = { title: 'Économie : les dernières annonces', description: 'Informations vérifiées sur les annonces de la journée et leur contexte.'.repeat(2),
    words: 280, headings: 2, keywords: 4, sources: 2, internalLinks: 2,
    cover: true, coverAlt: true, classified: true, validSlug: true, excerpt: 'Une introduction détaillée présente les principaux éléments du sujet.' };
  assert.equal(seoScore(draft).value, 100);
  const scored = seoScore({ ...draft, cover: false, sources: 0 });
  assert.equal(scored.value, 70);
  assert.ok(scored.checks.every(({ tip }) => tip));
});

test('le maillage interne distingue les liens sources', () => {
  const link = href => ({ type: 'text', marks: [{ type: 'link', attrs: { href } }] });
  const doc = { type: 'doc', content: [{ type: 'heading' }, link('/a/abc'), link('https://media.test/article/faits'),
    link('https://media.test/'), link('https://source.test/communique')] };
  assert.deepEqual(seoDocumentMetrics(doc, 'https://media.test'), { headings: 1, internalLinks: 2, sources: 1 });
});
