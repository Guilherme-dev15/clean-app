import { useState } from 'react';
import { useApp } from './AppContext';
import { Product, Client, CartItem } from '../types';
import Spinner from './common/Spinner';
import { TDocumentDefinitions } from "pdfmake/interfaces";

// 1. Importar pdfMake e as fontes separadamente
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// 2. CORREÇÃO DEFINITIVA: Registrar as fontes no pdfMake da maneira correta.
// A propriedade 'vfs' está dentro de 'pdfMake', que por sua vez está dentro do módulo de fontes.

pdfMake.vfs = pdfFonts.pdfMake;



export default function QuoteGenerator() {

  const { products, clients, showTemporaryMessage } = useApp();
  const [quoteItems, setQuoteItems] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [quoteValidity, setQuoteValidity] = useState("15 dias");
  const [isGenerating, setIsGenerating] = useState(false);

  const addToQuote = (product: Product) => {
    const existingItem = quoteItems.find((item) => item.id === product.id);
    if (existingItem) {
      setQuoteItems(
        quoteItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // Simplificado e corrigido para corresponder à interface CartItem
      const newItem: CartItem = { ...product, quantity: 1 };
      setQuoteItems([...quoteItems, newItem]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setQuoteItems(quoteItems.filter((item) => item.id !== productId));
    } else {
      setQuoteItems(
        quoteItems.map((item) =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const calculateTotal = () =>
    quoteItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const generatePDF = () => {
    if (!selectedClient) {
      showTemporaryMessage("Por favor, selecione um cliente para o orçamento.", "error");
      return;
    }
    if (quoteItems.length === 0) {
      showTemporaryMessage("Adicione pelo menos um item ao orçamento.", "error");
      return;
    }

    setIsGenerating(true);

    const tableBody = [
      [
        { text: "Código", style: "tableHeader" },
        { text: "Produto/Descrição", style: "tableHeader" },
        { text: "Qtd.", style: "tableHeader" },
        { text: "Valor Unit.", style: "tableHeader" },
        { text: "Total", style: "tableHeader" },
      ],
      ...quoteItems.map((item, index) => [
        (index + 1).toString().padStart(3, "0"),
        item.name,
        { text: item.quantity, alignment: "center" as const },
        { text: `R$ ${item.price.toFixed(2)}`, alignment: "right" as const },
        { text: `R$ ${(item.price * item.quantity).toFixed(2)}`, alignment: "right" as const },
      ]),
      [
        { text: "Subtotal", colSpan: 4, style: "subtotal" },
        {}, {}, {},
        { text: `R$ ${calculateTotal().toFixed(2)}`, style: "subtotalValue" },
      ],
    ];

    const docDefinition: TDocumentDefinitions = {
      pageSize: "A4",
      pageMargins: [40, 110, 40, 80],
      header: {
        margin: [40, 20, 40, 0],
        columns: [
          {
            stack: [
              { text: "Amer Clean", style: "headerTitle" },
              { text: "Orçamento - Materiais de Limpeza e Descartáveis", style: "headerSubtitle" },
              { text: "Endereço: Loja 1 – Avenida Abel Tavares, 533 – São Paulo", style: "headerInfo" },
              { text: "WhatsApp: (11) 99208-4515 | E-mail: amerclean2@gmail.com", style: "headerInfo" },
            ],
            alignment: "center",
          },
        ],
      },
      footer: (currentPage, pageCount) => ({
        text: `Página ${currentPage.toString()} de ${pageCount}`,
        alignment: "right",
        style: "footer",
        margin: [0, 20, 40, 0],
      }),
      content: [
        { canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: "#cccccc" }] },
        { text: "Dados do Cliente", style: "sectionHeader" },
        {
          style: "clientTable",
          table: {
            widths: ["auto", "*", "auto", "*"],
            body: [
              [{ text: "Empresa:", bold: true }, selectedClient.name, { text: "Responsável:", bold: true }, ""],
              [{ text: "Telefone:", bold: true }, selectedClient.contactPhone, { text: "E-mail:", bold: true }, selectedClient.contactEmail],
              [{ text: "Data:", bold: true }, new Date(quoteDate).toLocaleDateString("pt-BR"), "", ""],
            ],
          },
          layout: "noBorders",
        },
        {
          style: "itemsTable",
          table: {
            headerRows: 1,
            widths: [50, "*", 50, 80, 80],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#2980b9" : null),
          },
        },
        { text: "Condições Comerciais", style: "sectionHeader" },
        {
          style: "conditionsTable",
          table: {
            widths: ["auto", "*"],
            body: [
              [{ text: "Forma de pagamento:", bold: true }, "A combinar"],
              [{ text: "Prazo de entrega:", bold: true }, "A combinar"],
              [{ text: "Validade do orçamento:", bold: true }, quoteValidity],
            ],
          },
          layout: "noBorders",
        },
        {
          text: "A Amer Clean agradece a oportunidade e ficará feliz em atender sua empresa com qualidade, preço justo e entrega rápida.\nEstamos à disposição para ajustar a proposta conforme sua necessidade.",
          style: "thankYouText",
          alignment: "center",
        },
      ],
      styles: {
        headerTitle: { fontSize: 22, bold: true },
        headerSubtitle: { fontSize: 10, margin: [0, 4, 0, 2] },
        headerInfo: { fontSize: 9 },
        sectionHeader: { fontSize: 12, bold: true, margin: [0, 15, 0, 5] },
        clientTable: { margin: [0, 5, 0, 15], fontSize: 10 },
        itemsTable: { margin: [0, 5, 0, 15] },
        tableHeader: { bold: true, fontSize: 10, color: "white", alignment: "center" },
        subtotal: { bold: true, fontSize: 11, alignment: "right" },
        subtotalValue: { bold: true, fontSize: 11, alignment: "right" },
        conditionsTable: { margin: [0, 5, 0, 15], fontSize: 10 },
        thankYouText: { margin: [0, 20, 0, 0], italics: true, color: "#555555" },
        footer: { fontSize: 8 },
      },
    };

    pdfMake.createPdf(docDefinition).getBlob((blob: Blob | MediaSource) => {
      const url = URL.createObjectURL(blob);
      const win = window.open(url);
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Orcamento_${selectedClient.name.replace(/\s/g, '_')}.pdf`;
        a.click();
      }
      setIsGenerating(false);
    });
  };

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Gerador de Orçamentos
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-green-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-green-800 mb-4">
            Selecione os Produtos
          </h3>
          <div className="max-h-96 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition duration-200"
                onClick={() => addToQuote(product)}
              >
                <p className="font-bold text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-600">R$ {product.price?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg shadow-inner flex flex-col">
          <h3 className="text-2xl font-semibold text-blue-800 mb-4">
            Orçamento
          </h3>
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="client-select" className="block text-sm font-medium text-gray-700">Cliente</label>
              <select
                id="client-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                onChange={(e) => {
                  const client = clients.find((c) => c.id === e.target.value);
                  setSelectedClient(client || null);
                }}
              >
                <option value="">Selecione um cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id!}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quote-date" className="block text-sm font-medium text-gray-700">Data do Orçamento</label>
              <input type="date" id="quote-date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div>
              <label htmlFor="quote-validity" className="block text-sm font-medium text-gray-700">Validade</label>
              <input type="text" id="quote-validity" value={quoteValidity} onChange={e => setQuoteValidity(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
          </div>
          <div className="flex-grow max-h-72 overflow-y-auto pr-2 mb-4 border-t pt-4">
            {quoteItems.length === 0 ? (
              <p className="text-gray-500 text-center">Nenhum item adicionado.</p>
            ) : (
              <ul className="space-y-3">
                {quoteItems.map(item => (
                  <li key={item.id} className="bg-white p-2 rounded-lg shadow-sm flex items-center justify-between">
                    <span className="font-semibold text-sm flex-1">{item.name}</span>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id!, parseInt(e.target.value, 10))}
                      className="w-16 text-center border rounded-md mx-2"
                    />
                    <span className="text-sm w-24 text-right">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-auto pt-4 border-t">
            <p className="text-xl font-bold text-gray-900 mb-4">Total: R$ {calculateTotal().toFixed(2)}</p>
            <button
              onClick={generatePDF}
              className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center justify-center disabled:bg-indigo-400"
              disabled={isGenerating}
            >
              {isGenerating && <Spinner />}
              {isGenerating ? 'A gerar...' : 'Gerar PDF do Orçamento'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
