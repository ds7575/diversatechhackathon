const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { buildExtractionInput, extractFromResponse, extractInstagram } = require('../src/services/instagram-extract');

const URL = 'https://www.instagram.com/p/Demqe5ltfbs/';
const COMMENT = '📍Wrong Place From Comment';

function providerResponse() {
  return {
    data: {
      xdt_shortcode_media: {
        __typename: 'XDTGraphVideo',
        product_type: 'clips',
        edge_media_to_caption: { edges: [{ node: { text: '📍Cala Mitjana, Menorca, Spain' } }] },
        transcript: [{ text: 'The beach is Cala Mitjana.', start_seconds: 1.25 }],
        ocr_text: '📍Cala Mitjana',
        video_observation: '📍A beach-shaped cove is visible.',
        edge_media_to_parent_comment: { edges: [{ node: { text: COMMENT } }] },
        edge_media_preview_comment: { edges: [{ node: { text: COMMENT } }] },
      },
    },
  };
}

test('provider caption, transcript, and supplied on-screen text stay separate without comments', () => {
  const input = buildExtractionInput(providerResponse());
  assert.deepEqual(input.texts.map(item => item.kind), [
    'caption', 'transcript', 'on_screen_text',
  ]);
  assert.equal(JSON.stringify(input).includes(COMMENT), false);
  const result = extractFromResponse(input, URL);
  assert.equal(result.contentType, 'reel');
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].name, 'Cala Mitjana');
  assert.equal(result.candidates[0].uncertain, true);
  assert.deepEqual(result.sources.map(item => item.source), [
    'caption', 'transcript', 'on_screen_text',
  ]);
  assert.equal(result.sources[1].timestamp_seconds, 1.25);
  assert.equal(result.sources[2].extracted_text, '📍Cala Mitjana');
  assert.equal(result.sources[2].uncertainty.uncertain, true);
  assert.equal(result.sources.some(item => item.source === 'video_observation'), false);
  assert.equal(JSON.stringify(result).includes(COMMENT), false);
});

test('cached result is reprocessed locally and never exposes raw comments', async t => {
  const store = await fs.mkdtemp(path.join(os.tmpdir(), 'instagram-extraction-'));
  t.after(() => fs.rm(store, { recursive: true, force: true }));
  const id = createHash('sha256').update(URL).digest('hex');
  await fs.writeFile(path.join(store, `${id}.json`), JSON.stringify({
    id,
    originalUrl: URL,
    canonicalUrl: URL,
    pathType: 'p',
    status: 'completed',
    parserVersion: 2,
    rawRun: { output: providerResponse() },
    frameAnalysis: { frames: [{ extracted_text: 'Obsolete local OCR' }] },
    chargeUsd: '0.00188',
    startingBalanceUsd: '6.00',
    remainingBalanceUsd: '5.99812',
  }));
  const result = await extractInstagram(URL, { store });
  assert.equal(result.cached, true);
  assert.equal(result.rawRun, undefined);
  assert.equal(result.extractionInput, undefined);
  assert.equal(result.extraction.candidates[0].name, 'Cala Mitjana');
  assert.equal(JSON.stringify(result).includes(COMMENT), false);
  const saved = JSON.parse(await fs.readFile(path.join(store, `${id}.json`), 'utf8'));
  assert.equal(JSON.stringify(saved.extractionInput).includes(COMMENT), false);
  assert.equal(JSON.stringify(saved.rawRun).includes(COMMENT), false);
  assert.equal(JSON.stringify(saved.rawRun).includes('edge_media_preview_comment'), false);
  assert.equal(JSON.stringify(saved.rawRun).includes('edge_media_to_parent_comment'), false);
  assert.equal(saved.frameAnalysis, undefined);
  assert.equal(JSON.stringify(saved.extraction).includes('Obsolete local OCR'), false);
});

test('an uncached URL is blocked before any Glasser command by default', async t => {
  const store = await fs.mkdtemp(path.join(os.tmpdir(), 'instagram-extraction-'));
  t.after(() => fs.rm(store, { recursive: true, force: true }));
  await assert.rejects(extractInstagram(URL, { store }), /requires approval before any Glasser call/);
});

