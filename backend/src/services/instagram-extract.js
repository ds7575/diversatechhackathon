const { execFile } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const PROVIDER = 'scrapecreators';
const ENDPOINT = '/v1/instagram/post';
const VERSION = 2;
const PARSER_VERSION = 9;
const CACHE_VERSION = 1;
const MAX_PROJECT_SPEND = money('9.00');
const DEFAULT_STORE = path.resolve(__dirname, '../../.data/instagram');

function money(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,6})?$/.test(value)) {
    throw new Error('Glasser returned an invalid dollar amount');
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
}

function dollars(micros) {
  const whole = micros / 1000000n;
  const fraction = String(micros % 1000000n).padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}.00`;
}

function normalizeInstagramUrl(originalUrl) {
  let parsed;
  try { parsed = new URL(originalUrl); } catch { throw new Error('Invalid Instagram URL'); }
  if (parsed.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(parsed.hostname)) {
    throw new Error('Expected a public https://instagram.com post URL');
  }
  const match = /^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/?$/.exec(parsed.pathname);
  if (!match || parsed.username || parsed.password || parsed.port) {
    throw new Error('Expected an Instagram post or Reel permalink');
  }
  return { originalUrl, canonicalUrl: `https://www.instagram.com/${match[1]}/${match[2]}/`, pathType: match[1] };
}

function stableId(canonicalUrl) {
  return createHash('sha256').update(canonicalUrl).digest('hex');
}

function idempotencyKey(canonicalUrl) {
  const hex = createHash('sha256').update(`${PROVIDER}:${ENDPOINT}:${VERSION}:${canonicalUrl}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function glasser(args) {
  try {
    const { stdout } = await execFileAsync('glasser', [...args, '--json'], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 130000,
      env: process.env,
    });
    return JSON.parse(stdout);
  } catch (error) {
    // Do not print CLI stderr: provider errors can contain response data.
    throw new Error(`Glasser ${args[0]} failed (exit ${error.code || 'unknown'})`);
  }
}

async function savePrivate(filename, record) {
  const temp = `${filename}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
  await fs.rename(temp, filename);
}

async function priorCharges(store, currentId) {
  let total = 0n;
  for (const file of await fs.readdir(store)) {
    if (!file.endsWith('.json') || file === `${currentId}.json`) continue;
    const saved = JSON.parse(await fs.readFile(path.join(store, file), 'utf8'));
    if (saved.chargeUsd != null) total += money(saved.chargeUsd);
  }
  return total;
}

function timestampSeconds(value) {
  if (!value || typeof value !== 'object') return null;
  const raw = value.timestamp_seconds ?? value.start_seconds ?? value.start_time ?? value.start ?? value.timestamp;
  const number = Number(raw);
  return raw == null || !Number.isFinite(number) || number < 0 ? null : number;
}

function addText(texts, kind, pathName, value, timestamp = null) {
  if (typeof value === 'string' && value.trim()) {
    texts.push({ kind, path: pathName, text: value.trim(), timestamp_seconds: timestamp });
  }
}

function addTextValue(texts, kind, pathName, value) {
  if (typeof value === 'string') addText(texts, kind, pathName, value);
  else if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      if (typeof item === 'string') addText(texts, kind, `${pathName}[${index}]`, item);
      else addText(texts, kind, `${pathName}[${index}].text`, item?.text, timestampSeconds(item));
    }
  } else if (value && typeof value === 'object') {
    addText(texts, kind, `${pathName}.text`, value.text, timestampSeconds(value));
  }
}

function providerBody(run) {
  const output = run.output ?? run.result?.output ?? run.data?.output;
  return output && typeof output === 'object' ? output : {};
}

function withoutComments(value) {
  if (Array.isArray(value)) return value.map(withoutComments);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/comment/i.test(key))
      .map(([key, item]) => [key, withoutComments(item)]));
  }
  return value;
}

function buildExtractionInput(raw) {
  const media = raw?.data?.xdt_shortcode_media;
  if (!media || typeof media !== 'object') {
    return { kind: 'instagram_allowed_text_v1', contentType: 'unknown', texts: [], mediaFound: false };
  }

  let contentType = 'unknown';
  if (media.__typename === 'XDTGraphSidecar') contentType = 'carousel';
  else if (media.__typename === 'XDTGraphImage') contentType = 'image';
  else if (media.__typename === 'XDTGraphVideo') contentType = media.product_type === 'clips' ? 'reel' : 'video';

  const texts = [];
  for (const [index, edge] of (media.edge_media_to_caption?.edges || []).entries()) {
    addText(texts, 'caption', `data.xdt_shortcode_media.edge_media_to_caption.edges[${index}].node.text`, edge?.node?.text);
  }
  for (const [key, kind] of [
    ['transcript', 'transcript'],
    ['video_transcript', 'transcript'],
    ['transcript_segments', 'transcript'],
    ['on_screen_text', 'on_screen_text'],
    ['ocr_text', 'on_screen_text'],
    ['overlay_text', 'on_screen_text'],
  ]) addTextValue(texts, kind, `data.xdt_shortcode_media.${key}`, media[key]);
  for (const [index, child] of (media.edge_sidecar_to_children?.edges || []).entries()) {
    addTextValue(texts, 'on_screen_text', `data.xdt_shortcode_media.edge_sidecar_to_children.edges[${index}].node.ocr_text`, child?.node?.ocr_text);
  }

  return { kind: 'instagram_allowed_text_v1', contentType, texts, mediaFound: true };
}

