import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fxtzrphbvlzkkghzwsoy.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dHpycGhidmx6a2tnaHp3c295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjYwOTQsImV4cCI6MjEwMzE0MjA5NH0.3bk5fB-0VE5fbudWZSIRBmLUTLjt9nTXG5ETdsvv6QM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPasswordReset() {
  console.log('=== TESTING PASSWORD RESET EMAIL DISPATCH ===\n');
  const targetEmail = 'rohitbodyzone@gmail.com';
  const permanentRedirectUrl = 'https://rohitbodyzone-pixel.github.io/cafe-click-collect/admin-reset-password';

  console.log(`Sending reset password email for: ${targetEmail}`);
  console.log(`Configured redirectTo:             ${permanentRedirectUrl}`);

  const { data, error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: permanentRedirectUrl,
  });

  if (error) {
    console.error('❌ FAIL: Supabase returned error:', error);
    process.exit(1);
  }

  console.log('✓ PASS: Password reset email dispatched successfully by Supabase Auth!');
  console.log(`• Destination Email: ${targetEmail}`);
  console.log(`• Permanent Landing Page: ${permanentRedirectUrl}`);
}

testPasswordReset();
