// src/components/CashFlow.tsx
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../components/AppContext';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore'; // Adicionado 'where' e 'getDocs'

export default function CashFlow() {
  const { db, userId, appId, showTemporaryMessage } = useApp();
  const [cashRegisterBalance, setCashRegisterBalance] = useState<number>(0);
  const [monthlySalesTotal, setMonthlySalesTotal] = useState<number>(0);
  const [monthlyExpensesTotal, setMonthlyExpensesTotal] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    if (!db || !userId) return;
    const today = new Date().toISOString().split('T')[0];
    const cashRegisterDocRef = doc(db, `artifacts/${appId}/users/${userId}/cash_register_summary`, today);
    const unsubscribe = onSnapshot(cashRegisterDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const totalBalance = (data.salesTotal || 0) - (data.expensesTotal || 0);
        setCashRegisterBalance(totalBalance);
      } else {
        setCashRegisterBalance(0);
      }
    }, (error) => {
      console.error("Erro ao carregar saldo do caixa diário:", error);
      showTemporaryMessage("Erro ao carregar saldo do caixa diário.", "error");
    });
    return () => unsubscribe();
  }, [db, userId, appId, showTemporaryMessage]);

  const calculateMonthlyCashFlow = useCallback(async () => {
    if (!db || !userId || !selectedMonth) return;

    const startOfMonth = new Date(`${selectedMonth}-01T00:00:00Z`);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    let totalSales = 0;
    let totalExpenses = 0;

    try {
      const cashRegisterSummaryRef = collection(db, `artifacts/${appId}/users/${userId}/cash_register_summary`);
      const q = query(
          cashRegisterSummaryRef,
          where("date", ">=", startOfMonth.toISOString().split('T')[0]),
          where("date", "<=", endOfMonth.toISOString().split('T')[0])
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        totalSales += (data.salesTotal || 0);
        totalExpenses += (data.expensesTotal || 0);
      });
      setMonthlySalesTotal(totalSales);
      setMonthlyExpensesTotal(totalExpenses);
    } catch (error) {
      console.error("Erro ao calcular fluxo de caixa mensal:", error);
      showTemporaryMessage("Erro ao calcular fluxo de caixa mensal.", "error");
    }
  }, [db, userId, appId, selectedMonth, showTemporaryMessage]);
  
  useEffect(() => {
    calculateMonthlyCashFlow();
  }, [selectedMonth, calculateMonthlyCashFlow]);

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Fluxo de Caixa
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 p-6 rounded-lg shadow-inner text-center">
          <h3 className="text-2xl font-semibold text-green-800 mb-4">
            Saldo do Caixa Hoje ({new Date().toLocaleDateString()})
          </h3>
          <p className={`text-5xl font-extrabold ${cashRegisterBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R$ {cashRegisterBalance.toFixed(2)}
          </p>
          <p className="text-gray-700 mt-4">
            Este valor reflete o total de vendas menos o total de despesas registradas para o dia de hoje.
          </p>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-blue-800 mb-4">
            Análise Mensal
          </h3>
          <div className="mb-4">
            <label htmlFor="monthPicker" className="block text-gray-700 text-sm font-semibold mb-2">
              Selecionar Mês:
            </label>
            <input
              type="month"
              id="monthPicker"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Selecionar mês para análise"
            />
          </div>
          <div className="space-y-3">
            <p className="text-lg font-semibold text-gray-800">
              Vendas Mensais: <span className="text-green-600 font-bold">R$ {monthlySalesTotal.toFixed(2)}</span>
            </p>
            <p className="text-lg font-semibold text-gray-800">
              Despesas Mensais: <span className="text-red-600 font-bold">R$ {monthlyExpensesTotal.toFixed(2)}</span>
            </p>
            <p className="text-2xl font-extrabold">
              Saldo Mensal: <span className={`${(monthlySalesTotal - monthlyExpensesTotal) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                R$ {(monthlySalesTotal - monthlyExpensesTotal).toFixed(2)}
              </span>
            </p>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            (Gráficos de análise podem ser implementados com bibliotecas como Recharts para visualizações mais ricas).
          </p>
        </div>
      </div>
    </section>
  );
}