function extractFromResponse(input, sourceUrl) {
  if (input?.kind !== 'instagram_allowed_text_v1' || !Array.isArray(input.texts)) {
    throw new Error('Extraction requires the comment-free text input');
  }
  const allowedKinds = new Set(['caption', 'transcript', 'on_screen_text']);
  const texts = input.texts.filter(item => allowedKinds.has(item.kind) && !/comment/i.test(item.path));
  const { contentType } = input;
  const sources = texts.map(item => ({
    source: item.kind,
    timestamp_seconds: item.timestamp_seconds ?? null,
    extracted_text: item.text,
    uncertainty: {
      uncertain: item.kind === 'on_screen_text',
      incomplete: false,
      reason: item.kind === 'on_screen_text' ? 'Provider on-screen text has not been checked against the frame' : null,
    },
    evidence_path: item.path,
  }));
  const caption = sources.find(item => item.source === 'caption')?.extracted_text || null;
  const candidates = [];
  const seen = new Set();
  function addCandidate(name, evidence, locationContext = null) {
    const clean = name.trim().replace(/^[#@\s]+|[.!\s]+$/g, '');
    if (!clean || clean.length > 100 || /https?:\/\//i.test(clean)) return;
    const key = clean.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ name: clean, locationContext, uncertain: true, evidence: [{ sourceUrl, ...evidence }] });
  }

  for (const item of sources.filter(source => source.extracted_text)) {
    for (const line of item.extracted_text.split(/\r?\n/)) {
      const match = /^\s*(?:📍|(?:place|location|venue)\s*:)\s*(.{2,100})\s*$/iu.exec(line);
      if (match) {
        const [name, ...context] = match[1].split(',');
        addCandidate(name, { kind: item.source, path: item.evidence_path || null, timestamp_seconds: item.timestamp_seconds, quote: line.trim() }, context.join(',').trim() || null);
        continue;
      }
      const listedPlace = /^[^\p{L}\p{N}#@:\n]+(\p{Lu}[\p{L}\p{M}]+(?:\s+(?:(?:de|del|la|las|los|el|the|of)\s+)?\p{Lu}[\p{L}\p{M}]+){0,4}):\s+\S/u.exec(line);
      if (listedPlace) {
        addCandidate(listedPlace[1], { kind: item.source, path: item.evidence_path || null, timestamp_seconds: item.timestamp_seconds, quote: line.trim() });
      }
    }
    if (item.source === 'caption' || item.source === 'transcript') {
      const namedPlace = /\b(?:visit to|stop in|haven of|streets around)\s+(?:the\s+)?(\p{Lu}[\p{L}\p{M}]+(?:\s+(?:(?:de|del|la|the)\s+)?\p{Lu}[\p{L}\p{M}]+){0,4})/gu;
      for (const match of item.extracted_text.matchAll(namedPlace)) {
        addCandidate(match[1], { kind: item.source, path: item.evidence_path || null, timestamp_seconds: item.timestamp_seconds, quote: match[0] });
      }
      const describedPlace = /\bvisit to the\s+([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+){0,4})\s+\((?:mountains?|beaches?|cities|city|towns?|villages?|islands?|parks?|lakes?|cathedrals?|castles?)\)/giu;
      for (const match of item.extracted_text.matchAll(describedPlace)) {
        addCandidate(match[1], { kind: item.source, path: item.evidence_path || null, timestamp_seconds: item.timestamp_seconds, quote: match[0] });
      }
    }
  }
  const uncertainties = [];
  if (!input.mediaFound) uncertainties.push('Provider response contained no post media object');
  if (contentType === 'unknown') uncertainties.push('Media type was not identified from provider metadata');
  if (!caption) uncertainties.push('No caption text was returned');
  if (!sources.some(item => item.source === 'transcript')) uncertainties.push('No transcript was returned');
  if (!sources.some(item => item.source === 'on_screen_text')) uncertainties.push('No on-screen text was returned by the provider');
  if (!candidates.length) uncertainties.push('No explicit place candidate was found in the available text');
  else uncertainties.push('Place candidates come from post text and have not been independently verified');
  if (contentType === 'reel' || contentType === 'video') uncertainties.push('Video frames and audio were not analyzed locally');
  return {
    contentType,
    sources,
    candidates,
    uncertainties,
  };
}

function publicRecord(record, cached) {
  const { rawRun, extractionInput, idempotencyKey, frameAnalysis, ...safe } = record;
  return { ...safe, cached };
}

async function extractInstagram(originalUrl, options = {}) {
  const source = normalizeInstagramUrl(originalUrl);
  const store = options.store || DEFAULT_STORE;
  await fs.mkdir(store, { recursive: true, mode: 0o700 });
  await fs.chmod(store, 0o700);
  const id = stableId(source.canonicalUrl);
  const filename = path.join(store, `${id}.json`);
  const lock = path.join(store, `${id}.lock`);
  try { await fs.mkdir(lock); } catch (error) {
    if (error.code === 'EEXIST') throw new Error('This Instagram URL is already being processed');
    throw error;
  }
  try {
    let record;
    try { record = JSON.parse(await fs.readFile(filename, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (record?.rawRun && record.cacheVersion !== CACHE_VERSION) {
      record.rawRun = withoutComments(record.rawRun);
      record.cacheVersion = CACHE_VERSION;
      await savePrivate(filename, record);
    }
    if (record?.status === 'completed' || record?.status === 'failed') {
      if (record.status === 'completed' && record.parserVersion !== PARSER_VERSION) {
        delete record.frameAnalysis;
        record.extractionInput = buildExtractionInput(providerBody(record.rawRun));
        record.extraction = extractFromResponse(record.extractionInput, source.canonicalUrl);
        record.parserVersion = PARSER_VERSION;
        await savePrivate(filename, record);
      }
      return publicRecord(record, true);
    }
    if (record?.status === 'charge_unknown') throw new Error('Previous Run has an unknown charge; review the saved response');
    if (!options.allowPaidRun) throw new Error('Uncached URL requires approval before any Glasser call');

    const contract = await glasser(['inspect', '-p', PROVIDER, '-e', ENDPOINT]);
    const balance = await glasser(['balance']);
    if (contract.endpoint_version !== VERSION || contract.price?.rule?.type !== 'flat') {
      throw new Error('Endpoint version or flat price changed; inspect before spending');
    }
    const price = money(contract.price.rule.amount_usd);
    const possibleCharges = Object.values(contract.price.charges || {}).map(money);
    const projectedCharge = possibleCharges.reduce((highest, value) => value > highest ? value : highest, price);
    const available = money(balance.available_usd);
    const priorSpend = await priorCharges(store, id);
    if (projectedCharge > available || priorSpend + projectedCharge > MAX_PROJECT_SPEND) {
      throw new Error('Glasser price exceeds available balance or the $9 project budget');
    }

    record ||= { ...source, id, status: 'pending', idempotencyKey: idempotencyKey(source.canonicalUrl), createdAt: new Date().toISOString() };
    record.startingBalanceUsd ||= balance.available_usd;
    record.endpoint = { provider: PROVIDER, path: ENDPOINT, version: VERSION, projectedChargeUsd: dollars(projectedCharge) };
    await savePrivate(filename, record);

    const run = await glasser(['run', '-p', PROVIDER, '-e', ENDPOINT, '-i', JSON.stringify({ url: source.canonicalUrl, trim: false, include_play_count: false }), '--endpoint-version', String(VERSION), '--idempotency-key', record.idempotencyKey, '--wait']);
    record.rawRun = withoutComments(run);
    record.cacheVersion = CACHE_VERSION;
    record.runUrl = run.run_url || null;
    record.runStatus = run.status;
    record.chargeUsd = run.charge_usd ?? run.charge?.amount_usd ?? null;
    if (record.chargeUsd == null) {
      record.status = 'charge_unknown';
      await savePrivate(filename, record);
      throw new Error('Glasser Run returned no exact charge; saved response for review');
    }
    record.status = run.status === 'COMPLETED' ? 'completed' : 'failed';
    record.cumulativeSpendUsd = dollars(priorSpend + money(record.chargeUsd));
    if (record.status === 'completed') {
      record.extractionInput = buildExtractionInput(providerBody(record.rawRun));
      record.extraction = extractFromResponse(record.extractionInput, source.canonicalUrl);
      record.parserVersion = PARSER_VERSION;
    }
    try {
      const after = await glasser(['balance']);
      record.remainingBalanceUsd = after.available_usd;
      money(record.remainingBalanceUsd);
    } catch {
      record.remainingBalanceUsd = null;
    }
    await savePrivate(filename, record);
    return publicRecord(record, false);
  } finally {
    await fs.rmdir(lock);
  }
}

module.exports = { extractInstagram, buildExtractionInput, extractFromResponse, normalizeInstagramUrl, money, dollars };
