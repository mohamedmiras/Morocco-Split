import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Initialize Firebase (copied from web config)
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

const ROOMS = [
  "310", "311", "314", "315", "316", "317", "318", "319", "320", "323", "324"
];

const seedRooms = async () => {
  try {
    console.log(`Starting to seed ${ROOMS.length} room accounts...`);
    
    let successCount = 0;
    
    for (const roomNo of ROOMS) {
      const email = `room${roomNo}@expenseapp.local`;
      const password = `room${roomNo}`;
      const name = `Room ${roomNo}`;
      
      try {
        console.log(`Processing room: ${name}`);
        
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
        
        // Add to profiles
        await setDoc(doc(db, 'profiles', uid), {
          student_id: `room${roomNo}`,
          name: name,
          name_lower: name.toLowerCase(),
          role: 'room',
          roomNo: roomNo,
          password: password
        }, { merge: true });
        
        successCount++;
        console.log(`  -> Success! ID: ${uid}`);
      } catch (err) {
        console.error(`  -> ERROR for ${name}:`, err.message);
      }
    }
    
    console.log(`\n🎉 Room upload complete! ${successCount} rooms added/updated.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

seedRooms();
