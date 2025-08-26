/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useApp } from './AppContext';
import { useReports } from '../hooks/useReports';
import Spinner from './common/Spinner';

// Componente auxiliar para os cabeçalhos das seções com botões de exportação
const ReportSectionHeader = ({ title, onExportPdf, onExportXlsx }: { title: string; onExportPdf?: () => void; onExportXlsx?: () => void; }) => (
  <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
    <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
    <div className="flex gap-2">
       {/*onExportPdf && (
       
        <button onClick={onExportPdf} className="bg-red-500 text-white text-xs font-bold py-1 px-3 rounded hover:bg-red-600">
          Exportar PDF
        </button>
       
      )*/} 
      {onExportXlsx && (
        <button onClick={onExportXlsx} className="bg-green-600 text-white text-xs font-bold py-1 px-3 rounded hover:bg-green-700">
          Exportar XLSX
        </button>
      )}
    </div>
  </div>
);

export default function Reports() {
  const { 
    reportStartDate, setReportStartDate, 
    reportEndDate, setReportEndDate, 
    salesReportData, expensesReportData, 
    totalReportSales, totalReportCostOfGoods, totalReportExpenses, 
    generateReports,
    salesByDay, topSellingProducts,
    productProfitability, topCustomers,
    isLoading
  } = useReports();
  
  const { clients, showTemporaryMessage } = useApp();

  useEffect(() => {
    generateReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Função de exportação para PDF corrigida
  const exportToPdf = (headers: string[][], body: (string|number)[][], fileName: string) => {
    if (typeof window.jsPDF === 'undefined') {
      showTemporaryMessage("Bibliotecas PDF não carregadas. Tente novamente.", "error");
      return;
    }
    const doc = new window.jsPDF.jsPDF();
    doc.autoTable({
      head: headers,
      body: body,
    });
    doc.save(`${fileName}.pdf`);
  };

  const exportToXlsx = (data: any[], fileName: string) => {
    if (typeof window.XLSX === 'undefined') {
        showTemporaryMessage("Biblioteca XLSX não carregada. Tente novamente.", "error");
        return;
    }
    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Dados");
    window.XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleExportAllToXLSX = useCallback(() => {
    if (typeof window.XLSX === 'undefined') {
      showTemporaryMessage("Biblioteca XLSX não carregada. Tente novamente.", "error");
      return;
    }

    const wb = window.XLSX.utils.book_new();
    const currencyFormat = '"R$"#,##0.00';
    const percentFormat = '0.00%';

    const coverData = [
        ["Relatório Gerencial - Limpeza Fácil"], [],
        ["Período de Análise:", `${new Date(reportStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(reportEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}`],
        ["Data de Emissão:", new Date().toLocaleString('pt-BR')],
    ];
    const wsCover = window.XLSX.utils.aoa_to_sheet(coverData);
    wsCover['!cols'] = [{ wch: 25 }, { wch: 30 }];
    window.XLSX.utils.book_append_sheet(wb, wsCover, "Capa");

    const totalItemsSold = salesReportData.reduce((acc, sale) => acc + sale.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0), 0);
    const averageTicket = salesReportData.length > 0 ? totalReportSales / salesReportData.length : 0;
    const summaryData = [
      ["Indicador", "Valor"],
      ["Receita Bruta Total", { v: totalReportSales, t: 'n', z: currencyFormat }],
      ["Custo dos Produtos Vendidos (CPV)", { v: totalReportCostOfGoods, t: 'n', z: currencyFormat }],
      ["Despesas Totais", { v: totalReportExpenses, t: 'n', z: currencyFormat }],
      ["Lucro Bruto (Receita - CPV)", { v: totalReportSales - totalReportCostOfGoods, t: 'n', z: currencyFormat }],
      ["Resultado Líquido", { v: totalReportSales - totalReportCostOfGoods - totalReportExpenses, t: 'n', z: currencyFormat }],
      [], ["Indicadores de Vendas"],
      ["Número de Vendas", salesReportData.length],
      ["Ticket Médio", { v: averageTicket, t: 'n', z: currencyFormat }],
      ["Total de Itens Vendidos", totalItemsSold],
    ];
    const wsSummary = window.XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }];
    window.XLSX.utils.book_append_sheet(wb, wsSummary, "Dashboard Gerencial");

    if (salesReportData.length > 0) {
      const salesDetails = salesReportData.flatMap(sale => 
        sale.items.map(item => ({
          'Data': new Date(sale.timestamp), 'Cliente': clients.find(c => c.id === sale.clientId)?.name || 'N/A',
          'Produto': item.name, 'Qtd': item.quantity,
          'Preço Unit.': { v: item.price, t: 'n', z: currencyFormat },
          'Custo Unit.': { v: item.costPrice, t: 'n', z: currencyFormat },
          'Total Item': { v: item.price * item.quantity, t: 'n', z: currencyFormat },
          'Método Pag.': sale.paymentMethod,
        }))
      );
      const wsSales = window.XLSX.utils.json_to_sheet(salesDetails);
      wsSales['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
      window.XLSX.utils.book_append_sheet(wb, wsSales, "Vendas Detalhadas");
    }

    if (expensesReportData.length > 0) {
        const expensesDetails = expensesReportData.map(exp => ({
            'Data': new Date(exp.timestamp!), 'Descrição': exp.description,
            'Valor': { v: exp.amount, t: 'n', z: currencyFormat },
        }));
        const wsExpenses = window.XLSX.utils.json_to_sheet(expensesDetails);
        wsExpenses['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 15 }];
        window.XLSX.utils.book_append_sheet(wb, wsExpenses, "Despesas Detalhadas");
    }
    
    if (productProfitability.length > 0) {
        const profitData = productProfitability.map(p => ({
            'Produto': p.name, 'Qtd. Vendida': p.quantitySold,
            'Receita Total': { v: p.totalRevenue, t: 'n', z: currencyFormat },
            'Custo Total': { v: p.totalCost, t: 'n', z: currencyFormat },
            'Lucro Total': { v: p.totalProfit, t: 'n', z: currencyFormat },
            'Margem (%)': { v: p.profitMargin / 100, t: 'n', z: percentFormat },
        }));
        const wsProfit = window.XLSX.utils.json_to_sheet(profitData);
        wsProfit['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
        window.XLSX.utils.book_append_sheet(wb, wsProfit, "Lucratividade Produtos");
    }

    const fileName = `Relatorio_Gerencial_${reportStartDate}_a_${reportEndDate}.xlsx`;
    window.XLSX.writeFile(wb, fileName);
  }, [reportStartDate, reportEndDate, totalReportSales, totalReportCostOfGoods, totalReportExpenses, salesReportData, expensesReportData, productProfitability, clients]);

  const netProfit = totalReportSales - totalReportCostOfGoods - totalReportExpenses;
  const hasData = salesReportData.length > 0 || expensesReportData.length > 0;

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Relatórios de Gestão
      </h2>
      
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="reportStartDate" className="block text-gray-700 text-sm font-semibold mb-2">Data de Início:</label>
            <input type="date" id="reportStartDate" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full p-3 border rounded-md"/>
          </div>
          <div>
            <label htmlFor="reportEndDate" className="block text-gray-700 text-sm font-semibold mb-2">Data de Fim:</label>
            <input type="date" id="reportEndDate" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full p-3 border rounded-md"/>
          </div>
          <button
            onClick={generateReports}
            className="w-full bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-600 flex items-center justify-center disabled:bg-indigo-400"
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : null}
            {isLoading ? 'A gerar...' : 'Gerar Relatórios'}
          </button>
          <button
            onClick={handleExportAllToXLSX}
            className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 flex items-center justify-center disabled:bg-gray-400"
            disabled={!hasData || isLoading}
            title={!hasData ? "Gere um relatório para poder exportar" : "Exportar relatório completo para Excel"}
          >
            Exportar Relatório Completo
          </button>
        </div>
      </div>
      
      {isLoading && !hasData && <div className="text-center p-10"><Spinner /> Carregando dados iniciais...</div>}
      {!isLoading && !hasData && <div className="text-center p-10 text-gray-500">Nenhum dado encontrado para o período selecionado.</div>}

      {hasData && (
        <>
          {/* Seção de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md text-center"><h4 className="text-xl font-semibold text-green-800 mb-2">Total de Vendas</h4><p className="text-3xl font-bold text-green-600">R$ {totalReportSales.toFixed(2)}</p></div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center"><h4 className="text-xl font-semibold text-orange-800 mb-2">Custo dos Produtos</h4><p className="text-3xl font-bold text-orange-600">R$ {totalReportCostOfGoods.toFixed(2)}</p></div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center"><h4 className="text-xl font-semibold text-red-800 mb-2">Total de Despesas</h4><p className="text-3xl font-bold text-red-600">R$ {totalReportExpenses.toFixed(2)}</p></div>
            <div className={`p-6 rounded-lg shadow-md text-center ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}><h4 className="text-xl font-semibold text-blue-800 mb-2">Lucro Líquido</h4><p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-700'}`}>R$ {netProfit.toFixed(2)}</p></div>
          </div>

          {/* Seção de Gráficos */}
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
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Top 10 Produtos Mais Vendidos</h3>
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

          {/* Seção de Tabelas */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <ReportSectionHeader 
              title="Lucratividade por Produto"
              onExportPdf={() => exportToPdf(
                [['Produto', 'Qtd. Vendida', 'Receita Total', 'Lucro Total', 'Margem (%)']],
                productProfitability.map(p => [p.name, p.quantitySold, `R$ ${p.totalRevenue.toFixed(2)}`, `R$ ${p.totalProfit.toFixed(2)}`, `${p.profitMargin.toFixed(1)}%`]),
                'Lucratividade_Produtos'
              )}
              onExportXlsx={() => exportToXlsx(productProfitability.map(p => ({'Produto': p.name, 'Qtd. Vendida': p.quantitySold, 'Receita Total': p.totalRevenue, 'Lucro Total': p.totalProfit, 'Margem (%)': p.profitMargin})), 'Lucratividade_Produtos')}
            />
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

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <ReportSectionHeader 
                title="Análise de Clientes"
                onExportPdf={() => exportToPdf(
                    [['Cliente', 'Nº de Compras', 'Total Gasto']],
                    topCustomers.map(c => [c.name, c.purchaseCount, `R$ ${c.totalSpent.toFixed(2)}`]),
                    'Analise_Clientes'
                )}
                onExportXlsx={() => exportToXlsx(topCustomers.map(c => ({'Cliente': c.name, 'Nº de Compras': c.purchaseCount, 'Total Gasto': c.totalSpent})), 'Analise_Clientes')}
            />
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

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <ReportSectionHeader 
                title="Relatório de Vendas Detalhado"
                onExportPdf={() => exportToPdf(
                    [['Data', 'Cliente', 'Itens', 'Método Pag.', 'Total']],
                    salesReportData.map(sale => [
                        new Date(sale.timestamp).toLocaleDateString(),
                        clients.find(c => c.id === sale.clientId)?.name || 'N/A',
                        sale.items.map(i => `${i.name} (x${i.quantity})`).join(', '),
                        sale.paymentMethod,
                        `R$ ${sale.total.toFixed(2)}`
                    ]),
                    'Vendas_Detalhadas'
                )}
                onExportXlsx={() => exportToXlsx(salesReportData.map(sale => ({'Data': new Date(sale.timestamp).toLocaleString(), 'Cliente': clients.find(c => c.id === sale.clientId)?.name || 'N/A', 'Itens': sale.items.map(i => `${i.name} (x${i.quantity})`).join(', '), 'Método Pag.': sale.paymentMethod, 'Total': sale.total})), 'Vendas_Detalhadas')}
            />
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
        </>
      )}
    </section>
  );
}
