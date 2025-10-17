 
// src/firebase/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'; // Importe enableIndexedDbPersistence



const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(FIREBASE_CONFIG);
export const firebaseFirestore = getFirestore(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
export const FIREBASE_APP_ID = FIREBASE_CONFIG.projectId;

/*
// Conecta aos emuladores se em localhost
if (window.location.hostname === "localhost") {
  console.log("Conectando aos Emuladores do Firebase...");
  connectFirestoreEmulator(firebaseFirestore, 'localhost', 8080);
  connectAuthEmulator(firebaseAuth, 'http://localhost:9099');
}
*/

// Habilita a persistência offline.
enableIndexedDbPersistence(firebaseFirestore)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Múltiplas abas estão acessando o Firestore. A persistência offline foi desabilitada.");
    } else if (err.code === 'unimplemented') {
      console.warn("O navegador atual não suporta a persistência offline do Firestore.");
    } else {
      console.error("Erro ao habilitar persistência offline:", err);
    }
  });

  //configuração do provedor Google
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  export { auth, provider };