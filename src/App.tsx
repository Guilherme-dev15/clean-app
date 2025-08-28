// src/App.tsx
import AppLayout from './components/AppLayout';
import { useApp } from './components/AppContext';
import ProductManager from './components/ProductManager';
import POS from './components/POS';
import ExpensesManager from './components/ExpensesManager';
import CashFlow from './components/CashFlow';
import ClientsManager from './components/ClientsManager';
import Reports from './components/Reports';
import SuppliersManager from './components/SuppliersManager';
import QuoteGenerator from './components/QuoteGenerator';

// NOVO: Importar o Dashboard
import Dashboard from './components/Dashboard';


function MainContent() {
  const { activeTab } = useApp();

  return (
    <>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'pos' && <POS />}
      {activeTab === 'products' && <ProductManager />}
      {activeTab === 'suppliers' && <SuppliersManager />}
      {activeTab === 'clients' && <ClientsManager />}
      {activeTab === 'expenses' && <ExpensesManager />}
      {activeTab === 'cashFlow' && <CashFlow />}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'quotes' && <QuoteGenerator />}
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
