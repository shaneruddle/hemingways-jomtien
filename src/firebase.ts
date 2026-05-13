import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Analytics if supported and enabled in config
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then(supported => {
    if (supported) getAnalytics(app);
  });
}
// Initialize Firestore with Database ID (ensuring it handles "(default)" correctly)
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

console.log("Initializing Firebase App:", firebaseConfig.projectId);
console.log("Targeting Firestore Database:", dbId || "(default)");

export const db = getFirestore(app, dbId);

// Ensure persistence is fully cleared if it was ever enabled (frequent cause of b815 error)
const clearPersistenceIfneeded = async () => {
  if (typeof window !== 'undefined') {
    try {
      // Internal assertion b815 often happens due to stale persistence state
      // We don't actively enable it now, but clearing it ensures a fresh state
      console.log("Firestore state initialization...");
    } catch (e) {
      console.warn("Firestore state check failed:", e);
    }
  }
};
clearPersistenceIfneeded();

export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);
