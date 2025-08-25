/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
// NOVO: Importar componentes de gráficos diretamente da biblioteca
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
    salesByDay, topSellingProducts
  } = useReports();
  
  const { clients, showTemporaryMessage } = useApp();

  const exportToPdf = (tableId: string, fileName: string) => {
    if (typeof (window as any).jsPDF === 'undefined' || typeof (window as any).jspdf?.plugin?.autotable === 'undefined') {
      showTemporaryMessage("Bibliotecas PDF não carregadas. Tente novamente em alguns segundos.", "error");
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

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Relatórios Detalhados
      </h2>
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Filtro por Período
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="reportStartDate" className="block text-gray-700 text-sm font-semibold mb-2">
              Data de Início:
            </label>
            <input
              type="date"
              id="reportStartDate"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label htmlFor="reportEndDate" className="block text-gray-700 text-sm font-semibold mb-2">
              Data de Fim:
            </label>
            <input
              type="date"
              id="reportEndDate"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <button
            onClick={generateReports}
            className="w-full bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-600"
          >
            Gerar Relatórios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h4 className="text-xl font-semibold text-green-800 mb-2">Total de Vendas</h4>
          <p className="text-3xl font-bold text-green-600">R$ {totalReportSales.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h4 className="text-xl font-semibold text-red-800 mb-2">Total de Despesas</h4>
          <p className="text-3xl font-bold text-red-600">R$ {totalReportExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h4 className="text-xl font-semibold text-purple-800 mb-2">Lucro Bruto</h4>
          <p className="text-3xl font-bold text-purple-600">R$ {(totalReportSales - totalReportCostOfGoods).toFixed(2)}</p>
          <p className="text-sm text-gray-500">(Vendas - Custo dos Produtos)</p>
        </div>
      </div>

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

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Relatório de Vendas
          <div className="inline-flex gap-2 ml-4">
            <button onClick={() => exportToPdf('salesTable', 'Relatorio_Vendas')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600">PDF</button>
            <button onClick={() => exportToXlsx(salesReportData.map((s: Sale) => ({
              Data: new Date(s.timestamp).toLocaleDateString(),
              Cliente: clients.find((c: Client) => c.id === s.clientId)?.name || 'N/A',
              Itens: s.items.map((item: SaleItem) => `${item.name} (x${item.quantity})`).join(', '),
              MetodoPagamento: s.paymentMethod,
              Total: s.total.toFixed(2)
            })), 'Relatorio_Vendas')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">XLSX</button>
          </div>
        </h3>
        <div className="overflow-x-auto">
          <table id="salesTable" className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Data</th>
                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Cliente</th>
                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Itens</th>
                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Método Pag.</th>
                <th className="py-2 px-4 text-right text-gray-600 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {salesReportData.map(sale => (
                <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-4 text-sm text-gray-800">{new Date(sale.timestamp).toLocaleDateString()}</td>
                  <td className="py-2 px-4 text-sm text-gray-800">{clients.find((c: Client) => c.id === sale.clientId)?.name || 'N/A'}</td>
                  <td className="py-2 px-4 text-sm text-gray-800">
                    {sale.items.map((item: SaleItem) => `${item.name} (x${item.quantity})`).join(', ')}
                  </td>
                  <td className="py-2 px-4 text-sm text-gray-800">{sale.paymentMethod}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 text-right">R$ {sale.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Relatório de Despesas
          <div className="inline-flex gap-2 ml-4">
            <button onClick={() => exportToPdf('expensesTable', 'Relatorio_Despesas')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600">PDF</button>
            <button onClick={() => exportToXlsx(expensesReportData.map((e: Expense) => ({
              Data: new Date(e.timestamp!).toLocaleDateString(),
              Descricao: e.description,
              Valor: e.amount.toFixed(2)
            })), 'Relatorio_Despesas')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">XLSX</button>
          </div>
        </h3>
        <div className="overflow-x-auto">
          <table id="expensesTable" className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Data</th>
                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Descrição</th>
                <th className="py-2 px-4 text-right text-gray-600 font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {expensesReportData.map(expense => (
                <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-4 text-sm text-gray-800">{new Date(expense.timestamp ?? '').toLocaleDateString()}</td>
                  <td className="py-2 px-4 text-sm text-gray-800">{expense.description}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 text-right">R$ {expense.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
