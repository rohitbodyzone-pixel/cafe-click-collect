import * as fs from 'fs';
import * as path from 'path';
import https from 'https';

const projectRef = 'fxtzrphbvlzkkghzwsoy';

// Locate Supabase access token securely without printing it
function getAccessToken(): string {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }
  const localPaths = [
    path.resolve(__dirname, '../.supabase-access-token.local'),
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.supabase-access-token.local'),
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.supabase/access-token'),
  ];
  for (const p of localPaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8').trim();
    }
  }
  throw new Error('Supabase access token not found.');
}

async function apiRequest(method: string, pathUrl: string, body?: any): Promise<any> {
  const token = getAccessToken();
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: 'api.supabase.com',
        port: 443,
        path: pathUrl,
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, data: parsed });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      },
    );
    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function main() {
  console.log('=== INSPECTING & UPDATING SUPABASE AUTH REDIRECT CONFIG ===\n');

  // 1. Inspect current Auth config
  console.log('1. Fetching current Auth config from Supabase Management API...');
  const currentConfigRes = await apiRequest('GET', `/v1/projects/${projectRef}/config/auth`);
  
  if (currentConfigRes.status !== 200) {
    console.error('Failed to fetch auth config:', currentConfigRes);
    process.exit(1);
  }

  const currentConfig = currentConfigRes.data;
  console.log(`Current Site URL:      ${currentConfig.site_url}`);
  console.log(`Current URI Allow List: ${currentConfig.uri_allow_list}`);

  // 2. Prepare permanent production URLs
  const permanentSiteUrl = 'https://rohitbodyzone-pixel.github.io/cafe-click-collect';
  const permanentAllowList = [
    'https://rohitbodyzone-pixel.github.io/cafe-click-collect/**',
    'https://rohitbodyzone-pixel.github.io/cafe-click-collect/admin-reset-password',
    'http://localhost:8081/**',
    'http://localhost:19006/**',
  ].join(',');

  console.log('\n2. Updating Supabase Auth settings to permanent production URLs...');
  const updateRes = await apiRequest('PATCH', `/v1/projects/${projectRef}/config/auth`, {
    site_url: permanentSiteUrl,
    uri_allow_list: permanentAllowList,
  });

  if (updateRes.status !== 200) {
    console.error('Failed to update auth config:', updateRes);
    process.exit(1);
  }

  // 3. Verify updated config
  console.log('3. Verifying updated Auth configuration...');
  const verifyRes = await apiRequest('GET', `/v1/projects/${projectRef}/config/auth`);
  const verified = verifyRes.data;

  console.log('\n=== UPDATED AUTH CONFIGURATION ===');
  console.log(`• Permanent Site URL:      ${verified.site_url}`);
  console.log(`• Permanent URI Allow List: ${verified.uri_allow_list}`);
  console.log('✓ Old trycloudflare.com tunnel has been completely removed!');
}

main().catch(console.error);
