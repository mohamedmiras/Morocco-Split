import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

const run = async () => {
  const adminEmail = "13@expenseapp.local";
  const adminPassword = "000013";

  try {
    console.log(`Authenticating as student 13...`);
    const adminCred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log(`Successfully authenticated! uid: ${adminCred.user.uid}`);

    const studentId = "40";
    const name = "أحمد علي";
    const admissionNum = "IND003FB04026";
    const password = "000040";

    console.log(`Writing profile for Ahmad Ali (student 40)...`);
    // Using a custom document ID 'student_40' to represent student 40
    const profileRef = doc(db, 'profiles', 'student_40');
    await setDoc(profileRef, {
      student_id: studentId,
      name: name,
      name_lower: name.toLowerCase(),
      admission_number: admissionNum,
      role: 'member',
      password: password
    }, { merge: true });

    console.log(`Successfully seeded Ahmad Ali to profiles collection!`);
    process.exit(0);
  } catch (err) {
    console.error(`Error seeding:`, err);
    process.exit(1);
  }
};

run();
