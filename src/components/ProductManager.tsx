// src/components/ProductManager.tsx
import { useState } from 'react';
// CORREÇÃO: Os caminhos de importação foram ajustados para garantir a resolução correta dos módulos.
import { useApp } from './AppContext';
import { addDoc, collection, deleteDoc, doc, updateDoc, DocumentData } from 'firebase/firestore';
import { Product } from '../types';
import ProductHistoryModal from './common/ProductHistoryModal';
import Spinner from './common/Spinner';

export default function ProductManager() {
  const { db, userId, appId, showTemporaryMessage, confirmAction, products } = useApp();

  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({ name: '', price: 0, costPrice: 0, stock: 0, category: '', minStock: 5 });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState<boolean>(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [stockAdjustmentQuantity, setStockAdjustmentQuantity] = useState<string>('');
  const [stockAdjustmentType, setStockAdjustmentType] = useState<string>('entrada');
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState<string>('');
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const handleAddUpdateProduct = async () => {
    if (isSaving) return;
    if (!db || !userId) {
      showTemporaryMessage("Erro: Firebase não inicializado.", "error");
      return;
    }

    if (!newProduct.name.trim() || newProduct.price === undefined || newProduct.stock === undefined || !newProduct.category.trim()) {
      showTemporaryMessage("Por favor, preencha todos os campos obrigatórios (Nome, Preço, Estoque, Categoria).", "error");
      return;
    }
    const { name, price, costPrice, stock, category, minStock } = newProduct;

    if (isNaN(price) || price <= 0) {
      showTemporaryMessage("Preço de Venda deve ser um número positivo.", "error");
      return;
    }
    if (isNaN(costPrice) || costPrice < 0) {
      showTemporaryMessage("Preço de Custo deve ser um número positivo ou zero.", "error");
      return;
    }
    if (isNaN(stock) || stock < 0) {
      showTemporaryMessage("Estoque deve ser um número inteiro não negativo.", "error");
      return;
    }
    if (isNaN(minStock) || minStock < 0) {
      showTemporaryMessage("Estoque Mínimo deve ser um número inteiro não negativo.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const productData: Omit<Product, 'id'> = {
        name: name.trim(),
        price,
        costPrice,
        stock,
        category: category.trim(),
        minStock,
        lastUpdated: new Date().toISOString()
      };

      if (editingProduct) {
        const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, editingProduct.id!);
        await updateDoc(productRef, productData as DocumentData);
        showTemporaryMessage("Produto atualizado com sucesso!");
      } else {
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/products`), productData as DocumentData);
        showTemporaryMessage("Produto adicionado com sucesso!");
      }
      setNewProduct({ name: '', price: 0, costPrice: 0, stock: 0, category: '', minStock: 5 });
      setEditingProduct(null);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      showTemporaryMessage("Erro ao salvar produto.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingProduct = (product: Product) => {
    setNewProduct(product);
    setEditingProduct(product);
  };

  const cancelEditing = () => {
    setNewProduct({ name: '', price: 0, costPrice: 0, stock: 0, category: '', minStock: 5 });
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!db || !userId) return;
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/products`, productId));
      showTemporaryMessage("Produto removido com sucesso!");
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      showTemporaryMessage("Erro ao remover produto.", "error");
    }
  };

  const startAdjustingStock = (product: Product) => {
    setAdjustingProduct(product);
    setStockAdjustmentQuantity('');
    setStockAdjustmentType('entrada');
    setStockAdjustmentReason('');
    setShowAdjustStockModal(true);
  };

  const handleStockAdjustment = async () => {
    if (isAdjusting || !db || !userId || !adjustingProduct) return;

    const quantityNum = parseInt(stockAdjustmentQuantity, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      showTemporaryMessage("Quantidade de ajuste inválida.", "error");
      return;
    }
    if (!stockAdjustmentReason.trim()) {
      showTemporaryMessage("Por favor, informe o motivo do ajuste.", "error");
      return;
    }

    const newStock = (adjustingProduct.stock) + (stockAdjustmentType === 'entrada' ? quantityNum : -quantityNum);

    if (newStock < 0) {
      showTemporaryMessage("Estoque não pode ser negativo após o ajuste.", "error");
      return;
    }
    
    setIsAdjusting(true);
    try {
      const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, adjustingProduct.id!);
      await updateDoc(productRef, { stock: newStock });

      const stockMovementData = {
        productId: adjustingProduct.id!,
        productName: adjustingProduct.name,
        type: stockAdjustmentType === 'entrada' ? 'Ajuste de Entrada' : 'Ajuste de Saída',
        quantity: quantityNum,
        reason: stockAdjustmentReason.trim(),
        timestamp: new Date().toISOString(),
        userId: userId!
      };
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/stock_movements`), stockMovementData as DocumentData);

      showTemporaryMessage("Estoque ajustado com sucesso!");
      setShowAdjustStockModal(false);
    } catch (error) {
      console.error("Erro ao ajustar estoque:", error);
      showTemporaryMessage("Erro ao ajustar estoque.", "error");
    } finally {
      setIsAdjusting(false);
    }
  };

  const openHistoryModal = (product: Product) => {
    setSelectedProductForHistory(product);
    setShowHistoryModal(true);
  };

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Gerenciar Produtos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-green-800 mb-4">
            {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
          </h3>
          <div className="space-y-4">
            <label htmlFor="productName" className="block text-gray-700 text-sm font-semibold mb-1">Nome do Produto:</label>
            <input
              type="text"
              id="productName"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <label htmlFor="productPrice" className="block text-gray-700 text-sm font-semibold mb-1">Preço de Venda (R$):</label>
            <input
              type="number"
              id="productPrice"
              value={newProduct.price || ''}
              onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <label htmlFor="productCostPrice" className="block text-gray-700 text-sm font-semibold mb-1">Preço de Custo (R$ - opcional):</label>
            <input
              type="number"
              id="productCostPrice"
              value={newProduct.costPrice || ''}
              onChange={(e) => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) || 0 })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <label htmlFor="productStock" className="block text-gray-700 text-sm font-semibold mb-1">Estoque Atual:</label>
            <input
              type="number"
              id="productStock"
              value={newProduct.stock || ''}
              onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value, 10) || 0 })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <label htmlFor="productMinStock" className="block text-gray-700 text-sm font-semibold mb-1">Estoque Mínimo (Alerta):</label>
            <input
              type="number"
              id="productMinStock"
              value={newProduct.minStock || ''}
              onChange={(e) => setNewProduct({ ...newProduct, minStock: parseInt(e.target.value, 10) || 0 })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <label htmlFor="productCategory" className="block text-gray-700 text-sm font-semibold mb-1">Categoria:</label>
            <input
              type="text"
              id="productCategory"
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              onClick={handleAddUpdateProduct}
              className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-600 flex items-center justify-center disabled:bg-green-400"
              disabled={isSaving}
            >
              {isSaving && <Spinner />}
              {isSaving ? 'A guardar...' : (editingProduct ? 'Atualizar Produto' : 'Adicionar Produto')}
            </button>
            {editingProduct && (
              <button onClick={cancelEditing} className="w-full mt-2 bg-gray-400 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-500">
                Cancelar Edição
              </button>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-blue-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-blue-800 mb-4">
            Lista de Produtos ({products.length})
          </h3>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {products.map((product) => (
              <li key={product.id} className="bg-white p-4 rounded-lg shadow-sm list-none mb-3 flex justify-between items-center">
                <div>
                  <p className="font-bold">{product.name}</p>
                  <p className="text-sm text-gray-600">Preço: R$ {product.price.toFixed(2)} | Custo: R$ {product.costPrice.toFixed(2)}</p>
                  <p className={`text-sm font-semibold ${product.stock <= product.minStock ? 'text-red-500' : 'text-gray-600'}`}>Estoque: {product.stock}</p>
                </div>
                <div className="flex gap-2 mt-3 sm:mt-0 flex-wrap">
                  <button onClick={() => openHistoryModal(product)} className="bg-gray-400 text-white p-2 rounded-md hover:bg-gray-500" title="Histórico do Produto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                  </button>
                  <button onClick={() => startAdjustingStock(product)} className="bg-purple-500 text-white p-2 rounded-md hover:bg-purple-600" title="Ajustar Estoque">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4zm6 0H7v9.05L10 12l3 1.05V4h-2z" /></svg>
                  </button>
                  <button onClick={() => startEditingProduct(product)} className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-5.657 5.657l2.828 2.828-5.657 5.657H3v-2.828l5.657-5.657z" /></svg>
                  </button>
                  <button onClick={() => confirmAction(() => handleDeleteProduct(product.id!), { id: product.id! })} className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600" title="Remover">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </div>
        </div>
      </div>

      {showHistoryModal && selectedProductForHistory && (
        <ProductHistoryModal 
          productId={selectedProductForHistory.id!}
          productName={selectedProductForHistory.name}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
      
      {showAdjustStockModal && adjustingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Ajustar Estoque de {adjustingProduct.name}</h3>
            <div className="space-y-4">
              <p>Estoque Atual: <span className="font-semibold">{adjustingProduct.stock}</span></p>
              <div>
                <label htmlFor="stockAdjustmentType" className="block text-sm font-semibold mb-2">Tipo de Ajuste:</label>
                <select id="stockAdjustmentType" value={stockAdjustmentType} onChange={(e) => setStockAdjustmentType(e.target.value)} className="w-full p-3 border rounded-md">
                  <option value="entrada">Entrada (Aumento)</option>
                  <option value="saida">Saída (Redução)</option>
                </select>
              </div>
              <div>
                <label htmlFor="stockAdjustmentQuantity" className="block text-sm font-semibold mb-2">Quantidade:</label>
                <input type="number" id="stockAdjustmentQuantity" value={stockAdjustmentQuantity} onChange={(e) => setStockAdjustmentQuantity(e.target.value)} className="w-full p-3 border rounded-md"/>
              </div>
              <div>
                <label htmlFor="stockAdjustmentReason" className="block text-sm font-semibold mb-2">Motivo:</label>
                <textarea id="stockAdjustmentReason" value={stockAdjustmentReason} onChange={(e) => setStockAdjustmentReason(e.target.value)} rows={3} className="w-full p-3 border rounded-md"></textarea>
              </div>
              <div className="flex justify-end gap-4">
                <button onClick={handleStockAdjustment} disabled={isAdjusting} className="bg-purple-500 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center disabled:bg-purple-400">
                  {isAdjusting && <Spinner />}
                  {isAdjusting ? 'Ajustando...' : 'Confirmar Ajuste'}
                </button>
                <button onClick={() => setShowAdjustStockModal(false)} className="bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
