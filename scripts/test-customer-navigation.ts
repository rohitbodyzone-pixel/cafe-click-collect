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

  // 3. Verify Home starting screen adheres to QR-only Dine-In architecture (no manual table mode)
  const indexPath = path.resolve(root, 'app/index.tsx');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  assert(
    indexContent.includes("mode: 'pickup'") &&
    !indexContent.includes("handleChooseDineIn"),
    'Home starting screen defaults strictly to Pickup (manual Dine-In activation removed)'
  );
  assert(
    !indexContent.includes('modeSwitcherRow'),
    'Home header does not expose manual Dine-In switcher (QR-only Dine-In architecture)'
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
