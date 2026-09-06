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

interface CheckResult {
  path: string;
  status: number;
  ok: boolean;
  error?: string;
  durationMs: number;
}

async function checkUrl(path: string, timeoutMs = 8000): Promise<CheckResult> {
  const url = `${baseUrl}${path}`;
  const start = Date.now();
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Verifier/1.0' },
      },
      (res) => {
        const status = res.statusCode || 0;
        const ok = status >= 200 && status < 400;
        res.resume();
        resolve({ path, status, ok, durationMs: Date.now() - start });
      }
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ path, status: 0, ok: false, error: 'TIMEOUT', durationMs: Date.now() - start });
    });
    req.on('error', (err) => {
      resolve({ path, status: 0, ok: false, error: err.message, durationMs: Date.now() - start });
    });
  });
}

async function verifyAll() {
  console.log(`Verifying ${routes.length} production routes concurrently on ${baseUrl}...\n`);
  const startTime = Date.now();
  const queue = [...routes];
  const results: CheckResult[] = [];

  // Run with 8 concurrent workers
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length > 0) {
      const r = queue.shift();
      if (!r) break;
      const res = await checkUrl(r);
      results.push(res);
    }
  });

  await Promise.all(workers);
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Preserve route ordering
  results.sort((a, b) => routes.indexOf(a.path) - routes.indexOf(b.path));

  let allPass = true;
  const failures: CheckResult[] = [];

  for (const res of results) {
    console.log(`[${res.ok ? 'PASS' : 'FAIL'}] Status ${res.status}: ${baseUrl}${res.path} (${res.durationMs}ms)`);
    if (!res.ok) {
      allPass = false;
      failures.push(res);
    }
  }

  console.log(`\nOverall Result: ${allPass ? 'ALL ROUTES 200/301 OK (PASS)' : 'SOME ROUTES FAILED'}`);
  console.log(`Completed in ${totalDuration}s`);

  if (!allPass) {
    console.error(`\nFailures detail (${failures.length}):`);
    failures.forEach((f) => console.error(`  - ${f.path}: Status ${f.status} (${f.error || 'Bad status'})`));
    process.exitCode = 1;
  }
}

verifyAll();
