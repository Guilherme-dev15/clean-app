// src/hooks/useData.ts
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useApp } from '../components/AppContext'; // Importa useApp do AppLayout
import { Expense } from '../types';

export const useData = () => {
  const { db, userId, appId, showTemporaryMessage } = useApp();

  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!db || !userId) return;
    const expensesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/expenses`);
    const unsubscribe = onSnapshot(expensesCollectionRef, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Expense }));
      setExpenses(expensesData.sort((a, b) => new Date(b.timestamp ?? '').getTime() - new Date(a.timestamp ?? '').getTime()));
    }, (error) => {
      console.error("Erro ao carregar despesas:", error);
      showTemporaryMessage("Erro ao carregar despesas.", "error");
    });
    return () => unsubscribe();
  }, [db, userId, appId, showTemporaryMessage]);

  return { expenses };
};