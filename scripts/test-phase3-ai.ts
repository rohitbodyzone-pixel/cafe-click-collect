import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AIAnalyticsEngine } from '../src/services/ai/analyticsEngine';

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

async function runPhase3Tests() {
  console.log(`\n=== RUNNING PHASE 3 RESTAURANT AI & ANALYTICS INTEGRATION TESTS ===\n`);

  // 1. AI Restaurant Health Score (0-100 Index)
  try {
    const { data: healthData, error: healthErr } = await client.rpc('calculate_restaurant_health_score', {
      p_restaurant_id: REST_A_ID,
    });

    if (healthErr) throw healthErr;
    record(
      '1. AI Restaurant Health Score',
      healthData.overall_score >= 70 && !!healthData.grade,
      `Overall Score: ${healthData.overall_score}/100 (${healthData.grade}) · Speed: ${healthData.speed_score}% · Financial: ${healthData.financial_score}%`,
    );
  } catch (e: any) {
    record('1. AI Restaurant Health Score', false, e.message);
  }

  // 2. AI Auto-Manager / Restaurant Copilot Daily Briefing
  try {
    const { data: briefing, error: briefErr } = await client.rpc('generate_ai_copilot_briefing', {
      p_restaurant_id: REST_A_ID,
    });

    if (briefErr) throw briefErr;
    record(
      '2. AI Auto-Manager / Restaurant Copilot',
      briefing.projected_orders_today > 0 && briefing.key_priorities?.length >= 3,
      `Briefing for ${briefing.restaurant_name}: Forecast ${briefing.projected_orders_today} orders ($${briefing.projected_revenue_cents / 100}) with ${briefing.key_priorities?.length} focus priorities`,
    );
  } catch (e: any) {
    record('2. AI Auto-Manager / Restaurant Copilot', false, e.message);
  }

  // 3. AI Demand Prediction & Hourly Forecasting
  try {
    const forecast = AIAnalyticsEngine.generateHourlyDemandForecast();
    const morningRush = forecast.find((f) => f.hour === '08:00');
    record(
      '3. AI Demand & Revenue Prediction',
      forecast.length >= 8 && morningRush?.rushLevel === 'peak',
      `Calculated 24h demand curve: Peak at 08:00 (${morningRush?.projectedOrders} orders, $${morningRush?.projectedRevenueDollars} rev, ${morningRush?.recommendedStaff} baristas)`,
    );
  } catch (e: any) {
    record('3. AI Demand & Revenue Prediction', false, e.message);
  }

  // 4. AI Customer Lifetime Value & VIP Scoring (RFM)
  try {
    const goldVip = AIAnalyticsEngine.calculateCustomerCLV(2, 28, 154.0, 'Sarah Jenkins');
    record(
      '4. AI Customer Lifetime Value & VIP Score',
      goldVip.vipScore >= 80 && goldVip.segment === 'Top VIP',
      `Evaluated ${goldVip.customerName}: VIP Score ${goldVip.vipScore}/100, Segment: [${goldVip.segment}], Projected 12Mo CLV: $${goldVip.predicted12MoValueDollars}`,
    );
  } catch (e: any) {
    record('4. AI Customer Lifetime Value & VIP Score', false, e.message);
  }

  // 5. AI Menu Optimizer Matrix (BCG Matrix)
  try {
    const { data: matrixData, error: matrixErr } = await client.rpc('get_menu_optimization_matrix', {
      p_restaurant_id: REST_A_ID,
    });

    if (matrixErr) throw matrixErr;
    record(
      '5. AI Menu Optimizer (BCG Matrix)',
      !!matrixData.stars && !!matrixData.puzzles && !!matrixData.plowhorses && !!matrixData.dogs,
      `Categorized menu: Stars (${matrixData.stars[0]?.name}), Puzzles (${matrixData.puzzles[0]?.name}), Dogs (${matrixData.dogs[0]?.name})`,
    );
  } catch (e: any) {
    record('5. AI Menu Optimizer (BCG Matrix)', false, e.message);
  }

  // 6. AI Price & Profit Optimizer with Mandatory Human Approval
  try {
    const { data: recs, error: recErr } = await client
      .from('ai_recommendations')
      .select('*')
      .eq('restaurant_id', REST_A_ID);

    if (recErr) throw recErr;
    if (!recs || recs.length === 0) throw new Error('No AI recommendations found');

    const oatMilkRec = recs.find((r) => r.category === 'pricing') || recs[0];

    // Approve recommendation via secure RPC
    const { data: approveRes, error: approveErr } = await client.rpc('approve_ai_recommendation', {
      p_rec_id: oatMilkRec.id,
      p_approved_by: 'Owner Rohit',
    });

    if (approveErr) throw approveErr;
    record(
      '6. AI Price & Profit Optimizer (Human Approval)',
      approveRes.status === 'approved' && approveRes.approved_by === 'Owner Rohit',
      `Evaluated "+$${oatMilkRec.potential_monthly_impact_cents / 100}/mo" price optimization with owner sign-off requirement`,
    );
  } catch (e: any) {
    record('6. AI Price & Profit Optimizer (Human Approval)', false, e.message);
  }

  // 7. Smart Win-Back AI Campaign Launchpad
  try {
    const { data: campaigns, error: campErr } = await client
      .from('ai_winback_campaigns')
      .select('*')
      .eq('restaurant_id', REST_A_ID);

    if (campErr) throw campErr;
    if (!campaigns || campaigns.length === 0) throw new Error('No win-back campaigns found');

    const winback = campaigns[0];

    // Approve campaign and register promo code in promo_codes table
    const { data: campApproval, error: campApproveErr } = await client.rpc('approve_winback_campaign', {
      p_campaign_id: winback.id,
      p_approved_by: 'Owner Rohit',
    });

    if (campApproveErr) throw campApproveErr;

    // Verify promo code was created
    const { data: promoData, error: promoErr } = await client
      .from('promo_codes')
      .select('*')
      .eq('restaurant_id', REST_A_ID)
      .eq('code', winback.suggested_discount_code.toUpperCase());

    if (promoErr) throw promoErr;

    record(
      '7. Smart Win-Back AI Campaign Launchpad',
      campApproval.status === 'approved' && !!promoData && promoData.length > 0,
      `Targeted ${winback.customer_count} dormant regulars, approved campaign and activated promo code "${winback.suggested_discount_code}"`,
    );
  } catch (e: any) {
    record('7. Smart Win-Back AI Campaign Launchpad', false, e.message);
  }

  // 8. AI Loss & Fraud Monitor (Non-Accusatory Anomaly Log)
  try {
    const { data: anomalies, error: anomErr } = await client
      .from('ai_anomalies_log')
      .select('*')
      .eq('restaurant_id', REST_A_ID);

    if (anomErr) throw anomErr;
    if (!anomalies || anomalies.length === 0) throw new Error('No anomalies found');

    record(
      '8. AI Loss, Waste & Anomaly Monitor',
      anomalies.length >= 2,
      `Logged ${anomalies.length} non-accusatory operational variance notes: "${anomalies[0].title}"`,
    );
  } catch (e: any) {
    record('8. AI Loss, Waste & Anomaly Monitor', false, e.message);
  }

  // 9. AI Incident Timeline & Restaurant Institutional Memory
  try {
    const { data: incidents, error: incErr } = await client
      .from('restaurant_incidents_memory')
      .select('*')
      .eq('restaurant_id', REST_A_ID);

    if (incErr) throw incErr;
    if (!incidents || incidents.length === 0) throw new Error('No incidents found');

    record(
      '9. AI Restaurant Memory & Incident Timeline',
      incidents.length >= 2,
      `Recorded ${incidents.length} institutional memory logs: "${incidents[0].title}" (Logged by ${incidents[0].logged_by})`,
    );
  } catch (e: any) {
    record('9. AI Restaurant Memory & Incident Timeline', false, e.message);
  }

  console.log(`\n=== PHASE 3 TEST SUMMARY ===`);
  const allPassed = results.every((r) => r.passed);
  console.log(`Result: ${results.filter((r) => r.passed).length}/${results.length} PASSED (${allPassed ? '100%' : 'FAILED'})\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase3Tests();
