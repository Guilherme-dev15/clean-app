/* eslint-disable @typescript-eslint/no-unused-vars */
// src/hooks/useDashboardData.ts
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useApp } from '../components/AppContext';
import { Sale } from '../types';

export const useDashboardData = () => {
  const { db, userId, appId, products, clients } = useApp();

  // Métricas do Dashboard
  const [dailySalesTotal, setDailySalesTotal] = useState(0);
  const [attendedClientsCount, setAttendedClientsCount] = useState(0);
  const [lowStockProductsCount, setLowStockProductsCount] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);

  // Carregar dados de vendas do dia
  useEffect(() => {
    if (!db || !userId) return;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

    const salesRef = collection(db, `artifacts/${appId}/users/${userId}/sales`);
    const q = query(
      salesRef,
      where('timestamp', '>=', startOfDay),
      where('timestamp', '<=', endOfDay)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      const clientIds = new Set<string>();
      
      snapshot.forEach(doc => {
        const sale = doc.data() as Sale;
        total += sale.total;
        if (sale.clientId) {
          clientIds.add(sale.clientId);
        }
      });

      setDailySalesTotal(total);
      setAttendedClientsCount(clientIds.size);
    });

    return () => unsubscribe();
  }, [db, userId, appId]);

  // Calcular produtos com stock baixo (derivado do estado global)
  useEffect(() => {
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    setLowStockProductsCount(lowStockCount);
  }, [products]);

  // Calcular dívida total (derivado do estado global)
  useEffect(() => {
    const total = clients.reduce((sum, client) => sum + (client.debt || 0), 0);
    setTotalDebt(total);
  }, [clients]);

  return {
    dailySalesTotal,
    attendedClientsCount,
    lowStockProductsCount,
    totalDebt,
  };
};
