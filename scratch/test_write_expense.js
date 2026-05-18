import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

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
const db = getFirestore(app);

const runTest = async () => {
  try {
    console.log("Attempting to write a test expense to Firestore...");
    const ref = await addDoc(collection(db, 'expenses'), {
      total_amount: 10,
      description: "Test direct write",
      split_mode: "equal",
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      paid_by_uid: "test_uid",
      participants: [
        { uid: "test_member", name: "Test Member", amount: 10 }
      ]
    });
    console.log("Success! Document written with ID:", ref.id);
    process.exit(0);
  } catch (err) {
    console.error("Failed to write to Firestore:", err);
    process.exit(1);
  }
};

runTest();
