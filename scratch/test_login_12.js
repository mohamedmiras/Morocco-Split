import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yvzablmxfdmdebatsyzp.supabase.co';
const supabaseKey = 'sb_publishable_0q7oClevKp4MTJ76LRxYZA_P4P7vMLV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log("Testing Supabase Login Speed for ID 12...");
  const start = Date.now();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: '12@expenseapp.local',
      password: '000012',
    });
    const end = Date.now();
    if (error) {
      console.error("Login Error:", error.message);
    } else {
      console.log(`Login successful! Time: ${end - start}ms`);
      console.log("User ID:", data.user.id);
    }
  } catch (err) {
    console.error("Crash during test:", err);
  }
}

testLogin();
