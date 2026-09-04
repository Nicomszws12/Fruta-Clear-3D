import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  // Pega aquí la configuración que te dio Firebase
    apiKey: "AIzaSyCd52HZ53a8uBMNqR4Eq2ZGn2REIn5Ad4s",
  authDomain: "app-cecilia.firebaseapp.com",
  projectId: "app-cecilia",
  storageBucket: "app-cecilia.firebasestorage.app",
  messagingSenderId: "128102678983",
  appId: "1:128102678983:web:47cdb166f837a167f599e2",
  measurementId: "G-9PJWFLM6B6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, signInAnonymously };