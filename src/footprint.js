import fetch from 'node-fetch';
import { getSubdomains } from './ahrefs.js';

// Phase 0 — discover known subdomains + regional TLDs via Ahrefs + crt.sh
export async function buildFootprint(companyName, domain) {
  const [ahrefsSubdomains, crtSubdomains] = await Promise.allSettled([
    getSubdomainsFromAhrefs(domain),
    getSubdomainsFromCrt(domain),
  ]);

  const subdomains = new Set();

  if (ahrefsSubdomains.status === 'fulfilled') {
    for (const s of ahrefsSubdomains.value) subdomains.add(s);
  }
  if (crtSubdomains.status === 'fulfilled') {
    for (const s of crtSubdomains.value) subdomains.add(s);
  }

  const regionalTLDs = detectRegionalSites([...subdomains], domain);
  const siblingBrands = detectSiblingBrands([...subdomains], domain);

  return {
    mainDomain: domain,
    subdomains: [...subdomains].sort(),
    regionalSites: regionalTLDs,
    siblingBrands,
  };
}

async function getSubdomainsFromAhrefs(domain) {
  try {
    const data = await getSubdomains(domain, 50);
    return (data?.subdomains ?? []).map((s) => s.url ?? s.subdomain).filter(Boolean);
  } catch {
    return [];
  }
}

async function getSubdomainsFromCrt(domain) {
  const url = `https://crt.sh/?q=%.${domain}&output=json`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const entries = await res.json();
  const names = new Set();
  for (const e of entries) {
    const raw = e.name_value ?? '';
    for (const n of raw.split('\n')) {
      const clean = n.trim().replace(/^\*\./, '');
      if (clean.endsWith(domain) && clean !== domain) names.add(clean);
    }
  }
  return [...names];
}

function detectRegionalSites(subdomains, baseDomain) {
  const regionalTLDPattern = /\.(co\.uk|co\.in|com\.au|de|fr|es|it|nl|br|jp|ca|mx|sg|ae)$/;
  const baseName = baseDomain.split('.')[0];
  return subdomains.filter(
    (s) => regionalTLDPattern.test(s) || s.startsWith(baseName + '.'),
  );
}

function detectSiblingBrands(subdomains, baseDomain) {
  return subdomains.filter((s) => {
    const parts = s.split('.');
    return parts.length > 2 && !['www', 'blog', 'shop', 'app', 'careers', 'help', 'support', 'api', 'mail', 'status', 'docs'].includes(parts[0]);
  });
}
