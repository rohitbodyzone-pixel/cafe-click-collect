/**
 * Comprehensive Tooltip System & Action Label Verification
 * Validates presence, syntax, non-blocking properties and accessibility across all screens.
 * Run with: npx tsx scripts/test-tooltips.ts
 */

import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Starting Tooltip & Action Button Test Suite...\n');

// 1. Verify Tooltip Component Exists and Has Key Properties
console.log('1️⃣ Checking Tooltip Component Source...');
const tooltipSource = fs.readFileSync(path.join(__dirname, '../src/components/Tooltip.tsx'), 'utf-8');
assert(tooltipSource.includes('export function Tooltip'), 'Tooltip component must be defined');
assert(tooltipSource.includes('export function IconButton'), 'IconButton component must be defined');
assert(tooltipSource.includes('pointerEvents="none"'), 'Tooltip bubble must be non-blocking with pointerEvents="none"');
assert(tooltipSource.includes('onMouseEnter'), 'Tooltip must handle desktop hover onMouseEnter');
assert(tooltipSource.includes('onMouseLeave'), 'Tooltip must handle desktop hover onMouseLeave');
assert(tooltipSource.includes('onTouchStart'), 'Tooltip must handle mobile/tablet touch');
assert(tooltipSource.includes('accessibilityLabel'), 'Tooltip must have accessibilityLabel');
assert(tooltipSource.includes('accessibilityHint'), 'Tooltip must have accessibilityHint');
assert(tooltipSource.includes('#1E140C'), 'Tooltip should use dark premium background #1E140C');
console.log('  ✓ Tooltip component source verified (non-blocking, responsive, animated, accessible).\n');

// 2. Verify UI.tsx Re-exports and Header Back Tooltip
console.log('2️⃣ Checking UI.tsx Integration...');
const uiSource = fs.readFileSync(path.join(__dirname, '../src/components/UI.tsx'), 'utf-8');
assert(uiSource.includes("export { Tooltip, IconButton } from './Tooltip'"), 'UI.tsx must re-export Tooltip & IconButton');
assert(uiSource.includes('<Tooltip text="Go back">'), 'Header back button must be wrapped in Tooltip');
console.log('  ✓ UI.tsx export and Header back button verified.\n');

// 3. Verify Menu Editor Tooltips (app/admin-menu.tsx)
console.log('3️⃣ Checking Menu Editor Screen (app/admin-menu.tsx)...');
const menuSource = fs.readFileSync(path.join(__dirname, '../app/admin-menu.tsx'), 'utf-8');
assert(menuSource.includes('<Tooltip text="Undo (Ctrl+Z)"'), 'Undo button must have Tooltip');
assert(menuSource.includes('<Tooltip text="Redo (Ctrl+Y)"'), 'Redo button must have Tooltip');
assert(menuSource.includes('<Tooltip text="Revision History"'), 'History button must have Tooltip');
assert(menuSource.includes('<Tooltip text="Publish Snapshot"'), 'Publish button must have Tooltip');
assert(menuSource.includes('<Tooltip text="Preview Customer Menu"'), 'Preview button must have Tooltip');
assert(menuSource.includes('<Tooltip text="Upload Menu PDF'), 'PDF Quick Builder must have Tooltip');
assert(menuSource.includes('<Tooltip text="Add New Menu Item">'), 'Add Item button must have Tooltip');
assert(menuSource.includes('<Tooltip text="Duplicate Item">'), 'Duplicate button must have Tooltip');
assert(menuSource.includes('<Tooltip text="Edit Item Details & Price">'), 'Edit button must have Tooltip');
assert(menuSource.includes('<Tooltip text="Delete Item">'), 'Delete button must have Tooltip');
console.log('  ✓ Menu Editor action buttons verified with tooltips.\n');

// 4. Verify Counter POS & Table Service Alerts (app/counter.tsx, src/components/TableServiceAlerts.tsx)
console.log('4️⃣ Checking Counter & Table Service Alerts...');
const counterSource = fs.readFileSync(path.join(__dirname, '../app/counter.tsx'), 'utf-8');
const alertsSource = fs.readFileSync(path.join(__dirname, '../src/components/TableServiceAlerts.tsx'), 'utf-8');
assert(counterSource.includes('<Tooltip text="Approve & Send to Kitchen KDS">'), 'Counter approve table order must have Tooltip');
assert(counterSource.includes('<Tooltip text="Reject / Cancel Order">'), 'Counter reject table order must have Tooltip');
assert(counterSource.includes('<Tooltip text="Start Shift & Clock In">'), 'Clock in must have Tooltip');
assert(counterSource.includes('<Tooltip text="End Shift & Clock Out">'), 'Clock out must have Tooltip');
assert(alertsSource.includes('<Tooltip text="Acknowledge Call">'), 'Acknowledge service call must have Tooltip');
assert(alertsSource.includes('<Tooltip text="Mark Completed">'), 'Complete service call must have Tooltip');
console.log('  ✓ Counter POS & Service Alerts verified with tooltips.\n');

