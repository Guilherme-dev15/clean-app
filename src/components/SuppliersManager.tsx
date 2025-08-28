// src/components/SuppliersManager.tsx
import { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, DocumentData, addDoc, query, orderBy } from 'firebase/firestore';
import { Supplier, PurchaseOrder, PurchaseOrderItem, Product, StockMovement } from '../types';

export default function SuppliersManager() {
  const { db, userId, appId, showTemporaryMessage, confirmAction, products, suppliers } = useApp();

  // Estados para gerir fornecedores
  const [newSupplier, setNewSupplier] = useState<Omit<Supplier, 'id'>>({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: '' });
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Estados para gerir ordens de compra
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [selectedSupplierForPO, setSelectedSupplierForPO] = useState<Supplier | null>(null);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [poNotes, setPoNotes] = useState('');

  // Carregar Ordens de Compra em tempo real
  useEffect(() => {
    if (!db || !userId) return;
    const poCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/purchase_orders`);
    const q = query(poCollectionRef, orderBy('orderDate', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
      setPurchaseOrders(ordersData);
    }, (error) => {
      console.error("Erro ao carregar ordens de compra:", error);
      showTemporaryMessage("Erro ao carregar histórico de compras.", "error");
    });

    return () => unsubscribe();
  }, [db, userId, appId, showTemporaryMessage]);


  const handleAddOrUpdateSupplier = async () => {
    if (!db || !userId || !newSupplier.name.trim()) {
      showTemporaryMessage("O nome do fornecedor é obrigatório.", "error");
      return;
    }

    try {
      const supplierData = {
          name: newSupplier.name.trim(),
          contactPerson: newSupplier.contactPerson?.trim() || '',
          phone: newSupplier.phone?.trim() || '',
          email: newSupplier.email?.trim() || '',
          address: newSupplier.address?.trim() || '',
          paymentTerms: newSupplier.paymentTerms?.trim() || ''
      };

      if (editingSupplier) {
        const supplierRef = doc(db, `artifacts/${appId}/users/${userId}/suppliers`, editingSupplier.id!);
        await updateDoc(supplierRef, supplierData as DocumentData);
        showTemporaryMessage("Fornecedor atualizado com sucesso!");
      } else {
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/suppliers`), supplierData as DocumentData);
        showTemporaryMessage("Fornecedor adicionado com sucesso!");
      }
      setNewSupplier({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: '' });
      setEditingSupplier(null);
    } catch (error) {
      console.error("Erro ao guardar fornecedor:", error);
      showTemporaryMessage("Erro ao guardar fornecedor.", "error");
    }
  };

  const startEditing = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier({ ...supplier });
  };
  
  const cancelEditing = () => {
    setEditingSupplier(null);
    setNewSupplier({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: '' });
  };

  const handleDeleteSupplier = async (supplierId: string) => {
      if (!db || !userId) return;
      try {
          await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/suppliers`, supplierId));
          showTemporaryMessage("Fornecedor removido com sucesso!");
      } catch (error) {
          console.error("Erro ao remover fornecedor:", error);
          showTemporaryMessage("Erro ao remover fornecedor.", "error");
      }
  };


  const openPurchaseOrderModal = (supplier: Supplier) => {
    setSelectedSupplierForPO(supplier);
    setShowPurchaseOrderModal(true);
    setPurchaseOrderItems([]);
    setPoNotes('');
  };

  const handleAddItemToPO = (product: Product) => {
    const existingItem = purchaseOrderItems.find(item => item.productId === product.id);
    if (existingItem) {
      setPurchaseOrderItems(purchaseOrderItems.map(item => 
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setPurchaseOrderItems([...purchaseOrderItems, {
        productId: product.id!,
        productName: product.name,
        quantity: 1,
        costPrice: product.costPrice || 0
      }]);
    }
  };

  const handleCreatePurchaseOrder = async () => {
      if (!db || !userId || !selectedSupplierForPO || purchaseOrderItems.length === 0) {
          showTemporaryMessage("Selecione um fornecedor e adicione pelo menos um item.", "error");
          return;
      }

      const totalAmount = purchaseOrderItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

      const purchaseOrderData: Omit<PurchaseOrder, 'id'> = {
          supplierId: selectedSupplierForPO.id!,
          supplierName: selectedSupplierForPO.name,
          items: purchaseOrderItems,
          totalAmount,
          status: 'Pendente',
          orderDate: new Date().toISOString(),
          notes: poNotes
      };

      try {
          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/purchase_orders`), purchaseOrderData as DocumentData);
          showTemporaryMessage("Ordem de compra criada com sucesso!");
          setShowPurchaseOrderModal(false);
      } catch (error) {
          console.error("Erro ao criar ordem de compra:", error);
          showTemporaryMessage("Erro ao criar ordem de compra.", "error");
      }
  };
  
  const handleReceivePurchaseOrder = async (po: PurchaseOrder) => {
      if (!db || !userId) return;

      const batch = writeBatch(db);

      const poRef = doc(db, `artifacts/${appId}/users/${userId}/purchase_orders`, po.id!);
      batch.update(poRef, { status: 'Recebida', receivedDate: new Date().toISOString() });

      for (const item of po.items) {
          const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId);
          const product = products.find(p => p.id === item.productId);
          if (product) {
              const newStock = product.stock + item.quantity;
              batch.update(productRef, { stock: newStock });

              const stockMovementData: Omit<StockMovement, 'id'> = {
                  productId: item.productId,
                  productName: item.productName,
                  type: 'Compra',
                  quantity: item.quantity,
                  reason: `Recebimento da Compra ID: ${po.id}`,
                  timestamp: new Date().toISOString(),
                  userId: userId
              };
              const stockMovementRef = doc(collection(db, `artifacts/${appId}/users/${userId}/stock_movements`));
              batch.set(stockMovementRef, stockMovementData as DocumentData);
          }
      }

      try {
          await batch.commit();
          showTemporaryMessage("Compra recebida e stock atualizado!");
      } catch (error) {
          console.error("Erro ao receber compra:", error);
          showTemporaryMessage("Erro ao receber compra.", "error");
      }
  };


  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Gestão de Fornecedores e Compras
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg shadow-inner">
           <h3 className="text-2xl font-semibold text-green-800 mb-4">{editingSupplier ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}</h3>
           <div className="space-y-4">
              <input type="text" placeholder="Nome do Fornecedor" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="w-full p-2 border rounded"/>
              <input type="text" placeholder="Pessoa de Contato" value={newSupplier.contactPerson} onChange={e => setNewSupplier({...newSupplier, contactPerson: e.target.value})} className="w-full p-2 border rounded"/>
              <input type="tel" placeholder="Telefone" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} className="w-full p-2 border rounded"/>
              <input type="email" placeholder="Email" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} className="w-full p-2 border rounded"/>
              <textarea placeholder="Endereço" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} className="w-full p-2 border rounded" rows={2}></textarea>
              <input type="text" placeholder="Condições de Pagamento" value={newSupplier.paymentTerms} onChange={e => setNewSupplier({...newSupplier, paymentTerms: e.target.value})} className="w-full p-2 border rounded"/>
              <button onClick={handleAddOrUpdateSupplier} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">
                {editingSupplier ? 'Atualizar' : 'Adicionar'}
              </button>
              {editingSupplier && <button onClick={cancelEditing} className="w-full bg-gray-400 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">Cancelar</button>}
           </div>
        </div>
        <div className="md:col-span-2 bg-blue-50 p-6 rounded-lg shadow-inner">
           <h3 className="text-2xl font-semibold text-blue-800 mb-4">Fornecedores ({suppliers.length})</h3>
           <div className="max-h-96 overflow-y-auto pr-2">
                {suppliers.length === 0 ? <p>Nenhum fornecedor registado.</p> : suppliers.map(supplier => (
                    <div key={supplier.id} className="bg-white p-4 rounded-lg shadow-sm mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <p className="font-bold text-gray-900">{supplier.name}</p>
                            <p className="text-sm text-gray-600">{supplier.contactPerson} - {supplier.phone}</p>
                        </div>
                        <div className="flex gap-2 mt-3 sm:mt-0">
                           <button onClick={() => openPurchaseOrderModal(supplier)} className="bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600 text-sm">Nova Compra</button>
                           <button onClick={() => startEditing(supplier)} className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600">Editar</button>
                           <button onClick={() => confirmAction(() => handleDeleteSupplier(supplier.id!), { id: supplier.id! })} className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600">Remover</button>
                        </div>
                    </div>
                ))}
           </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Histórico de Compras</h3>
          <div className="max-h-96 overflow-y-auto">
            {purchaseOrders.length === 0 ? <p>Nenhum histórico de compras.</p> : purchaseOrders.map(po => (
                <div key={po.id} className="bg-white p-4 rounded-lg shadow-sm mb-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold">{po.supplierName}</p>
                            <p className="text-sm text-gray-500">Data: {new Date(po.orderDate).toLocaleDateString()}</p>
                            <p className="text-sm font-semibold">Total: R$ {po.totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${po.status === 'Recebida' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{po.status}</span>
                            {po.status === 'Pendente' && (
                                <button onClick={() => confirmAction(() => handleReceivePurchaseOrder(po), {id: po.id!})} className="mt-2 bg-green-500 text-white text-xs font-bold py-1 px-3 rounded-lg hover:bg-green-600">Marcar como Recebida</button>
                            )}
                        </div>
                    </div>
                    <ul className="list-disc list-inside mt-2 ml-4 text-sm text-gray-600">
                        {po.items.map(item => <li key={item.productId}>{item.productName} (x{item.quantity})</li>)}
                    </ul>
                </div>
            ))}
          </div>
      </div>

      {showPurchaseOrderModal && selectedSupplierForPO && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full">
            <h3 className="text-2xl font-bold mb-4">Nova Ordem de Compra - {selectedSupplierForPO.name}</h3>
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold mb-2">Adicionar Produtos ao Pedido</h4>
                    <div className="max-h-64 overflow-y-auto border p-2 rounded-md">
                        {products.map(p => (
                            <div key={p.id} onClick={() => handleAddItemToPO(p)} className="p-2 hover:bg-gray-100 cursor-pointer rounded-md flex justify-between">
                                <span>{p.name}</span>
                                <span className="text-gray-500">R$ {p.costPrice.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Itens do Pedido</h4>
                    <div className="max-h-64 overflow-y-auto border p-2 rounded-md">
                        {purchaseOrderItems.length === 0 ? <p className="text-gray-500">Nenhum item adicionado.</p> : purchaseOrderItems.map(item => (
                            <div key={item.productId} className="flex justify-between items-center p-2">
                                <span>{item.productName} x {item.quantity}</span>
                                <span>R$ {(item.costPrice * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <p className="font-bold text-lg mt-2 text-right">Total: R$ {purchaseOrderItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0).toFixed(2)}</p>
                </div>
            </div>
            <div className="mt-4">
                <label htmlFor="poNotes" className="block text-sm font-medium text-gray-700">Notas Adicionais</label>
                <textarea id="poNotes" value={poNotes} onChange={e => setPoNotes(e.target.value)} rows={2} className="w-full mt-1 p-2 border rounded-md"></textarea>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={handleCreatePurchaseOrder} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg">Criar Ordem de Compra</button>
              <button onClick={() => setShowPurchaseOrderModal(false)} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
