const admin = require('firebase-admin');
const fs = require('fs');

// TODO: Download your serviceAccountKey.json from Firebase Console 
// (Project Settings -> Service Accounts -> Generate new private key)
// Place it in this scripts folder.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedUsers() {
  try {
    const data = fs.readFileSync('./students.json', 'utf-8');
    const students = JSON.parse(data);

    console.log(`Starting to import ${students.length} students...`);

    for (const student of students) {
      const studentId = student['رقم  ت'].toString(); // "1", "2", etc.
      const regNumber = student['رقم التسجيل'];
      const password = studentId.padStart(6, '0'); // "000001", "000002", etc.
      
      // Firebase requires an email. We will use the ID as the email prefix
      const email = `${studentId}@expenseapp.local`;
      const displayName = student['الإسم الشخصي'];

      try {
        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: displayName,
        });

        // Add user document to Firestore
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          name: displayName,
          admissionNumber: regNumber,
          email: email,
          passportNumber: student['رقم جواز السفر'],
          dateOfBirth: student['تاريخ الازدياد'],
          studentId: student['رقم  ت'],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          role: 'member',
          totalOwe: 0,
          totalOwned: 0
        });

        console.log(`Successfully created user: ${displayName} (${regNumber})`);
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
           console.log(`User ${regNumber} already exists. Skipping...`);
        } else {
           console.error(`Error creating ${regNumber}:`, err.message);
        }
      }
    }

    console.log('Finished seeding users!');
  } catch (error) {
    console.error('Error reading students.json or initializing:', error);
  }
}

seedUsers();