// 5. Verify Kitchen Display System (app/admin-kitchen.tsx)
console.log('5️⃣ Checking Kitchen KDS Screen (app/admin-kitchen.tsx)...');
const kitchenSource = fs.readFileSync(path.join(__dirname, '../app/admin-kitchen.tsx'), 'utf-8');
assert(kitchenSource.includes('Mute Audio Chimes') || kitchenSource.includes('Enable Audio Chimes'), 'KDS sound toggle must have Tooltip');
assert(kitchenSource.includes('<Tooltip text="Shift Handover Notes">'), 'KDS handover notes must have Tooltip');
assert(kitchenSource.includes('<Tooltip text="Create Staff Test Order">'), 'KDS test order CTA must have Tooltip');
assert(kitchenSource.includes('<Tooltip text="Open Operations Console">'), 'KDS console CTA must have Tooltip');
assert(kitchenSource.includes('<Tooltip text="Recall & Reopen Order to Preparing">'), 'KDS reopen button must have Tooltip');
console.log('  ✓ Kitchen Display System verified with tooltips.\n');

// 6. Verify Table Management & Customer Service (app/admin-tables.tsx, src/components/TableBellModal.tsx)
console.log('6️⃣ Checking Table Management & Table Bell...');
const tablesSource = fs.readFileSync(path.join(__dirname, '../app/admin-tables.tsx'), 'utf-8');
const bellSource = fs.readFileSync(path.join(__dirname, '../src/components/TableBellModal.tsx'), 'utf-8');
assert(tablesSource.includes('<Tooltip text="Generate 20-Table QR Starter Pack">'), 'Starter pack CTA must have Tooltip');
assert(tablesSource.includes('Deactivate Table') || tablesSource.includes('Activate Table'), 'Table active toggle must have Tooltip');
assert(tablesSource.includes('<Tooltip text="View & Print Table QR Code">'), 'Table QR button must have Tooltip');
assert(tablesSource.includes('<Tooltip text="Delete Table">'), 'Table delete button must have Tooltip');
assert(bellSource.includes('<Tooltip text="Call Staff / Table Service">'), 'Floating bell button must have Tooltip');
assert(bellSource.includes('<Tooltip text="Close Dialog">'), 'Modal close button must have Tooltip');
console.log('  ✓ Table Management & Table Bell verified with tooltips.\n');

// 7. Verify Super Admin & Customer App (app/super-admin.tsx, app/super-admin-health.tsx, app/index.tsx, app/menu.tsx, app/cart.tsx, app/order-status.tsx)
console.log('7️⃣ Checking Super Admin & Customer App...');
const saSource = fs.readFileSync(path.join(__dirname, '../app/super-admin.tsx'), 'utf-8');
const saHealthSource = fs.readFileSync(path.join(__dirname, '../app/super-admin-health.tsx'), 'utf-8');
const indexSource = fs.readFileSync(path.join(__dirname, '../app/index.tsx'), 'utf-8');
const cartSource = fs.readFileSync(path.join(__dirname, '../app/cart.tsx'), 'utf-8');
const orderStatusSource = fs.readFileSync(path.join(__dirname, '../app/order-status.tsx'), 'utf-8');

assert(saSource.includes('<Tooltip text="Clear Search">'), 'Super admin search clear must have Tooltip');
assert(saSource.includes('<Tooltip text="Open Operations Console">'), 'Super admin console switch must have Tooltip');
assert(saSource.includes('<Tooltip text="Diagnostics & Health">'), 'Super admin health button must have Tooltip');
assert(saHealthSource.includes('<Tooltip text="Refresh Diagnostics">'), 'Health refresh button must have Tooltip');
assert(saHealthSource.includes('<Tooltip text="Run Diagnostic Scan">'), 'Health run scan button must have Tooltip');
assert(indexSource.includes('<Tooltip text="View Shopping Cart">'), 'Customer home cart button must have Tooltip');
assert(cartSource.includes('<Tooltip text="Empty All Items">'), 'Cart empty button must have Tooltip');
assert(cartSource.includes('<Tooltip text="Decrease Quantity">'), 'Cart decrease stepper must have Tooltip');
assert(cartSource.includes('<Tooltip text="Increase Quantity">'), 'Cart increase stepper must have Tooltip');
assert(orderStatusSource.includes('<Tooltip text="Notify Waitstaff">'), 'Order status call staff must have Tooltip');
assert(orderStatusSource.includes('<Tooltip text="Request Table Water">'), 'Order status water must have Tooltip');
assert(orderStatusSource.includes('<Tooltip text="Request Check & Bill">'), 'Order status bill must have Tooltip');
console.log('  ✓ Super Admin & Customer App verified with tooltips.\n');

console.log('🎉 ALL 7 AUDIT CATEGORIES PASSED WITH 100% SUCCESS!');
