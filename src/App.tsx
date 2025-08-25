// src/App.tsx
import React from 'react';
import AppLayout from './components/AppLayout';
import { useApp } from './components/AppContext'; // Change this line
import ProductManager from './components/ProductManager';
import POS from './components/POS';
import ExpensesManager from './components/ExpensesManager';
import CashFlow from './components/CashFlow';
import ClientsManager from './components/ClientsManager';
import Reports from './components/Reports';

function MainContent() {
  const { activeTab } = useApp(); // This is now correct

  return (
    <>
      {activeTab === 'products' && <ProductManager />}
      {activeTab === 'pos' && <POS />}
      {activeTab === 'expenses' && <ExpensesManager />}
      {activeTab === 'cashFlow' && <CashFlow />}
      {activeTab === 'clients' && <ClientsManager />}
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