test('emoji-led caption list yields only explicitly named places', () => {
  const response = providerResponse();
  response.data.xdt_shortcode_media.edge_media_to_caption.edges[0].node.text = [
    'These are 3 of my favorites:',
    '🏰 Granada: Home to the Alhambra fortress.',
    '🌊 Nerja: A coastal town with beaches.',
    '💙 Cadaqués: A whitewashed seaside town.',
    'Comment SPAIN and I will send a guide.',
  ].join('\n');
  response.data.xdt_shortcode_media.ocr_text = '';
  const result = extractFromResponse(buildExtractionInput(response), URL);
  assert.deepEqual(result.candidates.map(candidate => candidate.name), ['Granada', 'Nerja', 'Cadaqués']);
  assert.equal(result.candidates.every(candidate => candidate.uncertain), true);
  assert.equal(result.candidates[0].evidence[0].quote, '🏰 Granada: Home to the Alhambra fortress.');
});

test('caption prose keeps named places and rejects an informational label', () => {
  const response = providerResponse();
  response.data.xdt_shortcode_media.edge_media_to_caption.edges[0].node.text = [
    'Don’t miss a visit to the picos de europa (mountains), the foodie haven of San Sebastián, and a quick stop in Barcelona.',
    'The historic streets around León Cathedral come alive after sunset.',
    '💡 Good to know: León is a historic stop.',
  ].join('\n');
  response.data.xdt_shortcode_media.ocr_text = '';
  const result = extractFromResponse(buildExtractionInput(response), URL);
  assert.deepEqual(result.candidates.map(candidate => candidate.name), [
    'San Sebastián', 'Barcelona', 'León Cathedral', 'picos de europa',
  ]);
  assert.equal(result.candidates.some(candidate => candidate.name === 'Good to know'), false);
  assert.equal(result.candidates.every(candidate => candidate.uncertain), true);
});

test('caption explicitly naming a capital and districts yields place candidates with source evidence', () => {
  const response = providerResponse();
  const caption = 'Tokyo, the capital of Japan, is a city of endless contrasts. In districts like Shibuya and Shinjuku, the energy never slows down.';
  response.data.xdt_shortcode_media.edge_media_to_caption.edges[0].node.text = caption;
  response.data.xdt_shortcode_media.ocr_text = '';
  const result = extractFromResponse(buildExtractionInput(response), URL);
  assert.deepEqual(result.candidates.map(candidate => candidate.name), ['Tokyo', 'Shibuya', 'Shinjuku']);
  assert.equal(result.candidates[0].evidence[0].quote, 'Tokyo, the capital of Japan');
  assert.equal(result.candidates[1].evidence[0].quote, 'In districts like Shibuya and Shinjuku');
  assert.equal(result.candidates.every(candidate => candidate.uncertain), true);
});

test('a labeled food-pick list yields only its explicit venues and city', () => {
  const response = providerResponse();
  response.data.xdt_shortcode_media.edge_media_to_caption.edges[0].node.text = [
    'We are eager to try the food in the beautiful city of Girona!',
    'Some of our top food picks:',
    '🍾 @cellercanroca of course what we came for!',
    '✨ @restaurantmassana authentic Spanish fine dining',
    '🦐 @escabetxrestaurant for amazing seafood!',
    '🥘 Probocador for paellas!',
    '',
    'Follow @travelwiththewesties for travel inspiration.',
  ].join('\n');
  response.data.xdt_shortcode_media.ocr_text = '';
  const result = extractFromResponse(buildExtractionInput(response), URL);
  assert.deepEqual(result.candidates.map(candidate => candidate.name), [
    'cellercanroca', 'restaurantmassana', 'escabetxrestaurant', 'Probocador', 'Girona',
  ]);
  assert.equal(result.candidates.some(candidate => candidate.name === 'travelwiththewesties'), false);
});

test('a numbered Instagram must-do list yields explicit multiword POIs', () => {
  const response = providerResponse();
  response.data.xdt_shortcode_media.edge_media_to_caption.edges[0].node.text = [
    'Our fave spots & must-dos in Miami:',
    '1. 🌊 South Beach - Turquoise water and white sand',
    '2. 🥑 Pura Vida Miami - Healthy brunch',
    '3. 💃 Little Havana (Calle Ocho) - Cuban culture',
    '4. 🌅 South Pointe Park - The best sunset views',
    '5. 🏙️ Brickell district - Modern skyline',
    '6. 🏛️ Vizcaya Museum & Gardens - A European villa',
  ].join('\n');
  response.data.xdt_shortcode_media.ocr_text = '';
  const result = extractFromResponse(buildExtractionInput(response), URL);
  assert.deepEqual(result.candidates.map(candidate => candidate.name), [
    'South Beach', 'Pura Vida Miami', 'Little Havana (Calle Ocho)', 'South Pointe Park',
    'Brickell district', 'Vizcaya Museum & Gardens',
  ]);
  assert.equal(result.candidates[0].evidence[0].quote, '1. 🌊 South Beach - Turquoise water and white sand');
});
