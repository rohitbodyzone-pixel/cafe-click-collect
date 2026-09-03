import * as fs from 'fs';
import * as path from 'path';

function runTests() {
  console.log('=== CUSTOMER NAVIGATION & MY PROFILE VERIFICATION SUITE ===\n');

  let passed = 0;
  let total = 0;
  const root = process.cwd();

  function assert(condition: boolean, name: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${name}`);
      process.exitCode = 1;
    }
  }

  // 1. Check CustomerBottomNav component exists and contains 5 tabs
  const navPath = path.resolve(root, 'src/components/CustomerBottomNav.tsx');
  assert(fs.existsSync(navPath), 'CustomerBottomNav component exists');
  const navContent = fs.readFileSync(navPath, 'utf-8');
  assert(
    navContent.includes("'home'") &&
    navContent.includes("'explore'") &&
    navContent.includes("'orders'") &&
    navContent.includes("'cart'") &&
    navContent.includes("'profile'"),
    'CustomerBottomNav has all 5 tabs: Home, Explore, Orders, Cart, Profile'
  );

  // 2. Check app/profile.tsx exists and has required sections
  const profilePath = path.resolve(root, 'app/profile.tsx');
  assert(fs.existsSync(profilePath), 'app/profile.tsx exists');
  const profileContent = fs.readFileSync(profilePath, 'utf-8');
  assert(
    profileContent.includes("isFeatureEnabled('loyalty_rewards')") &&
    profileContent.includes("isFeatureEnabled('prepaid_passes')") &&
    profileContent.includes("isFeatureEnabled('digital_wallet_passes')") &&
    profileContent.includes("isFeatureEnabled('my_usual')"),
    'My Profile respects dual-level feature controls for loyalty, passes, wallet, and usual'
  );
  assert(
    profileContent.includes('CustomerBottomNav') &&
    profileContent.includes('activeTab="profile"'),
    'My Profile renders CustomerBottomNav with activeTab="profile"'
  );

  // 3. Check app/index.tsx has Pickup/Dine In choice cards and mode switcher
  const indexPath = path.resolve(root, 'app/index.tsx');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  assert(
    indexContent.includes('startSection') &&
    indexContent.includes('PICKUP') &&
    indexContent.includes('DINE IN') &&
    indexContent.includes('Order ahead & collect') &&
    indexContent.includes('Order at your table'),
    'Home starting screen displays large visual PICKUP and DINE IN choice cards'
  );
  assert(
    indexContent.includes('modeSwitcherRow') &&
    indexContent.includes('modePill'),
    'Home header contains quick mode toggle switcher for Pickup ↔ Dine In'
  );
  assert(
    indexContent.includes('tableCode') &&
    indexContent.includes("setOrderMode('table', found)"),
    'Table QR smart bypass automatically recognizes table and bypasses choice'
  );
  assert(
    indexContent.includes('rewardReminderBanner') &&
    indexContent.includes("router.push('/profile')"),
    'Home contextual reward reminder banner navigates to My Profile'
  );

  // 4. Check existing /rewards and /passes routes remain intact
  const rewardsPath = path.resolve(root, 'app/rewards.tsx');
  const passesPath = path.resolve(root, 'app/passes.tsx');
  assert(fs.existsSync(rewardsPath), 'Direct /rewards route preserved');
  assert(fs.existsSync(passesPath), 'Direct /passes route preserved');

  // 5. Check static page generation includes profile
  const staticGenPath = path.resolve(root, 'scripts/generate-static-pages.ts');
  const staticGenContent = fs.readFileSync(staticGenPath, 'utf-8');
  assert(
    staticGenContent.includes("'profile'"),
    'generate-static-pages.ts includes profile route for static HTML rendering'
  );

  console.log(`\n======================================================================`);
  console.log(`CUSTOMER NAVIGATION SUITE: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`======================================================================\n`);
}

runTests();
