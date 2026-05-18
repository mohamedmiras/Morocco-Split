// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAf4oZ20SuZ-EovRoyckCxiSTDTd7VhHBQ",
  authDomain: "moroccan-split.firebaseapp.com",
  projectId: "moroccan-split",
  storageBucket: "moroccan-split.firebasestorage.app",
  messagingSenderId: "748274127204",
  appId: "1:748274127204:web:9188ade6b3e10c00fc6e71"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
