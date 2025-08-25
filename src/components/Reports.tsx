/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// CORREÇÃO: Os caminhos de importação foram ajustados para garantir a resolução correta dos módulos.
import { useApp } from './AppContext';
import { useReports } from '../hooks/useReports';
import { Sale, Expense, StockMovement, SaleItem, Client } from '../types';

export default function Reports() {
  const { 
    reportStartDate, setReportStartDate, 
    reportEndDate, setReportEndDate, 
    salesReportData, expensesReportData, 
    stockMovementsReport, 
    totalReportSales, totalReportCostOfGoods, totalReportExpenses, 
    generateReports,
    salesByDay, topSellingProducts,
    productProfitability, topCustomers // NOVO: Obter dados dos novos relatórios
  } = useReports();
  
  const { clients, showTemporaryMessage } = useApp();

  const exportToPdf = (tableId: string, fileName: string) => {
    if (typeof (window as any).jsPDF === 'undefined' || typeof (window as any).jspdf?.plugin?.autotable === 'undefined') {
      showTemporaryMessage("Bibliotecas PDF não carregadas. Tente novamente.", "error");
      return;
    }
    const doc = new (window as any).jsPDF.jsPDF();
    (doc as any).autoTable({ html: `#${tableId}` });
    doc.save(`${fileName}.pdf`);
  };

  const exportToXlsx = (data: any[], fileName: string) => {
     if (typeof (window as any).XLSX === 'undefined') {
      showTemporaryMessage("Biblioteca XLSX não carregada. Tente novamente.", "error");
      return;
    }
    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Dados");
    (window as any).XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  useEffect(() => {
    generateReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportStartDate, reportEndDate]);

  const netProfit = totalReportSales - totalReportCostOfGoods - totalReportExpenses;

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Relatórios de Gestão
      </h2>
      
      {/* Filtro de Período */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Inputs de Data */}
          <div>
            <label htmlFor="reportStartDate" className="block text-gray-700 text-sm font-semibold mb-2">Data de Início:</label>
            <input type="date" id="reportStartDate" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full p-3 border rounded-md"/>
          </div>
          <div>
            <label htmlFor="reportEndDate" className="block text-gray-700 text-sm font-semibold mb-2">Data de Fim:</label>
            <input type="date" id="reportEndDate" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full p-3 border rounded-md"/>
          </div>
          <button onClick={generateReports} className="w-full bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-600">Gerar Relatórios</button>
        </div>
      </div>

      {/* Cartões de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md text-center"><h4 className="text-xl font-semibold text-green-800 mb-2">Total de Vendas</h4><p className="text-3xl font-bold text-green-600">R$ {totalReportSales.toFixed(2)}</p></div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center"><h4 className="text-xl font-semibold text-orange-800 mb-2">Custo dos Produtos</h4><p className="text-3xl font-bold text-orange-600">R$ {totalReportCostOfGoods.toFixed(2)}</p></div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center"><h4 className="text-xl font-semibold text-red-800 mb-2">Total de Despesas</h4><p className="text-3xl font-bold text-red-600">R$ {totalReportExpenses.toFixed(2)}</p></div>
        <div className={`p-6 rounded-lg shadow-md text-center ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}><h4 className="text-xl font-semibold text-blue-800 mb-2">Lucro Líquido</h4><p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-700'}`}>R$ {netProfit.toFixed(2)}</p></div>
      </div>

      {/* Gráficos Visuais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Evolução das Vendas no Período</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesByDay} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} name="Total de Vendas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Top 10 Produtos Mais Vendidos (Quantidade)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSellingProducts} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `${value} unidades`} />
              <Legend />
              <Bar dataKey="quantity" fill="#82ca9d" name="Quantidade Vendida" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NOVO: Tabela de Lucratividade por Produto */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Lucratividade por Produto</h3>
        <div className="overflow-x-auto">
          <table id="productProfitabilityTable" className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left">Produto</th>
                <th className="py-2 px-4 text-right">Qtd. Vendida</th>
                <th className="py-2 px-4 text-right">Receita Total</th>
                <th className="py-2 px-4 text-right">Lucro Total</th>
                <th className="py-2 px-4 text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {productProfitability.map(p => (
                <tr key={p.productId} className="border-b">
                  <td className="py-2 px-4 font-medium">{p.name}</td>
                  <td className="py-2 px-4 text-right">{p.quantitySold}</td>
                  <td className="py-2 px-4 text-right">R$ {p.totalRevenue.toFixed(2)}</td>
                  <td className={`py-2 px-4 text-right font-bold ${p.totalProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {p.totalProfit.toFixed(2)}</td>
                  <td className={`py-2 px-4 text-right ${p.profitMargin > 20 ? 'text-green-600' : 'text-orange-500'}`}>{p.profitMargin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOVO: Tabela de Análise de Clientes */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Análise de Clientes</h3>
        <div className="overflow-x-auto">
          <table id="topCustomersTable" className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left">Cliente</th>
                <th className="py-2 px-4 text-right">Nº de Compras</th>
                <th className="py-2 px-4 text-right">Total Gasto</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map(c => (
                <tr key={c.clientId} className="border-b">
                  <td className="py-2 px-4 font-medium">{c.name}</td>
                  <td className="py-2 px-4 text-right">{c.purchaseCount}</td>
                  <td className="py-2 px-4 text-right font-bold text-blue-600">R$ {c.totalSpent.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabelas Originais */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Relatório de Vendas Detalhado</h3>
        <div className="overflow-x-auto">
            <table id="salesTable" className="min-w-full bg-white">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="py-2 px-4 text-left">Data</th>
                        <th className="py-2 px-4 text-left">Cliente</th>
                        <th className="py-2 px-4 text-left">Itens</th>
                        <th className="py-2 px-4 text-left">Método Pag.</th>
                        <th className="py-2 px-4 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {salesReportData.map(sale => (
                        <tr key={sale.id} className="border-b">
                            <td className="py-2 px-4">{new Date(sale.timestamp).toLocaleDateString()}</td>
                            <td className="py-2 px-4">{clients.find(c => c.id === sale.clientId)?.name || 'N/A'}</td>
                            <td className="py-2 px-4">{sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</td>
                            <td className="py-2 px-4">{sale.paymentMethod}</td>
                            <td className="py-2 px-4 text-right">R$ {sale.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </section>
  );
}
