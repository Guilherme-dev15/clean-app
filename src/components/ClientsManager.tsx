// src/components/ClientsManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../components/AppContext';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where, DocumentData } from 'firebase/firestore'; 
import { Client, Attachment, Sale, SaleItem } from '../types'; 

export default function ClientsManager() {
  const { db, userId, appId, showTemporaryMessage, confirmAction, clients } = useApp();

  const [newClient, setNewClient] = useState<Client>({ name: '', documentType: 'CPF', documentNumber: '', contactPhone: '', contactEmail: '', address: '', invoicingNotes: [] });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newAttachment, setNewAttachment] = useState<Attachment>({ url: '', description: '' });
  const [clientSalesHistory, setClientSalesHistory] = useState<Sale[]>([]);

  const handleAddUpdateClient = async () => {
    if (!db || !userId || !newClient.name.trim() || !newClient.documentNumber.trim()) {
      showTemporaryMessage("Nome e Número de Documento são obrigatórios para o cliente.", "error");
      return;
    }
    
    try {
      const clientData: Client = { ...newClient, name: newClient.name.trim(), documentNumber: newClient.documentNumber.trim(), lastUpdated: new Date().toISOString() };
      
      if (editingClient) {
        const clientRef = doc(db, `artifacts/${appId}/users/${userId}/clients`, editingClient.id!);
        await updateDoc(clientRef, clientData as DocumentData);
        showTemporaryMessage("Cliente atualizado com sucesso!");
      } else {
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/clients`), where("documentType", "==", newClient.documentType), where("documentNumber", "==", newClient.documentNumber.trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          showTemporaryMessage("Já existe um cliente com este tipo e número de documento.", "error");
          return;
        }
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/clients`), { ...clientData, userId: userId! } as DocumentData);
        showTemporaryMessage("Cliente adicionado com sucesso!");
      }

      setNewClient({ name: '', documentType: 'CPF', documentNumber: '', contactPhone: '', contactEmail: '', address: '', invoicingNotes: [] });
      setNewAttachment({ url: '', description: '' });
      setEditingClient(null);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      showTemporaryMessage("Erro ao salvar cliente.", "error");
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachment.description.trim()) {
      showTemporaryMessage("A descrição do anexo é obrigatória.", "error");
      return;
    }
    setNewClient(prev => ({ ...prev, invoicingNotes: [...prev.invoicingNotes, { ...newAttachment }] }));
    setNewAttachment({ url: '', description: '' });
  };
  
  const handleRemoveAttachment = (indexToRemove: number) => {
    setNewClient(prev => ({ ...prev, invoicingNotes: prev.invoicingNotes.filter((_, index) => index !== indexToRemove) }));
  };

  const startEditingClient = (client: Client) => {
    setNewClient({ ...client, invoicingNotes: client.invoicingNotes || [] });
    setNewAttachment({ url: '', description: '' });
    setEditingClient(client);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!db || !userId) {
      showTemporaryMessage("Erro: Firebase não inicializado.", "error");
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/clients`, clientId));
      showTemporaryMessage("Cliente removido com sucesso!");
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      showTemporaryMessage("Erro ao remover cliente.", "error");
    }
  };

  const fetchClientSalesHistory = useCallback(async (clientId: string) => {
    if (!db || !userId || !clientId) {
      setClientSalesHistory([]);
      return;
    }
    try {
      const salesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sales`);
      const q = query(salesCollectionRef, where("clientId", "==", clientId));
      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Sale }));
      setClientSalesHistory(history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error("Erro ao carregar histórico de vendas do cliente:", error);
      showTemporaryMessage("Erro ao carregar histórico de vendas do cliente.", "error");
      setClientSalesHistory([]);
    }
  }, [db, userId, appId, showTemporaryMessage]);

  useEffect(() => {
    if (editingClient) {
      fetchClientSalesHistory(editingClient.id!);
    } else {
      setClientSalesHistory([]);
    }
  }, [editingClient, fetchClientSalesHistory]);

  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
        Gerenciar Clientes (CRM)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 p-6 rounded-lg shadow-inner col-span-1 lg:col-span-1">
          <h3 className="text-2xl font-semibold text-green-800 mb-4">
            {editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
          </h3>
          <div className="space-y-4">
            <label htmlFor="clientName" className="block text-gray-700 text-sm font-semibold mb-1">Nome do Cliente/Empresa:</label>
            <input
              type="text"
              id="clientName"
              value={newClient.name || ''}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Nome do cliente ou empresa"
            />
            <label htmlFor="documentType" className="block text-gray-700 text-sm font-semibold mb-1">Tipo de Documento:</label>
            <select
              id="documentType"
              value={newClient.documentType}
              onChange={(e) => setNewClient({ ...newClient, documentType: e.target.value as 'CPF' | 'CNPJ' })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Tipo de documento"
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </select>
            <label htmlFor="documentNumber" className="block text-gray-700 text-sm font-semibold mb-1">Número do Documento:</label>
            <input
              type="text"
              id="documentNumber"
              value={newClient.documentNumber || ''} // Corrected: provide fallback value
              onChange={(e) => setNewClient({ ...newClient, documentNumber: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Número do documento"
            />
            <label htmlFor="contactPhone" className="block text-gray-700 text-sm font-semibold mb-1">Telefone de Contato:</label>
            <input
              type="text"
              id="contactPhone"
              value={newClient.contactPhone || ''} // Corrected: provide fallback value
              onChange={(e) => setNewClient({ ...newClient, contactPhone: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Telefone de contato"
            />
            <label htmlFor="contactEmail" className="block text-gray-700 text-sm font-semibold mb-1">Email de Contato:</label>
            <input
              type="email"
              id="contactEmail"
              value={newClient.contactEmail || ''} // Corrected: provide fallback value
              onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Email de contato"
            />
            <label htmlFor="clientAddress" className="block text-gray-700 text-sm font-semibold mb-1">Endereço Completo:</label>
            <textarea
              id="clientAddress"
              value={newClient.address || ''} // Corrected: provide fallback value
              onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Endereço completo do cliente"
            ></textarea>

            <div className="border p-4 rounded-md bg-gray-50">
              <h4 className="font-semibold mb-2 text-gray-700">Anexos de Faturamento (Links/Notas)</h4>
              <label htmlFor="attachmentDescription" className="block text-gray-700 text-sm font-semibold mb-1">Descrição do Anexo:</label>
              <input
                type="text"
                id="attachmentDescription"
                value={newAttachment.description}
                onChange={(e) => setNewAttachment({ ...newAttachment, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Descrição do anexo"
              />
              <label htmlFor="attachmentUrl" className="block text-gray-700 text-sm font-semibold mb-1">URL do Anexo (Opcional):</label>
              <input
                type="url"
                id="attachmentUrl"
                value={newAttachment.url}
                onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="URL do anexo (opcional)"
              />
              <button
                onClick={handleAddAttachment}
                className="w-full bg-indigo-400 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-500 transition duration-200"
                aria-label="Adicionar anexo"
              >
                Adicionar Anexo
              </button>
              <ul className="mt-3 space-y-1 text-sm">
                {newClient.invoicingNotes.map((note: Attachment, index: number) => (
                  <li key={index} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm">
                    {note.url ? (
                      <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {note.description}
                      </a>
                    ) : (
                      <span>{note.description}</span>
                    )}
                    <button
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                      title="Remover Anexo"
                      aria-label={`Remover anexo ${note.description}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleAddUpdateClient}
              className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
            >
              {editingClient ? 'Atualizar Cliente' : 'Adicionar Cliente'}
            </button>
            {editingClient && (
              <button
                onClick={() => {
                  setNewClient({ name: '', documentType: 'CPF', documentNumber: '', contactPhone: '', contactEmail: '', address: '', invoicingNotes: [] });
                  setNewAttachment({ url: '', description: '' });
                  setEditingClient(null);
                }}
                className="w-full mt-2 bg-gray-400 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-500 transition duration-300 ease-in-out transform hover:scale-105"
              >
                Cancelar Edição
              </button>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-blue-50 p-6 rounded-lg shadow-inner flex flex-col">
          <h3 className="text-2xl font-semibold text-blue-800 mb-4">
            Lista de Clientes ({clients.length})
          </h3>
          <div className="flex-grow max-h-96 overflow-y-auto pr-2 mb-4">
            {clients.length === 0 ? (
              <p className="text-gray-600">Nenhum cliente cadastrado ainda.</p>
            ) : (
              <ul className="space-y-3">
                {clients.map((client: Client) => (
                  <li key={client.id} className="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <p className="font-bold text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">
                        {client.documentType}: {client.documentNumber}
                        {client.contactPhone && ` | Tel: ${client.contactPhone}`}
                        {client.contactEmail && ` | Email: ${client.contactEmail}`}
                      </p>
                      {client.address && <p className="text-xs text-gray-500">End: {client.address}</p>}
                      {client.invoicingNotes && client.invoicingNotes.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs font-semibold text-gray-700">Anexos:</p>
                          <ul className="list-disc list-inside text-xs text-gray-500">
                            {client.invoicingNotes.map((note: Attachment, idx: number) => (
                              <li key={idx}>{note.url ? (<a href={note.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{note.description}</a>) : (<span>{note.description}</span>)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0">
                      <button
                        onClick={() => startEditingClient(client)}
                        className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-200"
                        title="Editar"
                        aria-label={`Editar cliente ${client.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-5.657 5.657l2.828 2.828-5.657 5.657H3v-2.828l5.657-5.657z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => confirmAction(handleDeleteClient, { id: client.id! })}

                        className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition duration-200"
                        title="Remover"
                        aria-label={`Remover cliente ${client.name}`}
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
          {editingClient && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-xl font-semibold text-blue-800 mb-3">
                Histórico de Vendas de {editingClient.name}
              </h4>
              <div className="max-h-48 overflow-y-auto pr-2">
                {clientSalesHistory.length === 0 ? (
                  <p className="text-gray-600 text-sm">Nenhuma venda registrada para este cliente ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {clientSalesHistory.map(sale => (
                      <li key={sale.id} className="bg-gray-100 p-3 rounded-md text-sm">
                        <p className="font-semibold">Venda: R$ {sale.total.toFixed(2)} ({sale.paymentMethod})</p>
                        <p className="text-xs text-gray-600">Data: {new Date(sale.timestamp).toLocaleDateString()} {new Date(sale.timestamp).toLocaleTimeString()}</p>
                        <ul className="list-disc list-inside mt-1 ml-2 text-gray-500">
                          {sale.items.map((item: SaleItem, idx: number) => (
                            <li key={idx}>{item.name} (x{item.quantity}) - R$ {item.price.toFixed(2)} cada</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}