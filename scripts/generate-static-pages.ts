import * as fs from 'fs';
import * as path from 'path';

const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf-8');

// Copy 404.html
fs.writeFileSync(path.join(distDir, '404.html'), indexContent, 'utf-8');

const routes = [
  'restaurants',
  'cart',
  'pickup-time',
  'checkout',
  'confirmation',
  'order-status',
  'orders',
  'rewards',
  'passes',
  'menu',
  'admin',
  'admin-kitchen',
  'admin-tables',
  'admin-table-qr',
  'admin-menu',
  'admin-product',
  'admin-customisations',
  'admin-pickup-settings',
  'admin-loyalty',
  'admin-payments',
  'admin-staff',
  'admin-operations',
  'admin-ai',
  'admin-growth',
  'admin-payouts',
  'admin-analytics',
  'admin-reset-password',
  'super-admin',
  'super-admin-billing',
  'super-admin-features',
  'r/common-ground/table/5',
  'r/trattoria-bella/table/B10',
];

for (const route of routes) {
  const targetDir = path.join(distDir, route);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(path.join(targetDir, 'index.html'), indexContent, 'utf-8');
}

console.log(`✓ Generated ${routes.length} static route entry points in dist/ for 200 OK direct URL loading.`);
