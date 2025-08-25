// src/components/Dashboard.tsx
import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useApp } from './AppContext';

const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
    <div className="text-4xl">{icon}</div>
    <div>
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { dailySalesTotal, attendedClientsCount, lowStockProductsCount, totalDebt } = useDashboardData();
  const { products } = useApp();

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Dashboard do Dia
      </h2>

      {/* Cartões de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total de Vendas do Dia" 
          value={`R$ ${dailySalesTotal.toFixed(2)}`} 
          icon="💰" 
        />
        <StatCard 
          title="Clientes Atendidos Hoje" 
          value={attendedClientsCount} 
          icon="👥" 
        />
        <StatCard 
          title="Produtos com Stock Baixo" 
          value={lowStockProductsCount} 
          icon="📦" 
        />
        <StatCard 
          title="Total 'Fiado' a Receber" 
          value={`R$ ${totalDebt.toFixed(2)}`} 
          icon="🧾" 
        />
      </div>

      {/* Detalhes dos Produtos com Stock Baixo */}
      <div className="bg-red-50 p-6 rounded-lg shadow-inner">
        <h3 className="text-2xl font-semibold text-red-800 mb-4">
          Alerta de Stock Baixo
        </h3>
        {lowStockProducts.length > 0 ? (
          <ul className="space-y-2">
            {lowStockProducts.map(product => (
              <li key={product.id} className="bg-white p-3 rounded-md shadow-sm flex justify-between items-center">
                <span className="font-semibold">{product.name}</span>
                <span className="text-red-600 font-bold">Apenas {product.stock} em stock!</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">Nenhum produto com stock baixo no momento. Bom trabalho!</p>
        )}
      </div>
    </section>
  );
}
