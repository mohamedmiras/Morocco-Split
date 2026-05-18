import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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

const run = async () => {
  const email = "40@expenseapp.local";
  const passwordsToTry = ["40", "000040", "123456", "password", "12345678", "morocco", "Morocco", "expenseapp", "student40"];

  console.log(`Trying to sign in to ${email} with different passwords...`);
  
  for (const password of passwordsToTry) {
    try {
      console.log(`Trying password: "${password}"...`);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log(`🎉 SUCCESS! Password is: "${password}"! User UID: ${userCred.user.uid}`);
      process.exit(0);
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        console.log(`  -> Failed (invalid credential).`);
      } else {
        console.error(`  -> Unexpected error:`, err.message);
      }
    }
  }

  console.log("❌ All tried passwords failed.");
  process.exit(1);
};

run();
