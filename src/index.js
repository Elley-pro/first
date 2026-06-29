#!/usr/bin/env node
import { buildFootprint } from './footprint.js';
import { analyzeTraffic } from './traffic.js';
import { analyzeSearch } from './search.js';
import { analyzeSocial } from './social.js';
import { analyzeAds } from './ads.js';
import { synthesize } from './synthesize.js';
import { formatReport } from './report.js';
import { writeFileSync } from 'fs';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node src/index.js "<Company Name>" <domain>');
    console.error('Example: node src/index.js "Acme Corp" acme.com');
    process.exit(1);
  }

  const [companyName, domain] = args;
  const outputJson = args.includes('--json');
  const outputFile = args.find((a) => a.startsWith('--out='))?.split('=')[1];

  console.log(`\nProfiler starting for: ${companyName} (${domain})\n`);

  console.log('Phase 0 — Building footprint...');
  const footprint = await buildFootprint(companyName, domain).catch((e) => {
    console.warn('  Footprint error:', e.message);
    return null;
  });

  console.log('Phase 1+2 — Analyzing traffic & channels...');
  const traffic = await analyzeTraffic(domain).catch((e) => {
    console.warn('  Traffic error:', e.message);
    return null;
  });

  console.log('Phase 3 — Analyzing search marketing...');
  const search = await analyzeSearch(domain).catch((e) => {
    console.warn('  Search error:', e.message);
    return null;
  });

  console.log('Phase 4 — Scanning social profiles...');
  const social = await analyzeSocial(companyName, domain).catch((e) => {
    console.warn('  Social error:', e.message);
    return [];
  });

  console.log('Phase 5 — Fetching ad creative signals...');
  const ads = await analyzeAds(companyName, domain, social).catch((e) => {
    console.warn('  Ads error:', e.message);
    return null;
  });

  console.log('Phase 6 — Synthesizing profile...\n');
  const profile = synthesize({ companyName, domain, footprint, traffic, search, social, ads });

  if (outputJson) {
    const json = JSON.stringify(profile, null, 2);
    if (outputFile) {
      writeFileSync(outputFile, json, 'utf8');
      console.log(`JSON profile written to ${outputFile}`);
    } else {
      console.log(json);
    }
  } else {
    const report = formatReport(profile);
    if (outputFile) {
      writeFileSync(outputFile, report, 'utf8');
      console.log(`Report written to ${outputFile}`);
    } else {
      console.log(report);
    }
  }
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
