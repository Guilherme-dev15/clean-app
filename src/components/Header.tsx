import { useApp } from './AppContext';

export default function Header() {
  const { userId, activeTab, setActiveTab } = useApp();
  
  return (
    <header className="bg-white shadow-lg rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4 sm:mb-0">
        Limpeza Fácil 🧼
      </h1>
      <nav className="flex flex-wrap justify-center sm:justify-end gap-3">
        {/* NOVO: Botão do Dashboard */}
        <button
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${activeTab === 'dashboard' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
          onClick={() => setActiveTab('dashboard')}
          aria-label="Ver Dashboard"
        >
          Dashboard
        </button>
        <button
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${activeTab === 'pos' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
          onClick={() => setActiveTab('pos')}
          aria-label="Ponto de Venda"
        >
          PDV (Vendas)
        </button>
        <button
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${activeTab === 'products' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
          onClick={() => setActiveTab('products')}
          aria-label="Gerenciar Produtos"
        >
          Produtos
        </button>
        <button
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${activeTab === 'suppliers' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
          onClick={() => setActiveTab('suppliers')}
          aria-label="Gerenciar Fornecedores"
        >
          Fornecedores
        </button>
        <button
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${activeTab === 'clients' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
          onClick={() => setActiveTab('clients')}
          aria-label="Gerenciar Clientes"
        >
          Clientes (CRM)
        </button>
        <button
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${activeTab === 'expenses' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
          onClick={() => setActiveTab('expenses')}
          aria-label="Gerenciar Despesas"
        >
          Despesas
        </button>
        <button
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${activeTab === 'cashFlow' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
          onClick={() => setActiveTab('cashFlow')}
          aria-label="Ver Fluxo de Caixa"
        >
          Fluxo de Caixa
        </button>
        <button
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${activeTab === 'reports' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
          onClick={() => setActiveTab('reports')}
          aria-label="Gerar Relatórios"
        >
          Relatórios
        </button>
      </nav>
      <div className="text-center text-sm text-gray-600 mt-4 sm:mt-0">
        ID do Usuário: {userId}
      </div>
    </header>
  );
}
