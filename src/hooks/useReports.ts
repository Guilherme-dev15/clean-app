// src/hooks/useReports.ts
import { useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Adicionado 'where' e 'getDocs'
import { useApp } from '../components/AppContext';
import { Sale, Expense, StockMovement } from '../types';

export const useReports = () => {
  const { db, userId, appId, showTemporaryMessage } = useApp();
  const [reportStartDate, setReportStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [salesReportData, setSalesReportData] = useState<Sale[]>([]);
  const [expensesReportData, setExpensesReportData] = useState<Expense[]>([]);
  const [stockMovementsReport, setStockMovementsReport] = useState<StockMovement[]>([]);
  const [totalReportSales, setTotalReportSales] = useState<number>(0);
  const [totalReportCostOfGoods, setTotalReportCostOfGoods] = useState<number>(0);
  const [totalReportExpenses, setTotalReportExpenses] = useState<number>(0);

  const generateReports = useCallback(async () => {
    if (!db || !userId) return;

    const start = new Date(reportStartDate + 'T00:00:00Z');
    const end = new Date(reportEndDate + 'T23:59:59.999Z');

    let salesSum = 0;
    let expensesSum = 0;
    let costOfGoodsSum = 0;

    try {
      // Consulta Otimizada para Vendas
      const salesRef = collection(db, `artifacts/${appId}/users/${userId}/sales`);
      const salesQuery = query(
          salesRef,
          where("timestamp", ">=", start.toISOString()),
          where("timestamp", "<=", end.toISOString())
      );
      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map(docSnap => {
        const sale = { id: docSnap.id, ...docSnap.data() as Sale };
        salesSum += sale.total;
        sale.items.forEach(item => costOfGoodsSum += (item.costPrice || 0) * item.quantity);
        return sale;
      });
      setSalesReportData(salesData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setTotalReportSales(salesSum);
      setTotalReportCostOfGoods(costOfGoodsSum);

      // Consulta Otimizada para Despesas
      const expensesRef = collection(db, `artifacts/${appId}/users/${userId}/expenses`);
      const expensesQuery = query(
          expensesRef,
          where("timestamp", ">=", start.toISOString()),
          where("timestamp", "<=", end.toISOString())
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = expensesSnapshot.docs.map(docSnap => {
        const expense = { id: docSnap.id, ...docSnap.data() as Expense };
        expensesSum += expense.amount;
        return expense;
      });
      setExpensesReportData(expensesData.sort((a, b) => new Date(b.timestamp ?? '').getTime() - new Date(a.timestamp ?? '').getTime()));
      setTotalReportExpenses(expensesSum);

      // Consulta Otimizada para Movimentações de Estoque
      const stockMovementsRef = collection(db, `artifacts/${appId}/users/${userId}/stock_movements`);
      const stockMovementsQuery = query(
          stockMovementsRef,
          where("timestamp", ">=", start.toISOString()),
          where("timestamp", "<=", end.toISOString())
      );
      const stockMovementsSnapshot = await getDocs(stockMovementsQuery);
      const stockMovementsData = stockMovementsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() as StockMovement }));
      setStockMovementsReport(stockMovementsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

    } catch (error) {
      console.error("Erro ao gerar relatórios:", error);
      showTemporaryMessage("Erro ao gerar relatórios.", "error");
    }
  }, [db, userId, appId, reportStartDate, reportEndDate, showTemporaryMessage]);

  return {
    reportStartDate, setReportStartDate,
    reportEndDate, setReportEndDate,
    salesReportData, expensesReportData,
    stockMovementsReport,
    totalReportSales, totalReportCostOfGoods, totalReportExpenses,
    generateReports,
  };
};