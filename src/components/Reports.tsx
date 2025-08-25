/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import { useApp } from './AppContext';
import { useReports } from '../hooks/useReports';
import { Sale, Expense, StockMovement, SaleItem, Client } from '../types';

export default function Reports() {
  const { 
    reportStartDate, 
    setReportStartDate, 
    reportEndDate, 
    setReportEndDate, 
    salesReportData, 
    expensesReportData, 
    stockMovementsReport, 
    totalReportSales, 
    totalReportCostOfGoods, 
    totalReportExpenses, 
    generateReports 
  } = useReports();
  
  const { clients, showTemporaryMessage } = useApp();

  const exportToPdf = (tableId: string, fileName: string) => {
    if (typeof (window as any).jsPDF === 'undefined' || typeof (window as any).jspdf?.plugin?.autotable === 'undefined') {
      showTemporaryMessage("Bibliotecas PDF não carregadas. Tente novamente em alguns segundos.", "error");
      return;
    }

    const doc = new (window as any).jsPDF.jsPDF();
    doc.setFontSize(12);
    const table = document.getElementById(tableId);

    if (!table) {
      showTemporaryMessage(`Tabela com ID '${tableId}' não encontrada para exportação PDF.`, "error");
      return;
    }

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim() || '');
    const data = Array.from(table.querySelectorAll('tbody tr')).map(row =>
      Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
    );

    (doc as any).autoTable({
      head: [headers],
      body: data,
      startY: 10,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        4: { halign: 'right' }
      }
    });

    doc.save(`${fileName}.pdf`);
    showTemporaryMessage(`Relatório ${fileName}.pdf exportado com sucesso!`);
  };

  const exportToXlsx = (data: any[], fileName: string) => {
    if (typeof (window as any).XLSX === 'undefined') {
      showTemporaryMessage("Biblioteca XLSX não carregada. Tente novamente em alguns segundos.", "error");
      return;
    }

    if (data.length === 0) {
      showTemporaryMessage("Não há dados para exportar em XLSX.", "error");
      return;
    }
    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Dados");
    (window as any).XLSX.writeFile(wb, `${fileName}.xlsx`);
    showTemporaryMessage(`Relatório ${fileName}.xlsx exportado com sucesso!`);
  };

  useEffect(() => {
    generateReports();
  }, [reportStartDate, reportEndDate, generateReports]);

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
              aria-label="Data de início do relatório"
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
              aria-label="Data de fim do relatório"
            />
          </div>
          <button
            onClick={generateReports}
            className="w-full bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-600 transition duration-300 ease-in-out transform hover:scale-105"
            aria-label="Gerar relatórios para o período selecionado"
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

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Relatório de Vendas
          <div className="inline-flex gap-2 ml-4">
            <button onClick={() => exportToPdf('salesTable', 'Relatorio_Vendas')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600" aria-label="Exportar relatório de vendas para PDF">PDF</button>
            <button onClick={() => exportToXlsx(salesReportData.map((s: Sale) => ({
              Data: new Date(s.timestamp).toLocaleDateString(),
              Cliente: clients.find((c: Client) => c.id === s.clientId)?.name || 'N/A', // Corrected here
              Itens: s.items.map((item: SaleItem) => `${item.name} (x${item.quantity})`).join(', '),
              MetodoPagamento: s.paymentMethod,
              Total: s.total.toFixed(2)
            })), 'Relatorio_Vendas')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600" aria-label="Exportar relatório de vendas para XLSX">XLSX</button>
          </div>
        </h3>
        {salesReportData.length === 0 ? (
          <p className="text-gray-600">Nenhuma venda no período selecionado.</p>
        ) : (
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
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Relatório de Despesas
          <div className="inline-flex gap-2 ml-4">
            <button onClick={() => exportToPdf('expensesTable', 'Relatorio_Despesas')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600" aria-label="Exportar relatório de despesas para PDF">PDF</button>
            <button onClick={() => exportToXlsx(expensesReportData.map((e: Expense) => ({
              Data: new Date(e.timestamp!).toLocaleDateString(),
              Descricao: e.description,
              Valor: e.amount.toFixed(2)
            })), 'Relatorio_Despesas')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600" aria-label="Exportar relatório de despesas para XLSX">XLSX</button>
          </div>
        </h3>
        {expensesReportData.length === 0 ? (
          <p className="text-gray-600">Nenhuma despesa no período selecionado.</p>
        ) : (
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
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Relatório de Movimentação de Estoque
          <div className="inline-flex gap-2 ml-4">
            <button onClick={() => exportToPdf('stockMovementsTable', 'Relatorio_Movimentacao_Estoque')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600" aria-label="Exportar relatório de movimentação de estoque para PDF">PDF</button>
            <button onClick={() => exportToXlsx(stockMovementsReport.map((m: StockMovement) => ({
              Data: new Date(m.timestamp).toLocaleDateString(),
              Produto: m.productName,
              Tipo: m.type,
              Quantidade: m.quantity,
              Motivo: m.reason
            })), 'Relatorio_Movimentacao_Estoque')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600" aria-label="Exportar relatório de movimentação de estoque para XLSX">XLSX</button>
          </div>
        </h3>
        {stockMovementsReport.length === 0 ? (
          <p className="text-gray-600">Nenhuma movimentação de estoque no período selecionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table id="stockMovementsTable" className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left text-gray-600 font-semibold">Data</th>
                  <th className="py-2 px-4 text-left text-gray-600 font-semibold">Produto</th>
                  <th className="py-2 px-4 text-left text-gray-600 font-semibold">Tipo</th>
                  <th className="py-2 px-4 text-right text-gray-600 font-semibold">Quantidade</th>
                  <th className="py-2 px-4 text-left text-gray-600 font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {stockMovementsReport.map(movement => (
                  <tr key={movement.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2 px-4 text-sm text-gray-800">{new Date(movement.timestamp).toLocaleDateString()}</td>
                    <td className="py-2 px-4 text-sm text-gray-800">{movement.productName}</td>
                    <td className="py-2 px-4 text-sm text-gray-800">{movement.type}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 text-right">{movement.quantity}</td>
                    <td className="py-2 px-4 text-sm text-gray-800">{movement.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}