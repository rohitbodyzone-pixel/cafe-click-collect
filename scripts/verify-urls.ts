import https from 'https';

const baseUrl = 'https://rohitbodyzone-pixel.github.io/cafe-click-collect';

const routes = [
  '/',
  '/restaurants',
  '/cart',
  '/pickup-time',
  '/checkout',
  '/confirmation',
  '/order-status',
  '/orders',
  '/rewards',
  '/passes',
  '/profile',
  '/r/common-ground/table/5',
  '/menu',
  '/kitchen',
  '/counter',
  '/manager',
  '/owner',
  '/admin',
  '/admin-features',
  '/admin-kitchen',
  '/admin-tables',
  '/admin-table-qr',
  '/admin-menu',
  '/admin-product',
  '/admin-customisations',
  '/admin-pickup-settings',
  '/admin-loyalty',
  '/admin-payments',
  '/admin-staff',
  '/admin-operations',
  '/admin-ai',
  '/admin-growth',
  '/admin-payouts',
  '/admin-analytics',
  '/super-admin',
  '/super-admin-billing',
  '/super-admin-features',
];

async function checkUrl(path: string): Promise<{ path: string; status: number; ok: boolean }> {
  const url = `${baseUrl}${path}`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ path, status: res.statusCode || 0, ok: (res.statusCode || 0) < 400 });
    }).on('error', () => {
      resolve({ path, status: 0, ok: false });
    });
  });
}

async function verifyAll() {
  console.log(`Verifying production routes on ${baseUrl}...\n`);
  let allPass = true;
  for (const r of routes) {
    const res = await checkUrl(r);
    console.log(`[${res.ok ? 'PASS' : 'FAIL'}] Status ${res.status}: ${baseUrl}${r}`);
    if (!res.ok) allPass = false;
  }
  console.log(`\nOverall Result: ${allPass ? 'ALL ROUTES 200 OK (PASS)' : 'SOME ROUTES FAILED'}`);
}

verifyAll();
