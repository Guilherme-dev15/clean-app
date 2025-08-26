// src/components/ExpensesManager.tsx
import { useState } from 'react';
import { useApp } from '../components/AppContext';
import { addDoc, collection, deleteDoc, doc, getDoc, updateDoc, setDoc, DocumentData } from 'firebase/firestore'; 
import { useData } from '../hooks/useData';
import { Expense } from '../types';

export default function ExpensesManager() {
  const { db, userId, appId, showTemporaryMessage, confirmAction } = useApp();
  const { expenses } = useData();

  const [newExpense, setNewExpense] = useState<Expense>({ description: '', amount: 0 });

  const handleAddExpense = async () => {
    if (!db || !userId || !newExpense.description.trim() || newExpense.amount <= 0) {
      showTemporaryMessage("Por favor, preencha a descrição e um valor positivo para a despesa.", "error");
      return;
    }
    
    try {
      const expenseData: Expense = {
        description: newExpense.description.trim(),
        amount: newExpense.amount,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/expenses`), expenseData as DocumentData);
      showTemporaryMessage("Despesa adicionada com sucesso!");
      setNewExpense({ description: '', amount: 0 });

      const today = new Date().toISOString().split('T')[0];
      const cashRegisterDocRef = doc(db, `artifacts/${appId}/users/${userId}/cash_register_summary`, today);
      const cashRegisterDoc = await getDoc(cashRegisterDocRef);
      if (cashRegisterDoc.exists()) {
        const currentExpensesTotal = cashRegisterDoc.data().expensesTotal || 0;
        await updateDoc(cashRegisterDocRef, { expensesTotal: currentExpensesTotal + expenseData.amount });
      } else {
        await setDoc(cashRegisterDocRef, { date: today, salesTotal: 0, expensesTotal: expenseData.amount, userId: userId! });
      }
    } catch (error) {
      console.error("Erro ao adicionar despesa:", error);
      showTemporaryMessage("Erro ao adicionar despesa.", "error");
    }
  };

  // A função de deleção não precisa ser ajustada, apenas a forma como ela é chamada
  const handleDeleteExpense = async (expenseId: string, amount: number) => {
    if (!db || !userId) {
      showTemporaryMessage("Erro: Firebase não inicializado.", "error");
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/expenses`, expenseId));
      showTemporaryMessage("Despesa removida com sucesso!");
      
      const today = new Date().toISOString().split('T')[0];
      const cashRegisterDocRef = doc(db, `artifacts/${appId}/users/${userId}/cash_register_summary`, today);
      const cashRegisterDoc = await getDoc(cashRegisterDocRef);
      if (cashRegisterDoc.exists()) {
        const currentExpensesTotal = cashRegisterDoc.data().expensesTotal || 0;
        await updateDoc(cashRegisterDocRef, { expensesTotal: currentExpensesTotal - amount });
      }
    } catch (error) {
      console.error("Erro ao remover despesa:", error);
      showTemporaryMessage("Erro ao remover despesa.", "error");
    }
  };

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Gerenciar Despesas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-green-800 mb-4">
            Adicionar Nova Despesa
          </h3>
          <div className="space-y-4">
            <label htmlFor="expenseDescription" className="block text-gray-700 text-sm font-semibold mb-1">Descrição da Despesa:</label>
            <input
              type="text"
              id="expenseDescription"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Descrição da despesa"
            />
            <label htmlFor="expenseAmount" className="block text-gray-700 text-sm font-semibold mb-1">Valor (R$):</label>
            <input
              type="number"
              id="expenseAmount"
              value={newExpense.amount === 0 ? '' : newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Valor da despesa"
            />
            <button
              onClick={handleAddExpense}
              className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
              aria-label="Adicionar nova despesa"
            >
              Adicionar Despesa
            </button>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-blue-800 mb-4">
            Lista de Despesas
          </h3>
          <div className="max-h-96 overflow-y-auto pr-2">
            {expenses.length === 0 ? (
              <p className="text-gray-600">Nenhuma despesa registrada ainda.</p>
            ) : (
              <ul className="space-y-3">
                {expenses.map((expense) => (
                  <li key={expense.id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">{expense.description}</p>
                      <p className="text-sm text-gray-600">R$ {expense.amount?.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{new Date(expense.timestamp ?? '').toLocaleDateString()} {new Date(expense.timestamp ?? '').toLocaleTimeString()}</p>
                    </div>
                    <button
                      onClick={() => confirmAction(() => handleDeleteExpense(expense.id!, expense.amount), { id: expense.id!, amount: expense.amount })}
                      className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition duration-200"
                      title="Remover"
                      aria-label={`Remover despesa ${expense.description}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}