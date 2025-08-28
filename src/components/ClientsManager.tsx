/* eslint-disable no-empty-pattern */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/ClientsManager.tsx
import { useState, useEffect, useCallback } from 'react';
// CORREÇÃO: O caminho de importação foi ajustado para garantir a resolução correta do módulo.
import { useApp } from './AppContext';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where, DocumentData, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore'; 
import { Client, Attachment, Sale } from '../types'; 

const ITEMS_PER_PAGE = 10; // Define quantos clientes mostrar por página

export default function ClientsManager() {
  // A lista de clientes foi removida daqui, pois este componente agora gere a sua própria paginação.
  const { db, userId, appId, showTemporaryMessage, confirmAction } = useApp();

  // O estado do formulário foi ajustado para Omit<Client, 'id' | 'debt'>
  // para corresponder aos campos que são editáveis pelo utilizador.
  const [newClient, setNewClient] = useState<Omit<Client, 'id' | 'debt'>>({ 
    name: '', 
    documentType: 'CPF', 
    documentNumber: '', 
    contactPhone: '', 
    contactEmail: '', 
    address: '', 
    invoicingNotes: [] 
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [] = useState<Attachment>({ url: '', description: '' });
  const [] = useState<Sale[]>([]);

  // Estados para a paginação
  const [paginatedClients, setPaginatedClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);

  // Função para buscar os clientes de forma paginada
  const fetchClients = useCallback(async (direction: 'next' | 'initial' = 'initial') => {
    if (!db || !userId) return;
    setIsLoading(true);

    const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/clients`);
    let q;

    if (direction === 'next' && lastVisible) {
      q = query(clientsCollectionRef, orderBy('name'), startAfter(lastVisible), limit(ITEMS_PER_PAGE));
    } else {
      q = query(clientsCollectionRef, orderBy('name'), limit(ITEMS_PER_PAGE));
    }

    const docSnapshot = await getDocs(q);
    const clientsData = docSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    
    setPaginatedClients(clientsData);
    setLastVisible(docSnapshot.docs[docSnapshot.docs.length - 1] || null);
    setIsLastPage(docSnapshot.docs.length < ITEMS_PER_PAGE);
    setIsLoading(false);
  }, [db, userId, appId, lastVisible]);

  useEffect(() => {
    fetchClients('initial');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNextPage = () => {
    if (!isLastPage) {
      setCurrentPage(prev => prev + 1);
      fetchClients('next');
    }
  };

  const handlePrevPage = () => {
    // Para simplificar, voltar para a primeira página.
    setCurrentPage(1);
    setLastVisible(null);
    fetchClients('initial');
  };

  const handleAddUpdateClient = async () => {
    if (!db || !userId || !newClient.name.trim() || !newClient.documentNumber.trim()) {
      showTemporaryMessage("Nome e Número de Documento são obrigatórios.", "error");
      return;
    }
    
    try {
      const clientData = { ...newClient, name: newClient.name.trim(), documentNumber: newClient.documentNumber.trim(), lastUpdated: new Date().toISOString() };
      
      if (editingClient) {
        const clientRef = doc(db, `artifacts/${appId}/users/${userId}/clients`, editingClient.id!);
        await updateDoc(clientRef, clientData as DocumentData);
        showTemporaryMessage("Cliente atualizado com sucesso!");
      } else {
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/clients`), where("documentNumber", "==", newClient.documentNumber.trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          showTemporaryMessage("Já existe um cliente com este número de documento.", "error");
          return;
        }
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/clients`), { ...clientData, userId: userId!, debt: 0 } as DocumentData);
        showTemporaryMessage("Cliente adicionado com sucesso!");
      }
      fetchClients('initial');
      setCurrentPage(1);
      setNewClient({ name: '', documentType: 'CPF', documentNumber: '', contactPhone: '', contactEmail: '', address: '', invoicingNotes: [] });
      setEditingClient(null);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      showTemporaryMessage("Erro ao salvar cliente.", "error");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!db || !userId) return;
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/clients`, clientId));
      showTemporaryMessage("Cliente removido com sucesso!");
      fetchClients('initial'); // Recarregar
      setCurrentPage(1);
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      showTemporaryMessage("Erro ao remover cliente.", "error");
    }
  };

  const startEditingClient = (client: Client) => {
    const { debt, id, ...clientFormData } = client; 
    setNewClient({ ...clientFormData, invoicingNotes: client.invoicingNotes || [] });
    setEditingClient(client);
  };
  
  const cancelEditing = () => {
    setEditingClient(null);
    setNewClient({ name: '', documentType: 'CPF', documentNumber: '', contactPhone: '', contactEmail: '', address: '', invoicingNotes: [] });
  }

  // ... (outras funções como handleAddAttachment, fetchClientSalesHistory, etc.)

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Gerenciar Clientes (CRM)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-green-800 mb-4">
            {editingClient ? 'Editar Cliente' : 'Adicionar Cliente'}
          </h3>
          <div className="space-y-4">
            <input type="text" placeholder="Nome do Cliente" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full p-2 border rounded"/>
            <select value={newClient.documentType} onChange={e => setNewClient({...newClient, documentType: e.target.value as 'CPF' | 'CNPJ'})} className="w-full p-2 border rounded">
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </select>
            <input type="text" placeholder="Número do Documento" value={newClient.documentNumber} onChange={e => setNewClient({...newClient, documentNumber: e.target.value})} className="w-full p-2 border rounded"/>
            <input type="tel" placeholder="Telefone" value={newClient.contactPhone} onChange={e => setNewClient({...newClient, contactPhone: e.target.value})} className="w-full p-2 border rounded"/>
            <input type="email" placeholder="Email" value={newClient.contactEmail} onChange={e => setNewClient({...newClient, contactEmail: e.target.value})} className="w-full p-2 border rounded"/>
            <textarea placeholder="Endereço" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} className="w-full p-2 border rounded" rows={2}></textarea>
            <button onClick={handleAddUpdateClient} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">
              {editingClient ? 'Atualizar' : 'Adicionar'}
            </button>
            {editingClient && <button onClick={cancelEditing} className="w-full bg-gray-400 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">Cancelar</button>}
          </div>
        </div>

        <div className="md:col-span-2 bg-blue-50 p-6 rounded-lg shadow-inner flex flex-col">
          <h3 className="text-2xl font-semibold text-blue-800 mb-4">
            Lista de Clientes
          </h3>
          <div className="flex-grow min-h-[400px]">
            {isLoading ? (
              <p>A carregar clientes...</p>
            ) : (
              <ul className="space-y-3">
                {paginatedClients.map((client: Client) => (
                  <li key={client.id} className="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center list-none">
                    <div>
                      <p className="font-bold text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">
                        {client.documentType}: {client.documentNumber}
                      </p>
                       <p className="text-sm font-bold text-red-600">Dívida: R$ {client.debt?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0">
                      <button onClick={() => startEditingClient(client)} className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600">Editar</button>
                      <button onClick={() => confirmAction(() => handleDeleteClient(client.id!), { id: client.id! })} className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600">Remover</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-between items-center mt-4">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded disabled:opacity-50">
              Anterior
            </button>
            <span>Página {currentPage}</span>
            <button onClick={handleNextPage} disabled={isLastPage || isLoading} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded disabled:opacity-50">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
