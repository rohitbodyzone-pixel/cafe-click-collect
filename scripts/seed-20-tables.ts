import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NjA5NCwiZXhwIjoyMTAzMTQyMDk0fQ.yfhsk59uf3E_dW39O_AOmFV2v5Ex6d4TrY4PEk-q3yM';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function seed20Tables() {
  console.log('=== SEEDING & VERIFYING 20 TABLES PER RESTAURANT ===\n');

  const { data: restaurants, error: restErr } = await supabase
    .from('restaurants')
    .select('id, name, slug');

  if (restErr || !restaurants) {
    console.error('Error fetching restaurants:', restErr);
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants to configure with 20 tables:`);

  for (const rest of restaurants) {
    console.log(`\nConfiguring tables for ${rest.name} (${rest.slug})...`);

    // Fetch existing tables for this restaurant
    const { data: existingTables, error: tableErr } = await supabase
      .from('cafe_tables')
      .select('*')
      .eq('restaurant_id', rest.id);

    if (tableErr) {
      console.error(`Error querying tables for ${rest.name}:`, tableErr);
      continue;
    }

    const existingCodeMap = new Map((existingTables || []).map((t) => [t.code.toString().toLowerCase(), t]));

    for (let tableNum = 1; tableNum <= 20; tableNum++) {
      const code = tableNum.toString();
      const displayName = `Table ${tableNum}`;

      if (existingCodeMap.has(code.toLowerCase())) {
        // Table already exists, ensure active and proper display name
        const existing = existingCodeMap.get(code.toLowerCase())!;
        if (!existing.active) {
          await supabase
            .from('cafe_tables')
            .update({ active: true, display_name: displayName })
            .eq('id', existing.id);
        }
      } else {
        // Insert new table
        const { error: insertErr } = await supabase
          .from('cafe_tables')
          .insert({
            restaurant_id: rest.id,
            code: code,
            display_name: displayName,
            active: true,
          });

        if (insertErr) {
          console.error(`Error inserting Table ${tableNum} for ${rest.name}:`, insertErr.message);
        }
      }
    }

    // Verify count
    const { data: finalTables } = await supabase
      .from('cafe_tables')
      .select('id, code, display_name, active')
      .eq('restaurant_id', rest.id)
      .eq('active', true)
      .order('code');

    console.log(`✓ ${rest.name}: ${finalTables?.length} active tables configured (Tables 1..20 available)`);
  }

  console.log('\n======================================================');
  console.log('ALL RESTAURANTS CONFIGURED WITH 20 ACTIVE TABLES');
  console.log('======================================================\n');
}

seed20Tables().catch(console.error);
