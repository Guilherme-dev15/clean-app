// src/hooks/useReports.ts
import { useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useApp } from '../components/AppContext';
import { Sale, Expense, StockMovement, SaleItem } from '../types';

// NOVO: Tipos para os dados dos gráficos
export interface SalesByDay {
  date: string;
  total: number;
}

export interface TopSellingProduct {
  name: string;
  quantity: number;
}

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

  // NOVO: Estados para os dados dos gráficos
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<TopSellingProduct[]>([]);

  const generateReports = useCallback(async () => {
    if (!db || !userId) return;

    const start = new Date(reportStartDate + 'T00:00:00Z');
    const end = new Date(reportEndDate + 'T23:59:59.999Z');

    try {
      // Consulta de Vendas (já existente)
      const salesRef = collection(db, `artifacts/${appId}/users/${userId}/sales`);
      const salesQuery = query(
          salesRef,
          where("timestamp", ">=", start.toISOString()),
          where("timestamp", "<=", end.toISOString())
      );
      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() as Sale }));
      
      setSalesReportData(salesData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      // Processamento de dados para os gráficos e totais
      let salesSum = 0;
      let costOfGoodsSum = 0;
      const dailySales: { [key: string]: number } = {};
      const productQuantities: { [key: string]: number } = {};

      salesData.forEach(sale => {
        salesSum += sale.total;
        const saleDate = new Date(sale.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        dailySales[saleDate] = (dailySales[saleDate] || 0) + sale.total;

        sale.items.forEach((item: SaleItem) => {
          costOfGoodsSum += (item.costPrice || 0) * item.quantity;
          productQuantities[item.name] = (productQuantities[item.name] || 0) + item.quantity;
        });
      });

      setTotalReportSales(salesSum);
      setTotalReportCostOfGoods(costOfGoodsSum);
      
      const salesByDayData = Object.keys(dailySales).map(date => ({ date, total: dailySales[date] }));
      setSalesByDay(salesByDayData.sort((a,b) => a.date.localeCompare(b.date)));

      const topProductsData = Object.keys(productQuantities).map(name => ({ name, quantity: productQuantities[name] }));
      setTopSellingProducts(topProductsData.sort((a, b) => b.quantity - a.quantity).slice(0, 10)); // Top 10

      // Consulta de Despesas (já existente)
      const expensesRef = collection(db, `artifacts/${appId}/users/${userId}/expenses`);
      const expensesQuery = query(expensesRef, where("timestamp", ">=", start.toISOString()), where("timestamp", "<=", end.toISOString()));
      const expensesSnapshot = await getDocs(expensesQuery);
      let expensesSum = 0;
      const expensesData = expensesSnapshot.docs.map(docSnap => {
        const expense = { id: docSnap.id, ...docSnap.data() as Expense };
        expensesSum += expense.amount;
        return expense;
      });
      setExpensesReportData(expensesData.sort((a, b) => new Date(b.timestamp ?? '').getTime() - new Date(a.timestamp ?? '').getTime()));
      setTotalReportExpenses(expensesSum);

      // Consulta de Movimentação de Estoque (já existente)
      const stockMovementsRef = collection(db, `artifacts/${appId}/users/${userId}/stock_movements`);
      const stockMovementsQuery = query(stockMovementsRef, where("timestamp", ">=", start.toISOString()), where("timestamp", "<=", end.toISOString()));
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
    // NOVO: Exportar dados dos gráficos
    salesByDay,
    topSellingProducts,
  };
};
