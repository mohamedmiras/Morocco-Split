import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCjKw2cRIwJdrTqVsG_jbvyJD0IgT4uJe0",
  authDomain: "moroccan-expenses.firebaseapp.com",
  projectId: "moroccan-expenses",
  databaseURL: "https://moroccan-expenses-default-rtdb.firebaseio.com",
  storageBucket: "moroccan-expenses.firebasres.app",
  messagingSenderId: "1031753801589",
  appId: "1:1031753801589:web:603c98f5a177fd5e507d3c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const run = async () => {
  try {
    console.log("Searching Firestore profiles for student_id == '40'...");
    const q = query(collection(db, 'profiles'), where('student_id', '==', '40'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("No existing Firestore profile found for student_id == '40'.");
    } else {
      console.log(`Found ${querySnapshot.size} profile(s):`);
      querySnapshot.forEach((doc) => {
        console.log(`- Document ID (UID): ${doc.id}`);
        console.log(`  Data:`, doc.data());
      });
    }
    process.exit(0);
  } catch (err) {
    console.error("Error querying profiles:", err);
    process.exit(1);
  }
};

run();
