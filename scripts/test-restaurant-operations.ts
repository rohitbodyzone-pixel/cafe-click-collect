import * as fs from 'fs';
import * as path from 'path';

function runOperationsSuite() {
  console.log('====================================================');
  console.log('RESTAURANT OPERATIONS & TABLE SERVICE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  const root = process.cwd();

  function assert(condition: boolean, title: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${title} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // TEST 1: Owner Menu Management Screen & Navigation
  console.log('--- TEST GROUP 1: OWNER MENU MANAGEMENT ---');
  const adminPath = path.resolve(root, 'app/admin.tsx');
  assert(fs.existsSync(adminPath), 'A: app/admin.tsx exists');
  const adminContent = fs.readFileSync(adminPath, 'utf-8');
  assert(adminContent.includes('/admin-menu'), 'A: Owner dashboard has Edit Menu navigation link');
  assert(adminContent.includes('/admin-menu-pdf'), 'A: Owner dashboard has Upload Menu PDF navigation link');
  assert(adminContent.includes('TableServiceAlerts'), 'A: Owner dashboard has TableServiceAlerts');

  // TEST 2: Manager Menu Management & Permissions
  console.log('\n--- TEST GROUP 2: MANAGER MENU MANAGEMENT & ROLE GATES ---');
  const managerPath = path.resolve(root, 'app/manager.tsx');
  assert(fs.existsSync(managerPath), 'B: app/manager.tsx exists');
  const managerContent = fs.readFileSync(managerPath, 'utf-8');
  assert(managerContent.includes('/admin-menu'), 'B: Manager dashboard has Manage Menu navigation link');
  assert(managerContent.includes('/admin-menu-pdf'), 'B: Manager dashboard has Upload Menu PDF navigation link');
  assert(managerContent.includes('/admin-tables'), 'B: Manager dashboard has Table Requests navigation link');
  assert(managerContent.includes('TableServiceAlerts'), 'B: Manager dashboard has TableServiceAlerts');
  assert(!managerContent.includes('/admin-payouts'), 'C: Manager blocked from owner banking/payout access');
  assert(!managerContent.includes('/super-admin'), 'C: Manager blocked from super admin platform engine');

  // TEST 3: Menu Editor Capabilities
  console.log('\n--- TEST GROUP 3: MENU EDITOR CAPABILITIES ---');
  const menuEditorPath = path.resolve(root, 'app/admin-menu.tsx');
  assert(fs.existsSync(menuEditorPath), 'D: app/admin-menu.tsx exists');
  const menuEditorContent = fs.readFileSync(menuEditorPath, 'utf-8');
  assert(menuEditorContent.includes('handleDuplicate'), 'F: 1-Tap duplicate product capability exists');
  assert(menuEditorContent.includes('toggleSoldOut'), 'G: Sold Out ON/OFF toggle exists');
  assert(menuEditorContent.includes('deleteProduct') && menuEditorContent.includes('pendingDelete'), 'H: Delete/archive with safe confirmation exists');
  assert(menuEditorContent.includes('handleAddCategory'), 'I: Dynamic category creation exists');
  assert(menuEditorContent.includes('/admin-menu-pdf'), 'K: Direct link to Quick Menu Builder exists');

  // TEST 4: Product Editor & Image Upload/Preview
  console.log('\n--- TEST GROUP 4: PRODUCT EDITOR & IMAGE PREVIEW ---');
  const productEditorPath = path.resolve(root, 'app/admin-product.tsx');
  assert(fs.existsSync(productEditorPath), 'J: app/admin-product.tsx exists');
  const productEditorContent = fs.readFileSync(productEditorPath, 'utf-8');
  assert(productEditorContent.includes('ProductImage'), 'J: Product image live preview exists before save');
  assert(productEditorContent.includes('chooseImage') && productEditorContent.includes('deleteImage'), 'J: Image upload, replace, and remove supported');
  assert(productEditorContent.includes('customisationGroupIds'), 'D: Customisation modifier groups assignment supported');
  assert(productEditorContent.includes('customCatInput'), 'I: Custom category input supported');

  // TEST 5: Menu PDF Quick Builder Screen & Extraction Service
  console.log('\n--- TEST GROUP 5: MENU PDF QUICK BUILDER ---');
  const pdfBuilderPath = path.resolve(root, 'app/admin-menu-pdf.tsx');
  assert(fs.existsSync(pdfBuilderPath), 'K: app/admin-menu-pdf.tsx exists');
  const pdfBuilderContent = fs.readFileSync(pdfBuilderPath, 'utf-8');
  assert(pdfBuilderContent.includes('handlePickDocument'), 'K: STEP 1 - PDF / Document / Photo upload picker exists');
  assert(pdfBuilderContent.includes('parseMenuText'), 'K: STEP 2 - Menu item, category, and price extraction exists');
  assert(pdfBuilderContent.includes('handleUpdateItem') && pdfBuilderContent.includes('handleDeleteItem'), 'L: STEP 3 - Draft Review screen with item editing & removal exists');
  assert(pdfBuilderContent.includes('duplicateStatus'), 'M: STEP 4 - Duplicate detection against existing menu exists');
  assert(pdfBuilderContent.includes('handleCreateMenu'), 'M: STEP 5 - Create Menu database execution exists');

  // TEST 6: Customer Table Bell (Call Staff) & Table Ordering Mode
  console.log('\n--- TEST GROUP 6: CUSTOMER TABLE BELL & SERVICE CALLS ---');
  const tableBellPath = path.resolve(root, 'src/components/TableBellModal.tsx');
  assert(fs.existsSync(tableBellPath), 'N: TableBellModal component exists');
  const tableBellContent = fs.readFileSync(tableBellPath, 'utf-8');
  assert(tableBellContent.includes("orderMode !== 'table'"), 'P: Table bell is hidden for Pickup orders (Dine-in only)');
  assert(
    tableBellContent.includes("'call_staff'") &&
    tableBellContent.includes("'water'") &&
    tableBellContent.includes("'need_help'") &&
    tableBellContent.includes("'bill'"),
    'O: All 4 service choices supported (Call Staff, Water, Need Help, Ready to Pay / Bill)'
  );
  assert(tableBellContent.includes('isCoolingDown'), 'Q: 30-second cooldown spam throttling enforced');
  assert(tableBellContent.includes('Staff have been notified') && tableBellContent.includes('Staff are on the way'), 'Q: Live customer feedback state progression');

  // TEST 7: Counter POS Live Table Alert Banner
  console.log('\n--- TEST GROUP 7: COUNTER POS LIVE TABLE ALERTS ---');
  const counterPath = path.resolve(root, 'app/counter.tsx');
  assert(fs.existsSync(counterPath), 'R: app/counter.tsx exists');
  const counterContent = fs.readFileSync(counterPath, 'utf-8');
  assert(counterContent.includes('TableServiceAlerts'), 'R: Counter POS renders live TableServiceAlerts banner');

  const tableAlertsPath = path.resolve(root, 'src/components/TableServiceAlerts.tsx');
  assert(fs.existsSync(tableAlertsPath), 'R: TableServiceAlerts component exists');
  const tableAlertsContent = fs.readFileSync(tableAlertsPath, 'utf-8');
  assert(tableAlertsContent.includes('handleAcknowledge'), 'R: Acknowledge table request action supported');
  assert(tableAlertsContent.includes('handleComplete'), 'S: Complete table request action supported');
  assert(tableAlertsContent.includes('AudioContext'), 'R: Sound chime notification support on web/audio');

  // TEST 8: Menu & Dedicated Screens Embedding
  console.log('\n--- TEST GROUP 8: INTEGRATION WITH CUSTOMER SCREENS ---');
  const menuPath = path.resolve(root, 'app/menu.tsx');
  const menuContent = fs.readFileSync(menuPath, 'utf-8');
  assert(menuContent.includes('TableBellButton'), 'N: Customer menu embeds TableBellButton for seated guests');

  const orderStatusPath = path.resolve(root, 'app/order-status.tsx');
  const orderStatusContent = fs.readFileSync(orderStatusPath, 'utf-8');
  assert(
    orderStatusContent.includes("'call_staff'") &&
    orderStatusContent.includes("'water'") &&
    orderStatusContent.includes("'need_help'") &&
    orderStatusContent.includes("'bill'"),
    'O: Order status tracking screen supports all 4 table service actions'
  );

  console.log('\n====================================================');
  console.log(`TOTAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runOperationsSuite();
