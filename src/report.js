// Formats the synthesized profile as a human-readable text report

export function formatReport(profile) {
  const p = profile.profile;
  const lines = [];

  lines.push('═'.repeat(60));
  lines.push(`  COMPANY PROFILE: ${profile.company.toUpperCase()}`);
  lines.push(`  Domain: ${profile.domain}   |   Generated: ${profile.generatedAt.split('T')[0]}`);
  lines.push('═'.repeat(60));
  lines.push('');

  // One-page summary table
  lines.push('── SUMMARY ──────────────────────────────────────────────');
  lines.push(row('Est. monthly traffic', p.estimatedMonthlyTraffic));
  lines.push(row('Dominant channel', p.dominantChannel));
  lines.push(row('SEO focus topics', p.seoFocus));
  lines.push(row('Paid spend signal', p.paidSpendSignal));
  lines.push(row('Primary social', p.primarySocialPlatform));
  lines.push(row('Ad strategy', p.adStrategy));
  lines.push(row('Apparent goal', p.apparentGoal));
  lines.push('');

  // Phase 0 — Footprint
  lines.push('── PHASE 0 · FOOTPRINT ──────────────────────────────────');
  const fp = profile.footprint;
  if (fp) {
    lines.push(`  Subdomains found: ${fp.subdomains.length}`);
    if (fp.subdomains.length) lines.push('  ' + fp.subdomains.slice(0, 10).join(', ') + (fp.subdomains.length > 10 ? ` +${fp.subdomains.length - 10} more` : ''));
    if (fp.regionalSites.length) lines.push(`  Regional sites: ${fp.regionalSites.join(', ')}`);
    if (fp.siblingBrands.length) lines.push(`  Sibling/sub-brands: ${fp.siblingBrands.join(', ')}`);
  } else {
    lines.push('  No footprint data');
  }
  lines.push('');

  // Phase 1+2 — Traffic
  lines.push('── PHASE 1+2 · TRAFFIC & CHANNELS ──────────────────────');
  const td = profile.trafficDetail;
  if (td?.channelMix) {
    const sorted = Object.entries(td.channelMix).sort((a, b) => b[1].percentage - a[1].percentage);
    for (const [ch, { percentage, visits }] of sorted) {
      lines.push(`  ${ch.padEnd(18)} ${String(percentage).padStart(5)}%   (~${fmtNum(visits)} visits)`);
    }
  } else {
    lines.push('  Channel data unavailable');
  }
  lines.push('');

  // Phase 3 — Search
  lines.push('── PHASE 3 · SEARCH MARKETING ───────────────────────────');
  const sd = profile.searchDetail;
  if (sd?.organic?.topKeywords?.length) {
    lines.push('  Top organic keywords:');
    for (const kw of sd.organic.topKeywords.slice(0, 10)) {
      lines.push(`    #${String(kw.position ?? '?').padStart(3)}  ${kw.keyword.padEnd(35)} ${fmtNum(kw.traffic)} visits/mo`);
    }
  }
  if (sd?.organic?.topPages?.length) {
    lines.push('  Top organic pages:');
    for (const pg of sd.organic.topPages.slice(0, 5)) {
      lines.push(`    ${pg.url.slice(0, 55).padEnd(55)}  ${fmtNum(pg.traffic)} visits/mo`);
    }
  }
  if (sd?.paid?.hasPaidActivity) {
    lines.push(`  Paid search: ACTIVE (signal: ${sd.paid.spendSignal})`);
    if (sd.paid.topKeywords?.length) {
      lines.push('  Sample paid keywords:');
      for (const kw of sd.paid.topKeywords.slice(0, 5)) {
        lines.push(`    ${kw.keyword.padEnd(35)} CPC: $${kw.cpc ?? '?'}`);
      }
    }
  } else {
    lines.push('  Paid search: not detected');
  }
  lines.push('');

  // Phase 4 — Social
  lines.push('── PHASE 4 · SOCIAL PRESENCE ────────────────────────────');
  const sp = profile.socialProfiles ?? [];
  if (sp.length) {
    for (const s of sp) {
      const followers = s.followers ? `  ${fmtNum(s.followers)} followers` : '';
      lines.push(`  ${s.platform.padEnd(12)}  @${s.handle}${followers}`);
      lines.push(`    ${s.url}`);
      if (s.adLibraryUrl) lines.push(`    Ad library → ${s.adLibraryUrl}`);
    }
  } else {
    lines.push('  No social profiles detected');
  }
  lines.push('');

  // Phase 5 — Ads
  lines.push('── PHASE 5 · AD STRATEGY ────────────────────────────────');
  const ad = profile.adsDetail;
  if (ad?.meta?.activeAdCount != null) {
    lines.push(`  Meta active ads: ${ad.meta.activeAdCount}`);
    if (ad.meta.formats?.length) lines.push(`  Formats seen: ${ad.meta.formats.join(', ')}`);
    if (ad.meta.sampleCopy?.length) {
      lines.push('  Sample ad copy:');
      for (const s of ad.meta.sampleCopy) {
        if (s.body) lines.push(`    "${s.body.slice(0, 120)}"`);
      }
    }
  }
  if (ad?.manualChecks) {
    lines.push('  Manual ad library URLs:');
    for (const [lib, url] of Object.entries(ad.manualChecks)) {
      lines.push(`    ${lib.padEnd(25)} ${url}`);
    }
  }
  lines.push('');
  lines.push('═'.repeat(60));

  return lines.join('\n');
}

function row(label, value) {
  return `  ${label.padEnd(22)} ${value ?? 'unknown'}`;
}

function fmtNum(n) {
  if (n == null) return '?';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}
