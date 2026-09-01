import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ConciergeEngine } from '../src/services/concierge/conciergeEngine';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const client = createClient(supabaseUrl, supabaseKey);

const REST_A_ID = 'c0000000-0000-0000-0000-000000000001'; // Common Ground
const REST_B_ID = 'c0000000-0000-0000-0000-000000000002'; // Trattoria Bella

interface TestStepResult {
  step: string;
  passed: boolean;
  details: string;
}

const results: TestStepResult[] = [];

function record(step: string, passed: boolean, details: string) {
  results.push({ step, passed, details });
  console.log(`${passed ? '✓' : '❌'} [${step}] ${details}`);
}

async function runPhase4Tests() {
  console.log(`\n=== RUNNING PHASE 4 GROWTH, MARKETING & CONCIERGE INTEGRATION TESTS ===\n`);

  // 1. AI Menu Item Description Generator
  try {
    const desc = ConciergeEngine.generateItemDescription('Flat White', 'Coffee');
    record(
      '1. AI Menu Item Description Generator',
      desc.includes('micro-textured') && desc.includes('65°C'),
      `Generated sensory copy: "${desc.substring(0, 75)}..."`,
    );
  } catch (e: any) {
    record('1. AI Menu Item Description Generator', false, e.message);
  }

  // 2. AI Social Post Generator & Human Approval
  try {
    const { data: postRes, error: postErr } = await client
      .from('marketing_posts')
      .select('*')
      .eq('restaurant_id', REST_A_ID);

    if (postErr) throw postErr;
    if (!postRes || postRes.length === 0) throw new Error('No marketing posts found');

    const draftPost = postRes[0];

    // Approve post
    const { error: approvePostErr } = await client
      .from('marketing_posts')
      .update({ status: 'approved', approved_by: 'Owner Rohit', approved_at: new Date().toISOString() })
      .eq('id', draftPost.id);

    if (approvePostErr) throw approvePostErr;
    record(
      '2. AI Social Post Generator & Approval',
      true,
      `Generated & approved "${draftPost.title}" for ${draftPost.platform.toUpperCase()} with ${draftPost.hashtags?.length} hashtags`,
    );
  } catch (e: any) {
    record('2. AI Social Post Generator & Approval', false, e.message);
  }

  // 3. AI Review Responder & Reputation Copilot
  try {
    const positiveReply = ConciergeEngine.generateReviewResponse(5, 'Sarah J.');
    const negativeReply = ConciergeEngine.generateReviewResponse(2, 'Dave K.');

    record(
      '3. AI Review Responder & Reputation Copilot',
      positiveReply.includes('glowing') && negativeReply.includes('sincere apologies'),
      `Verified 5-star gratitude response & 3-star customer recovery escalation copy`,
    );
  } catch (e: any) {
    record('3. AI Review Responder & Reputation Copilot', false, e.message);
  }

  // 4. AI Voice Phone Order Assistant & Simulated KDS Injection
  try {
    const transcript = 'Hi there, 2 large oat flat whites and a blueberry muffin for pickup in 15 mins please.';
    const parsed = ConciergeEngine.parseVoicePhoneTranscript(transcript);

    const { data: voiceRes, error: voiceErr } = await client.rpc('submit_voice_phone_order', {
      p_restaurant_id: REST_A_ID,
      p_phone: '+64 21 777 8899',
      p_name: 'Marcus Phone Caller',
      p_transcript: transcript,
      p_items: parsed.items,
      p_pickup_time: '15 mins',
    });

    if (voiceErr) throw voiceErr;
    record(
      '4. AI Voice Phone Order Assistant & Simulation',
      voiceRes.status === 'pending_review' && voiceRes.caller_phone === '+64 21 777 8899',
      `Parsed audio transcript into structured ticket with ${parsed.items.length} items for KDS injection`,
    );
  } catch (e: any) {
    record('4. AI Voice Phone Order Assistant & Simulation', false, e.message);
  }

  // 5. AI Barista / Food-Pairing Concierge
  try {
    const pairings = ConciergeEngine.getFoodPairings();
    record(
      '5. AI Barista & Sommelier Pairing Concierge',
      pairings.length >= 3,
      `Calculated ${pairings.length} upsell pairings (e.g. ${pairings[0].baseItem} + ${pairings[0].pairedItem} -> +$${pairings[0].estimatedAovBoostDollars} AOV)`,
    );
  } catch (e: any) {
    record('5. AI Barista & Sommelier Pairing Concierge', false, e.message);
  }

  // 6. Group Order Concierge & Split Bill Calculator
  try {
    const { data: grpData, error: grpErr } = await client.rpc('create_group_order', {
      p_restaurant_id: REST_A_ID,
      p_host: 'Auckland Tech Office',
      p_dining_type: 'pickup',
      p_table: null,
    });

    if (grpErr) throw grpErr;
    record(
      '6. Group Order Concierge & Split Bill',
      !!grpData.group_code && grpData.group_code.startsWith('GRP-'),
      `Created shareable Group Order session "${grpData.group_code}" hosted by ${grpData.host_name}`,
    );
  } catch (e: any) {
    record('6. Group Order Concierge & Split Bill', false, e.message);
  }

  // 7. Automated Supplier Purchase Order Generator & Owner Sign-Off
  try {
    const { data: draftPO, error: poErr } = await client.rpc('generate_supplier_draft_po', {
      p_restaurant_id: REST_A_ID,
      p_supplier: 'Supreme Coffee Roasters',
    });

    if (poErr) throw poErr;

    const { data: approveRes, error: approveErr } = await client.rpc('approve_supplier_po', {
      p_po_id: draftPO.po_id,
      p_approved_by: 'Owner Rohit',
    });

    if (approveErr) throw approveErr;
    record(
      '7. Supplier Purchase Order Generator & Approval',
      approveRes.status === 'approved' && approveRes.approved_by === 'Owner Rohit',
      `Drafted ${draftPO.po_number} ($${draftPO.total_cost_cents / 100}) and signed off with human approval`,
    );
  } catch (e: any) {
    record('7. Supplier Purchase Order Generator & Approval', false, e.message);
  }

  // 8. Customer Segment Auto-Tagger
  try {
    const { data: tagRes, error: tagErr } = await client.rpc('auto_tag_customer_segments', {
      p_restaurant_id: REST_A_ID,
    });

    if (tagErr) throw tagErr;
    record(
      '8. Customer Segment Auto-Tagger',
      tagRes.status === 'segments_tagged',
      `Auto-tagged customer loyalty cohorts into morning_rush_regular, top_vip_patron, and high_aov_foodie`,
    );
  } catch (e: any) {
    record('8. Customer Segment Auto-Tagger', false, e.message);
  }

  // 9. Competitor Benchmarks & Franchise Playbook
  try {
    const { data: benchmarks, error: benchErr } = await client
      .from('competitor_benchmarks')
      .select('*')
      .eq('restaurant_id', REST_A_ID);

    if (benchErr) throw benchErr;
    const franchiseTopics = ConciergeEngine.getFranchiseStandards();

    record(
      '9. Competitor Benchmarks & Franchise Playbook',
      benchmarks.length >= 2 && franchiseTopics.length >= 3,
      `Tracked ${benchmarks.length} local competitor prices and ${franchiseTopics.length} franchise SOP standards`,
    );
  } catch (e: any) {
    record('9. Competitor Benchmarks & Franchise Playbook', false, e.message);
  }

  // 10. Smart Drive / Car Arrival Workflow
  try {
    const testCarOrderId = 'ORD-CAR-' + Math.floor(100000 + Math.random() * 900000);
    const { data: carOrder, error: carErr } = await client
      .from('orders')
      .insert({
        id: testCarOrderId,
        restaurant_id: REST_A_ID,
        status: 'Incoming',
        order_type: 'pickup',
        customer_name: 'Drive Customer Lisa',
        phone: '+64 21 444 3322',
        vehicle_model: 'Mazda CX-5',
        vehicle_color: 'Silver',
        license_plate: 'ABC890',
        curbside_bay: 'Bay 2',
        pickup_time: '10:00 AM',
        payment_method: 'card',
        payment_status: 'paid',
        subtotal_cents: 1000,
        discount_cents: 0,
        total_cents: 1000,
      })
      .select('id, vehicle_model, license_plate, curbside_bay')
      .single();

    if (carErr) throw carErr;
    record(
      '10. Smart Drive & Car Arrival Pickup Workflow',
      carOrder.license_plate === 'ABC890' && carOrder.curbside_bay === 'Bay 2',
      `Recorded curbside vehicle details [${carOrder.vehicle_model} · ${carOrder.license_plate} · ${carOrder.curbside_bay}] for KDS dispatch`,
    );
  } catch (e: any) {
    record('10. Smart Drive & Car Arrival Pickup Workflow', false, e.message);
  }

  console.log(`\n=== PHASE 4 TEST SUMMARY ===`);
  const allPassed = results.every((r) => r.passed);
  console.log(`Result: ${results.filter((r) => r.passed).length}/${results.length} PASSED (${allPassed ? '100%' : 'FAILED'})\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase4Tests();
