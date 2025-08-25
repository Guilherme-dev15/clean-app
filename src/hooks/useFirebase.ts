// src/hooks/useFirebase.ts
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { firebaseFirestore, firebaseAuth } from '../firebase/firebase';

interface AuthState {
  userId: string | null;
  loading: boolean;
  db: Firestore | null;
}

export const useFirebase = (initialAuthToken: string | null = null) => {
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    loading: true,
    db: null,
  });

  useEffect(() => {
    const setupAuth = async () => {
      setAuthState(prev => ({ ...prev, db: firebaseFirestore }));

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setAuthState({ userId: user.uid, loading: false, db: firebaseFirestore });
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
            const uid = firebaseAuth.currentUser?.uid || crypto.randomUUID();
            setAuthState({ userId: uid, loading: false, db: firebaseFirestore });
          } catch (error) {
            console.error("Erro na autenticação:", error);
            setAuthState({ userId: crypto.randomUUID(), loading: false, db: firebaseFirestore });
          }
        }
      });
      return () => unsubscribe();
    };

    setupAuth();
  }, [initialAuthToken]);

  return authState;
};