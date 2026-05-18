const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Paste your Supabase details here or use environment variables
const SUPABASE_URL = 'https://yvzablmxfdmdebatsyzp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('Please provide your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedUsers() {
  try {
    const students = JSON.parse(fs.readFileSync(path.join(__dirname, 'students.json'), 'utf8'));
    console.log(`Starting to import ${students.length} students into Supabase...`);

    for (const student of students) {
      const studentId = student['رقم  ت'].toString();
      const regNumber = student['رقم التسجيل'];
      const fullName = student['الإسم الشخصي'];
      const password = studentId.padStart(6, '0'); // e.g. "000001"
      const email = `${studentId}@expenseapp.local`;

      console.log(`Creating user: ${fullName} (${email})...`);

      // 1. Create or get Auth User
      let userId;
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log(`User ${email} already exists, fetching ID...`);
          // Fetch existing user to get ID
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
          if (listError) {
            console.error('Error listing users:', listError.message);
            continue;
          }
          const existingUser = listData.users.find(u => u.email === email);
          if (existingUser) {
            userId = existingUser.id;
          } else {
            console.error(`Could not find existing user ${email} in list.`);
            continue;
          }
        } else {
          console.error(`Error creating auth user ${email}:`, authError.message);
          continue;
        }
      } else {
        userId = authUser.user.id;
      }

      // 2. Create or Update Profile in 'profiles' table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: userId,
            student_id: studentId,
            admission_number: regNumber,
            name: fullName,
            role: 'member'
          }
        ]);

      if (profileError) {
        console.error(`Error creating profile for ${email}:`, profileError.message);
      } else {
        console.log(`Successfully created user and profile for ${fullName}`);
      }
    }

    console.log('Finished seeding users!');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
}

seedUsers();
