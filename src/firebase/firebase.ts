// src/firebase/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore'; // Importe enableIndexedDbPersistence

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAmAzsZcQxB9TgSMlURmKvMMKQGLs3Rjac",
  authDomain: "clean-app-665c4.firebaseapp.com",
  projectId: "clean-app-665c4",
  storageBucket: "clean-app-665c4.firebasestorage.app",
  appId: "1:322809583693:web:6a55a675b0a8296013e404",
  messagingSenderId: "322809583693",
  measurementId: "G-Z0YEL2RB17",
};


export const firebaseApp = initializeApp(FIREBASE_CONFIG);
export const firebaseFirestore = getFirestore(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
export const FIREBASE_APP_ID = FIREBASE_CONFIG.projectId;

// Conecta aos emuladores se em localhost
if (window.location.hostname === "localhost") {
  console.log("Conectando aos Emuladores do Firebase...");
  connectFirestoreEmulator(firebaseFirestore, 'localhost', 8080);
  connectAuthEmulator(firebaseAuth, 'http://localhost:9099');
}

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