import fetch from 'node-fetch';
import { AHREFS_API_TOKEN, AHREFS_BASE_URL } from './config.js';

async function ahrefsGet(endpoint, params = {}) {
  const url = new URL(`${AHREFS_BASE_URL}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${AHREFS_API_TOKEN}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ahrefs API error ${res.status} on ${endpoint}: ${body}`);
  }

  return res.json();
}

// Phase 1 — overall traffic metrics
export async function getTrafficOverview(domain) {
  return ahrefsGet('/site-explorer/overview', {
    target: domain,
    mode: 'domain',
    date_from: getDateMonthsAgo(12),
    date_to: getToday(),
  });
}

// Phase 1 — monthly traffic history for trend analysis
export async function getTrafficHistory(domain) {
  return ahrefsGet('/site-explorer/metrics-history', {
    target: domain,
    mode: 'domain',
    date_from: getDateMonthsAgo(12),
    date_to: getToday(),
    history_grouping: 'monthly',
  });
}

// Phase 2 — traffic channel breakdown
export async function getTrafficBySource(domain) {
  return ahrefsGet('/site-explorer/traffic-by-source', {
    target: domain,
    mode: 'domain',
    date: getToday(),
  });
}

// Phase 3 — top organic keywords
export async function getTopOrganicKeywords(domain, limit = 20) {
  return ahrefsGet('/site-explorer/organic-keywords', {
    target: domain,
    mode: 'domain',
    limit,
    order_by: 'traffic:desc',
    date: getToday(),
  });
}

// Phase 3 — top organic pages
export async function getTopOrganicPages(domain, limit = 10) {
  return ahrefsGet('/site-explorer/top-pages', {
    target: domain,
    mode: 'domain',
    limit,
    order_by: 'traffic:desc',
    date: getToday(),
  });
}

// Phase 3 — paid keywords & spend signal
export async function getPaidKeywords(domain, limit = 20) {
  return ahrefsGet('/site-explorer/paid-keywords', {
    target: domain,
    mode: 'domain',
    limit,
    order_by: 'traffic:desc',
    date: getToday(),
  });
}

// Phase 3 — paid pages (ad landing pages)
export async function getPaidPages(domain, limit = 10) {
  return ahrefsGet('/site-explorer/paid-pages', {
    target: domain,
    mode: 'domain',
    limit,
    order_by: 'traffic:desc',
    date: getToday(),
  });
}

// Phase 0 — subdomains / sibling footprint
export async function getSubdomains(domain, limit = 50) {
  return ahrefsGet('/site-explorer/subdomains', {
    target: domain,
    mode: 'domain',
    limit,
    order_by: 'traffic:desc',
  });
}

// Helpers
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateMonthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}
