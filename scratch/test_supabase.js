import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yvzablmxfdmdebatsyzp.supabase.co';
const supabaseKey = 'sb_publishable_0q7oClevKp4MTJ76LRxYZA_P4P7vMLV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing Supabase connection speed...");
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    const end = Date.now();
    if (error) {
      console.error("Connection Error:", error);
    } else {
      console.log(`Connection successful! Time: ${end - start}ms`);
      console.log("Data sample:", data);
    }
  } catch (err) {
    console.error("Crash during test:", err);
  }
}

testConnection();
