import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

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

const clearCollections = async () => {
  const collectionsToClear = ["expenses", "endorsements"];
  
  for (const collectionName of collectionsToClear) {
    try {
      console.log(`Fetching documents from "${collectionName}"...`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      console.log(`Found ${querySnapshot.size} documents in "${collectionName}". deleting...`);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((document) => {
        batch.delete(doc(db, collectionName, document.id));
      });
      
      if (querySnapshot.size > 0) {
        await batch.commit();
        console.log(`Successfully deleted all documents in "${collectionName}"!`);
      } else {
        console.log(`"${collectionName}" was already empty.`);
      }
    } catch (err) {
      console.error(`Error clearing collection "${collectionName}":`, err.message);
    }
  }
  
  console.log("\n✨ Wiping dev database complete!");
  process.exit(0);
};

clearCollections();
