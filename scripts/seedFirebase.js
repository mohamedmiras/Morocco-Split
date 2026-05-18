import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";

// Initialize Firebase (copied from your web config)
const firebaseConfig = {
  apiKey: "AIzaSyCjKw2cRIwJdrTqVsG_jbvyJD0IgT4uJe0",
  authDomain: "moroccan-expenses.firebaseapp.com",
  projectId: "moroccan-expenses",
  databaseURL: "https://moroccan-expenses-default-rtdb.firebaseio.com",
  storageBucket: "moroccan-expenses.firebasestorage.app",
  messagingSenderId: "1031753801589",
  appId: "1:1031753801589:web:603c98f5a177fd5e507d3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const seedDatabase = async () => {
  try {
    console.log("Reading students.json...");
    const rawData = readFileSync("./src/data/students.json", "utf8");
    const students = JSON.parse(rawData);
    
    console.log(`Found ${students.length} students. Beginning upload...`);
    
    let successCount = 0;
    
    for (const student of students) {
      const studentId = student['رقم  ت']?.toString();
      if (!studentId) continue;
      
      const email = `${studentId}@expenseapp.local`;
      const password = studentId.padStart(6, '0');
      const name = student['الإسم الشخصي'];
      const admissionNum = student['رقم التسجيل'];
      
      try {
        console.log(`Processing user: ${name} (${studentId})`);
        
        let uid;
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          uid = userCred.user.uid;
        } catch (authErr) {
          if (authErr.code === 'auth/email-already-in-use') {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            uid = userCred.user.uid;
          } else {
            throw authErr;
          }
        }
        
        await setDoc(doc(db, 'profiles', uid), {
          student_id: studentId,
          name: name,
          name_lower: name.toLowerCase(),
          admission_number: admissionNum,
          role: 'member',
          password: password
        }, { merge: true });
        
        successCount++;
        console.log(`  -> Success!`);
      } catch (err) {
        console.error(`  -> ERROR for ${studentId}:`, err.message);
      }
    }
    
    console.log(`\n🎉 Upload complete! ${successCount} new users added to Firebase.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

seedDatabase();
