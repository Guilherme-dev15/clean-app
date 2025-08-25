/* eslint-disable @typescript-eslint/no-unused-vars */
// src/hooks/useReports.ts
import { useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useApp } from '../components/AppContext';
import { Sale, Expense, StockMovement, SaleItem } from '../types';

// Tipos para os dados dos gráficos e novas tabelas
export interface SalesByDay {
  date: string;
  total: number;
}
export interface TopSellingProduct {
  name: string;
  quantity: number;
}
// NOVO: Tipo para dados de lucratividade por produto
export interface ProductProfitability {
  productId: string;
  name: string;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}
// NOVO: Tipo para dados de análise de clientes
export interface CustomerReport {
  clientId: string;
  name: string;
  totalSpent: number;
  purchaseCount: number;
}


export const useReports = () => {
  const { db, userId, appId, showTemporaryMessage, products, clients } = useApp();
  const [reportStartDate, setReportStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [salesReportData, setSalesReportData] = useState<Sale[]>([]);
  const [expensesReportData, setExpensesReportData] = useState<Expense[]>([]);
  const [stockMovementsReport, setStockMovementsReport] = useState<StockMovement[]>([]);
  const [totalReportSales, setTotalReportSales] = useState<number>(0);
  const [totalReportCostOfGoods, setTotalReportCostOfGoods] = useState<number>(0);
  const [totalReportExpenses, setTotalReportExpenses] = useState<number>(0);
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<TopSellingProduct[]>([]);

  // NOVO: Estados para os novos relatórios
  const [productProfitability, setProductProfitability] = useState<ProductProfitability[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerReport[]>([]);


  const generateReports = useCallback(async () => {
    if (!db || !userId) return;

    const start = new Date(reportStartDate + 'T00:00:00Z');
    const end = new Date(reportEndDate + 'T23:59:59.999Z');

    try {
      // --- Vendas ---
      const salesRef = collection(db, `artifacts/${appId}/users/${userId}/sales`);
      const salesQuery = query(salesRef, where("timestamp", ">=", start.toISOString()), where("timestamp", "<=", end.toISOString()));
      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() as Sale }));
      setSalesReportData(salesData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      // --- Processamento Agregado de Vendas ---
      let salesSum = 0;
      let costOfGoodsSum = 0;
      const dailySales: { [key: string]: number } = {};
      const productQuantities: { [key: string]: number } = {};
      const profitabilityMap: { [key: string]: ProductProfitability } = {};
      const customerMap: { [key: string]: { totalSpent: number; purchaseCount: number } } = {};

      salesData.forEach(sale => {
        salesSum += sale.total;
        const saleDate = new Date(sale.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dailySales[saleDate] = (dailySales[saleDate] || 0) + sale.total;

        if (sale.clientId) {
            customerMap[sale.clientId] = {
                totalSpent: (customerMap[sale.clientId]?.totalSpent || 0) + sale.total,
                purchaseCount: (customerMap[sale.clientId]?.purchaseCount || 0) + 1
            };
        }

        sale.items.forEach((item: SaleItem) => {
          costOfGoodsSum += (item.costPrice || 0) * item.quantity;
          productQuantities[item.name] = (productQuantities[item.name] || 0) + item.quantity;
          
          const profit = (item.price - item.costPrice) * item.quantity;
          const revenue = item.price * item.quantity;

          if (!profitabilityMap[item.productId]) {
            profitabilityMap[item.productId] = { productId: item.productId, name: item.name, quantitySold: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, profitMargin: 0 };
          }
          const current = profitabilityMap[item.productId];
          current.quantitySold += item.quantity;
          current.totalRevenue += revenue;
          current.totalCost += item.costPrice * item.quantity;
          current.totalProfit += profit;
        });
      });

      setTotalReportSales(salesSum);
      setTotalReportCostOfGoods(costOfGoodsSum);
      
      const salesByDayData = Object.keys(dailySales).map(date => ({ date, total: dailySales[date] })).sort((a,b) => a.date.localeCompare(b.date));
      setSalesByDay(salesByDayData);

      const topProductsData = Object.keys(productQuantities).map(name => ({ name, quantity: productQuantities[name] })).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
      setTopSellingProducts(topProductsData);
      
      const profitabilityData = Object.values(profitabilityMap).map(p => ({...p, profitMargin: p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue) * 100 : 0})).sort((a,b) => b.totalProfit - a.totalProfit);
      setProductProfitability(profitabilityData);

      const customerData = Object.keys(customerMap).map(clientId => ({clientId, name: clients.find(c => c.id === clientId)?.name || 'Cliente Removido', ...customerMap[clientId]})).sort((a,b) => b.totalSpent - a.totalSpent);
      setTopCustomers(customerData);


      // --- Despesas ---
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

      // --- Movimentação de Estoque ---
      const stockMovementsRef = collection(db, `artifacts/${appId}/users/${userId}/stock_movements`);
      const stockMovementsQuery = query(stockMovementsRef, where("timestamp", ">=", start.toISOString()), where("timestamp", "<=", end.toISOString()));
      const stockMovementsSnapshot = await getDocs(stockMovementsQuery);
      const stockMovementsData = stockMovementsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() as StockMovement }));
      setStockMovementsReport(stockMovementsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

    } catch (error) {
      console.error("Erro ao gerar relatórios:", error);
      showTemporaryMessage("Erro ao gerar relatórios.", "error");
    }
  }, [db, userId, appId, reportStartDate, reportEndDate, showTemporaryMessage, clients]);

  return {
    reportStartDate, setReportStartDate,
    reportEndDate, setReportEndDate,
    salesReportData, expensesReportData,
    stockMovementsReport,
    totalReportSales, totalReportCostOfGoods, totalReportExpenses,
    generateReports,
    salesByDay,
    topSellingProducts,
    productProfitability, // Exportar novos dados
    topCustomers, // Exportar novos dados
  };
};
