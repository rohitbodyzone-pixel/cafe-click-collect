import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ALL_DATABASE_TABLES = [
  'restaurants',
  'restaurant_staff',
  'products',
  'customisation_groups',
  'customisation_options',
  'product_customisation_groups',
  'restaurant_feature_permissions',
  'orders',
  'order_items',
  'staff_attendance',
  'cafe_tables',
  'table_service_requests',
  'cafe_settings',
  'loyalty_settings',
  'customer_loyalty',
  'promo_codes',
  'payment_settings',
  'payment_attempts',
  'refund_requests',
  'customer_usuals',
  'smart_upsell_rules',
  'customer_feedback_reviews',
  'prepaid_pass_templates',
  'customer_prepaid_passes',
  'inventory_items',
  'inventory_logs',
  'staff_shifts',
  'operations_checklists',
  'checklist_completions',
  'restaurant_training_docs',
  'printer_configs',
  'pos_integrations',
  'ai_recommendations',
  'ai_winback_campaigns',
  'ai_anomalies_log',
  'restaurant_incidents_memory',
  'marketing_posts',
  'supplier_purchase_orders',
  'group_orders',
  'simulated_voice_orders',
  'competitor_benchmarks',
  'tenant_financial_ledger',
  'stripe_webhook_events',
  'restaurant_menu_drafts',
  'restaurant_printer_settings',
  'device_push_tokens',
  'restaurant_pos_connections',
  'pos_sync_logs',
  'customer_wallet_passes',
];

async function exportFullBackup() {
  console.log('=== INITIATING COMPLETE PLATFORM DATA BACKUP ===');
  console.log(`Supabase Endpoint: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupData: Record<string, any[]> = {};
  const stats: Record<string, number> = {};
  let totalRecords = 0;

  for (const table of ALL_DATABASE_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`[SKIP / NOT PRESENT] ${table}: ${error.message}`);
        backupData[table] = [];
        stats[table] = 0;
      } else {
        const count = (data || []).length;
        backupData[table] = data || [];
        stats[table] = count;
        totalRecords += count;
        console.log(`[BACKED UP] ${table.padEnd(32)} -> ${count} rows`);
      }
    } catch (e: any) {
      console.warn(`[ERROR] ${table}: ${e.message}`);
      backupData[table] = [];
      stats[table] = 0;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonFilename = `cafe_backup_${timestamp}.json`;
  const latestJsonFilename = 'cafe_backup_latest.json';
  const metadataFilename = 'backup_metadata.json';

  const fullPayload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      supabaseUrl: SUPABASE_URL,
      totalTables: ALL_DATABASE_TABLES.length,
      totalRecords,
      tableStats: stats,
    },
    tables: backupData,
  };

  // Write timestamped JSON backup
  fs.writeFileSync(
    path.join(backupDir, jsonFilename),
    JSON.stringify(fullPayload, null, 2),
    'utf-8',
  );

  // Write latest JSON backup for quick reference
  fs.writeFileSync(
    path.join(backupDir, latestJsonFilename),
    JSON.stringify(fullPayload, null, 2),
    'utf-8',
  );

  // Write metadata summary
  fs.writeFileSync(
    path.join(backupDir, metadataFilename),
    JSON.stringify(fullPayload.metadata, null, 2),
    'utf-8',
  );

  // Generate SQL restore script
  const sqlFilename = `cafe_backup_${timestamp}.sql`;
  const latestSqlFilename = 'cafe_backup_latest.sql';
  let sqlContent = `-- Cafe Click & Collect Database Full Data Backup\n-- Exported At: ${new Date().toISOString()}\n\nBEGIN;\n\n`;

  for (const [table, rows] of Object.entries(backupData)) {
    if (rows.length === 0) continue;
    sqlContent += `-- Table: public.${table} (${rows.length} rows)\n`;
    for (const row of rows) {
      const keys = Object.keys(row);
      const values = keys.map((k) => {
        const val = row[k];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val;
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      sqlContent += `INSERT INTO public.${table} (${keys.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
    }
    sqlContent += '\n';
  }
  sqlContent += 'COMMIT;\n';

  fs.writeFileSync(path.join(backupDir, sqlFilename), sqlContent, 'utf-8');
  fs.writeFileSync(path.join(backupDir, latestSqlFilename), sqlContent, 'utf-8');

  console.log('\n======================================================================');
  console.log('✓ FULL DATA BACKUP SUCCESSFULLY GENERATED');
  console.log(`• Total Tables Exported: ${ALL_DATABASE_TABLES.length}`);
  console.log(`• Total Records Backed Up: ${totalRecords}`);
  console.log(`• Backup Directory: ${backupDir}`);
  console.log(`• JSON Backup: backups/${latestJsonFilename}`);
  console.log(`• SQL Restore Script: backups/${latestSqlFilename}`);
  console.log('======================================================================\n');
}

exportFullBackup();
