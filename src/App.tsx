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
// NOVO: Importar o novo componente
import SuppliersManager from './components/SuppliersManager';

function MainContent() {
  const { activeTab } = useApp();

  return (
    <>
      {activeTab === 'pos' && <POS />}
      {activeTab === 'products' && <ProductManager />}
      {/* NOVO: Renderizar o componente de fornecedores */}
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
