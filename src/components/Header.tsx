import { useApp } from './AppContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase'; // ajuste o caminho conforme seu projeto

const tabs = [
  { id: 'dashboard', label: 'Dashboard', ariaLabel: 'Ver Dashboard' },
  { id: 'pos', label: 'PDV (Vendas)', ariaLabel: 'Ponto de Venda' },
  { id: 'quotes', label: 'Orçamentos', ariaLabel: 'Gerar Orçamentos' },
  { id: 'products', label: 'Produtos', ariaLabel: 'Gerenciar Produtos' },
  { id: 'suppliers', label: 'Fornecedores', ariaLabel: 'Gerenciar Fornecedores' },
  { id: 'clients', label: 'Clientes (CRM)', ariaLabel: 'Gerenciar Clientes' },
  { id: 'expenses', label: 'Despesas', ariaLabel: 'Gerenciar Despesas' },
  { id: 'cashFlow', label: 'Fluxo de Caixa', ariaLabel: 'Ver Fluxo de Caixa' },
  { id: 'reports', label: 'Relatórios', ariaLabel: 'Gerar Relatórios' },
];

export default function Header() {
  const { userId, activeTab, setActiveTab } = useApp();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // O AppLayout deve lidar com o redirecionamento após logout
    } catch (error) {
      console.error('Erro ao sair:', error);
      // Opcional: mostrar feedback ao usuário
    }
  };

  return (
    <header className="bg-white shadow-lg rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4 sm:mb-0">
        Limpeza Fácil 🧼
      </h1>

      <nav className="flex flex-wrap justify-center sm:justify-end gap-3 flex-grow">
        {tabs.map(({ id, label, ariaLabel }) => (
          <button
            key={id}
            className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${
              activeTab === id
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'
            }`}
            onClick={() => setActiveTab(id)}
            aria-label={ariaLabel}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0 space-y-2">
        <div className="text-sm text-gray-600">ID do Usuário: {userId}</div>
        {userId && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
            aria-label="Sair da aplicação"
          >
            Sair
          </button>
        )}
      </div>
    </header>
  );
}
