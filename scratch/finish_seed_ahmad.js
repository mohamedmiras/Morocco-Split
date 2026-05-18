import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

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
  const email = "40@expenseapp.local";
  const password = "123456";

  try {
    console.log(`Authenticating as Ahmad Ali (student 40) using correct password...`);
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    console.log(`Successfully authenticated! uid: ${uid}`);

    const studentId = "40";
    const name = "أحمد علي";
    const admissionNum = "IND003FB04026";

    console.log(`Writing correct profile for Ahmad Ali (student 40) linked to UID ${uid}...`);
    const profileRef = doc(db, 'profiles', uid);
    await setDoc(profileRef, {
      student_id: studentId,
      name: name,
      name_lower: name.toLowerCase(),
      admission_number: admissionNum,
      role: 'member',
      password: password
    }, { merge: true });
    console.log(`Successfully seeded Ahmad Ali to profiles collection with correct UID!`);

    console.log(`Cleaning up temporary 'student_40' document...`);
    const tempRef = doc(db, 'profiles', 'student_40');
    await deleteDoc(tempRef);
    console.log(`Successfully deleted temporary document!`);

    process.exit(0);
  } catch (err) {
    console.error(`Error finishing seeding:`, err);
    process.exit(1);
  }
};

run();
