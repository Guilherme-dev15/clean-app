import { useState } from 'react';
// CORREÇÃO: Os caminhos de importação foram ajustados para garantir a resolução correta dos módulos.
import { useApp } from './AppContext';
import { collection, doc, getDoc, getDocFromCache, writeBatch, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { CartItem, Sale, StockMovement, Product } from '../types';
import Spinner from './common/Spinner';

export default function POS() {
  const { db, userId, appId, showTemporaryMessage, products, clients } = useApp();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
  const [selectedClientForSale, setSelectedClientForSale] = useState<string>('');
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false);

  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      showTemporaryMessage("Produto fora de estoque.", "error");
      return;
    }
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        showTemporaryMessage("Quantidade máxima em estoque atingida para este item.", "error");
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    showTemporaryMessage(`${product.name} adicionado ao carrinho.`);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
    showTemporaryMessage("Produto removido do carrinho.");
  };

  const updateCartQuantity = (productId: string, change: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return null;
        const productInStock = products.find(p => p.id === productId);
        if (productInStock && newQuantity > productInStock.stock) {
          showTemporaryMessage("Quantidade solicitada excede o estoque disponível.", "error");
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const calculateTotal = (): number => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showTemporaryMessage("O carrinho está vazio.", "error");
      return;
    }
    if (!db || !userId) {
      showTemporaryMessage("Erro de conexão. Faça login novamente.", "error");
      return;
    }
    if (paymentMethod === 'Fiado' && !selectedClientForSale) {
      showTemporaryMessage("Para vendas 'Fiado', é obrigatório selecionar um cliente.", "error");
      return;
    }

    setIsProcessingSale(true);

    try {
        for (const item of cart) {
            const productInState = products.find(p => p.id === item.id);
            if (!productInState) {
                throw new Error(`Produto ${item.name} não foi encontrado nos dados locais.`);
            }
            if (productInState.stock < item.quantity) {
                throw new Error(`Estoque insuficiente para ${item.name}. Atual: ${productInState.stock}, Pedido: ${item.quantity}.`);
            }
        }

        const clientInState = clients.find(c => c.id === selectedClientForSale);
        if (paymentMethod === 'Fiado' && !clientInState) {
            throw new Error(`Cliente selecionado para venda 'Fiado' não foi encontrado.`);
        }

        const today = new Date().toISOString().split('T')[0];
        const cashRegisterDocRef = doc(db, `artifacts/${appId}/users/${userId}/cash_register_summary`, today);
        let cashRegisterDoc: DocumentSnapshot<DocumentData> | undefined;

        try {
            cashRegisterDoc = await getDoc(cashRegisterDocRef);
        } catch (onlineError) {
            console.warn('Falha na busca online do caixa. Tentando ler do cache local...', onlineError);
            try {
                cashRegisterDoc = await getDocFromCache(cashRegisterDocRef);
            } catch (cacheError) {
                console.error("Erro ao ler o caixa do cache:", cacheError);
                throw new Error('Não foi possível acessar os dados do caixa. A venda não pode ser concluída.');
            }
        }
      
        const batch = writeBatch(db);
        const total = calculateTotal();
        
        const saleData: Sale = {
          timestamp: new Date().toISOString(),
          items: cart.map(item => ({
            productId: item.id!,
            name: item.name,
            price: item.price,
            costPrice: item.costPrice,
            quantity: item.quantity
          })),
          total: total,
          paymentMethod: paymentMethod,
          userId: userId!,
          clientId: selectedClientForSale || null
        };
        
        const salesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sales`);
        const newSaleDocRef = doc(salesCollectionRef);
        batch.set(newSaleDocRef, saleData as DocumentData);

        for (const item of cart) {
            const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.id!);
            const productInState = products.find(p => p.id === item.id)!;
            const newStock = productInState.stock - item.quantity;
            batch.update(productRef, { stock: newStock });

            const stockMovementData: StockMovement = {
                productId: item.id!,
                productName: item.name,
                type: 'Venda',
                quantity: item.quantity,
                reason: `Venda ID: ${newSaleDocRef.id}`,
                timestamp: new Date().toISOString(),
                userId: userId!
            };
            const stockMovementRef = doc(collection(db, `artifacts/${appId}/users/${userId}/stock_movements`));
            batch.set(stockMovementRef, stockMovementData as DocumentData);
        }

        if (cashRegisterDoc?.exists()) {
            const currentData = cashRegisterDoc.data();
            const currentSalesTotal = currentData.salesTotal || 0;
            batch.update(cashRegisterDocRef, { salesTotal: currentSalesTotal + total });
        } else {
            batch.set(cashRegisterDocRef, {
                date: today,
                salesTotal: total,
                expensesTotal: 0,
                userId: userId!
            } as DocumentData);
        }

        if (paymentMethod === 'Fiado' && clientInState) {
            const clientRef = doc(db, `artifacts/${appId}/users/${userId}/clients`, clientInState.id!);
            const currentDebt = clientInState.debt || 0;
            batch.update(clientRef, { debt: currentDebt + total });
        }
      
        await batch.commit();

        showTemporaryMessage("Venda finalizada com sucesso! 💰", "success");
        setCart([]);
        setSelectedClientForSale('');

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido. Verifique o console.';
        console.error("Erro ao finalizar venda:", error);
        showTemporaryMessage(`Erro ao finalizar venda: ${errorMessage}`, "error");
    } finally {
        setIsProcessingSale(false);
    }
  };

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Ponto de Venda (PDV)
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-green-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-green-800 mb-4">
            Produtos Disponíveis
          </h3>
          <div className="max-h-96 overflow-y-auto pr-2">
            {products.length === 0 ? (
              <p className="text-gray-600">Nenhum produto registado para venda.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition duration-200
                      ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => product.stock > 0 && addToCart(product)}
                    aria-label={`Adicionar ${product.name} ao carrinho`}
                  >
                    <p className="font-bold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">R$ {product.price?.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Estoque: {product.stock} {product.stock <= product.minStock && <span className="text-red-500 font-semibold">(Baixo)</span>}</p>
                    {product.stock === 0 && <p className="text-red-500 font-semibold text-xs mt-1">Fora de estoque</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg shadow-inner flex flex-col">
          <h3 className="text-2xl font-semibold text-blue-800 mb-4">
            Carrinho de Compras
          </h3>
          <div className="flex-grow max-h-72 overflow-y-auto pr-2 mb-4">
            {cart.length === 0 ? (
              <p className="text-gray-600">Carrinho vazio.</p>
            ) : (
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li key={item.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">R$ {item.price?.toFixed(2)} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.id!, -1)}
                        className="bg-gray-300 text-gray-800 p-1 rounded-full hover:bg-gray-400"
                        aria-label={`Diminuir quantidade de ${item.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <span className="font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id!, 1)}
                        className="bg-gray-300 text-gray-800 p-1 rounded-full hover:bg-gray-400"
                        aria-label={`Aumentar quantidade de ${item.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id!)}
                        className="text-red-500 hover:text-red-700"
                        title="Remover"
                        aria-label={`Remover ${item.name} do carrinho`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-auto pt-4 border-t border-gray-200">
            <p className="text-xl font-bold text-gray-900 mb-3">Total: R$ {calculateTotal().toFixed(2)}</p>
            <div className="mb-4">
              <label htmlFor="clientSelect" className="block text-gray-700 text-sm font-semibold mb-2">
                Cliente (Opcional):
              </label>
              <select
                id="clientSelect"
                value={selectedClientForSale}
                onChange={(e) => setSelectedClientForSale(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Selecionar cliente para a venda"
              >
                <option value="">-- Selecione um cliente --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id!}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="paymentMethod" className="block text-gray-700 text-sm font-semibold mb-2">
                Método de Pagamento:
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Selecionar método de pagamento"
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="PIX">PIX</option>
                <option value="Fiado">Fiado</option>
              </select>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:scale-100 flex items-center justify-center"
              disabled={isProcessingSale || cart.length === 0}
              aria-label={isProcessingSale ? 'A processar venda...' : 'Finalizar venda'}
            >
              {isProcessingSale && <Spinner />}
              {isProcessingSale ? 'A processar...' : 'Finalizar Venda'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
