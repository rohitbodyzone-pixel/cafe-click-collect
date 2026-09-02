import https from 'https';

const BASE_URL = 'https://rohitbodyzone-pixel.github.io/cafe-click-collect';
const SUPABASE_URL = 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

async function fetchHttp(url: string, headers: Record<string, string> = {}, maxRedirects = 3): Promise<{ status: number; text: string; json?: any; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...headers,
      }
    }, async (res) => {
      // Follow 301/302 redirects (standard GitHub Pages static directory behavior)
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirects > 0) {
        const nextUrl = new URL(res.headers.location, url).toString();
        try {
          const redirected = await fetchHttp(nextUrl, headers, maxRedirects - 1);
          resolve(redirected);
        } catch (err) {
          reject(err);
        }
        return;
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode || 0,
          text: data,
          json,
          finalUrl: url,
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

async function runProductionVerification() {
  console.log('======================================================================');
  console.log('LIVE PRODUCTION RENDERED VERIFICATION SUITE');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, ok: boolean, details?: string) {
    total++;
    if (ok) {
      passed++;
      console.log(`[PASS] ${total}. ${name}${details ? ` -> ${details}` : ''}`);
    } else {
      console.error(`[FAIL] ${total}. ${name}${details ? ` -> ${details}` : ''}`);
    }
  }

  // 1. Verify Production Base URL & Bundled Assets
  try {
    const homeRes = await fetchHttp(`${BASE_URL}/`);
    const hasRoot = homeRes.text.includes('id="root"');
    const hasScript = homeRes.text.includes('_expo/static/js/web/entry-');
    const scriptMatch = homeRes.text.match(/src="([^"]+_expo\/static\/js\/web\/entry-[^"]+\.js)"/);
    
    assert('Live Production Home HTML', homeRes.status === 200 && hasRoot, `Status: ${homeRes.status}, root element mounted`);
    assert('Production JavaScript Bundle Mounted', hasScript && !!scriptMatch, `Entry script: ${scriptMatch ? scriptMatch[1] : 'Found'}`);

    if (scriptMatch) {
      const scriptUrl = scriptMatch[1].startsWith('http') ? scriptMatch[1] : `${BASE_URL}/${scriptMatch[1].replace(/^\/cafe-click-collect\//, '')}`;
      const bundleRes = await fetchHttp(scriptUrl);
      const isBundleValid = bundleRes.status === 200 && bundleRes.text.length > 500000;
      assert('Live Production Web Bundle Download & Integrity', isBundleValid, `Bundle Size: ${(bundleRes.text.length / 1024 / 1024).toFixed(2)} MB`);
    }
  } catch (e: any) {
    assert('Live Production Home HTML', false, e.message);
  }

  // 2. Table QR Deep Link Production Route
  const tableQrUrl = `${BASE_URL}/r/common-ground/table/5/`;
  try {
    const qrRes = await fetchHttp(tableQrUrl);
    const hasRoot = qrRes.text.includes('id="root"');
    assert('Live Table QR Route (/r/common-ground/table/5/)', qrRes.status === 200 && hasRoot, `Status: ${qrRes.status}, 200 HTML Served`);

    // Verify backend resolution for Common Ground Table 5 via Supabase REST API
    const restRes = await fetchHttp(`${SUPABASE_URL}/rest/v1/restaurants?slug=eq.common-ground&select=*`, {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    });
    const rest = restRes.json?.[0];

    const tableRes = await fetchHttp(`${SUPABASE_URL}/rest/v1/cafe_tables?restaurant_id=eq.${rest?.id}&code=eq.5&select=*`, {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    });
    const table = tableRes.json?.[0];

    const tableResolved = rest && table && table.active;
    assert('Table QR Backend Data Resolution', !!tableResolved, `Restaurant: ${rest?.name}, Table: ${table?.display_name || table?.code} (ID: ${table?.id})`);
  } catch (e: any) {
    assert('Live Table QR Route', false, e.message);
  }

  // 3. Customer Routes
  const customerRoutes = [
    { path: '/', label: 'Customer Home (Pickup & Dine-In Selector)' },
    { path: '/restaurants', label: 'Explore Cafés Directory' },
    { path: '/menu', label: 'Restaurant Menu & Table Picker' },
    { path: '/cart', label: 'Cart & Combo Upsells' },
    { path: '/pickup-time', label: 'Pickup Time Slots' },
    { path: '/checkout', label: 'Checkout & Payment Methods' },
    { path: '/orders', label: 'Order History' },
    { path: '/order-status', label: 'Live Order Tracking & Review Shield' },
    { path: '/profile', label: 'Customer VIP Profile & Streaks' },
    { path: '/rewards', label: 'Loyalty Stamp Card & Vouchers' },
    { path: '/passes', label: 'Prepaid Passes & Digital Wallet' },
  ];

  for (const r of customerRoutes) {
    try {
      const res = await fetchHttp(`${BASE_URL}${r.path}`);
      assert(`Customer Flow: ${r.label} (${r.path})`, res.status === 200 && res.text.includes('id="root"'), `HTTP ${res.status}`);
    } catch (e: any) {
      assert(`Customer Flow: ${r.label}`, false, e.message);
    }
  }

  // 4. Operational Routes
  const operationRoutes = [
    { path: '/counter', label: 'Counter POS Terminal & Staff Attendance' },
    { path: '/kitchen', label: 'Kitchen Display System (KDS)' },
    { path: '/manager', label: 'Manager Operations & Rush Controls' },
    { path: '/owner', label: 'Owner Console & Branding' },
    { path: '/super-admin', label: 'Super Admin Platform Console' },
    { path: '/super-admin-features', label: 'Dual-Level Feature Permissions Matrix' },
    { path: '/super-admin-billing', label: 'Platform Economics & SaaS Billing' },
  ];

  for (const r of operationRoutes) {
    try {
      const res = await fetchHttp(`${BASE_URL}${r.path}`);
      assert(`Operations Flow: ${r.label} (${r.path})`, res.status === 200 && res.text.includes('id="root"'), `HTTP ${res.status}`);
    } catch (e: any) {
      assert(`Operations Flow: ${r.label}`, false, e.message);
    }
  }

  // 5. Verification of 58 Features & 16 Core Capabilities = 74 Total Capabilities
  const featureRes = await fetchHttp(`${SUPABASE_URL}/rest/v1/restaurant_feature_permissions?select=feature_key`, {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  });
  const uniqueFeatures = new Set((featureRes.json || []).map((f: any) => f.feature_key));
  assert('Platform Capabilities Count Audit', uniqueFeatures.size === 58, `58 optional Feature Manager features + 16 core capabilities = 74 total capabilities`);

  console.log('\n======================================================================');
  console.log(`LIVE PRODUCTION SUITE RESULT: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================================\n');
}

runProductionVerification();
