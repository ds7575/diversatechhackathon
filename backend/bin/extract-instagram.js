#!/usr/bin/env node
const { extractInstagram, money, dollars } = require('../src/services/instagram-extract');

async function main() {
  const url = process.argv[2];
  const approvePaidRun = process.argv[3] === '--approve-paid-call';
  if (!url || process.argv.length > 4 || (process.argv.length === 4 && !approvePaidRun)) {
    process.stderr.write('Usage: node backend/bin/extract-instagram.js <public Instagram URL> [--approve-paid-call]\n');
    process.exitCode = 2;
    return;
  }
  const result = await extractInstagram(url, { allowPaidRun: approvePaidRun });
  const charge = result.chargeUsd == null ? null : money(result.chargeUsd);
  const estimatedRemaining = charge == null ? null : dollars(money(result.startingBalanceUsd) - charge);
  process.stdout.write(JSON.stringify({
    originalUrl: result.originalUrl,
    canonicalUrl: result.canonicalUrl,
    pathType: result.pathType,
    contentType: result.extraction?.contentType || 'unknown',
    endpoint: result.endpoint,
    runStatus: result.runStatus,
    runUrl: result.runUrl,
    cached: result.cached,
    startingBalanceUsd: result.startingBalanceUsd,
    chargeUsd: result.chargeUsd,
    cumulativeSpendUsd: result.cumulativeSpendUsd,
    remainingBalanceUsd: result.remainingBalanceUsd || null,
    estimatedRemainingBalanceUsd: result.remainingBalanceUsd ? null : estimatedRemaining,
    sources: result.extraction?.sources || [],
    candidates: result.extraction?.candidates || [],
    uncertainties: result.extraction?.uncertainties || [],
  }, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
