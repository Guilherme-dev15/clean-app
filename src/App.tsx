// src/App.tsx
import React from 'react';
import AppLayout from './components/AppLayout';
import { useApp } from './components/AppContext';
import ProductManager from './components/ProductManager';
import POS from './components/POS';
import ExpensesManager from './components/ExpensesManager';
import CashFlow from './components/CashFlow';
import ClientsManager from './components/ClientsManager';
import Reports from './components/Reports';
import SuppliersManager from './components/SuppliersManager';
// NOVO: Importar o Dashboard
import Dashboard from './components/Dashboard';

function MainContent() {
  const { activeTab } = useApp();

  return (
    <>
      {/* NOVO: Renderizar o Dashboard */}
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'pos' && <POS />}
      {activeTab === 'products' && <ProductManager />}
      {activeTab === 'suppliers' && <SuppliersManager />}
      {activeTab === 'clients' && <ClientsManager />}
      {activeTab === 'expenses' && <ExpensesManager />}
      {activeTab === 'cashFlow' && <CashFlow />}
      {activeTab === 'reports' && <Reports />}
    </>
  );
}

export default function App() {
  return (
    <AppLayout>
      <MainContent />
    </AppLayout>
  );
}
