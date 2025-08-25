// src/components/AppLayout.tsx
import { useState, useCallback, useEffect, ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '../hooks/useFirebase';
import { AppContext, AppContextType } from './AppContext';
import Header from './Header';
import Message from './Message';
import Modal from './common/Modal';
import LoadingSpinner from './common/LoadingSpinner';
import { Product, Client, Supplier } from '../types';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { userId, loading: loadingFirebase, db } = useFirebase();
  const appId = "clean-app-665c4";
  // NOVO: Definir 'dashboard' como o ecrã inicial
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [message, setMessage] = useState<{ text: string; type: string } | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalAction, setModalAction] = useState<AppContextType['modalAction']>(null);
  const [modalData, setModalData] = useState<AppContextType['modalData']>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const showTemporaryMessage = useCallback((msg: string, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const confirmAction = useCallback((action: AppContextType['modalAction'], data: AppContextType['modalData']) => {
    setModalAction(() => action);
    setModalData(data);
    setShowModal(true);
  }, []);

  useEffect(() => {
    if (!db || !userId) return;

    const productsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/products`);
    const unsubscribeProducts = onSnapshot(productsCollectionRef, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Product }));
      setProducts(productsData);
    });

    const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/clients`);
    const unsubscribeClients = onSnapshot(clientsCollectionRef, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Client }));
      setClients(clientsData);
    });
    
    const suppliersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/suppliers`);
    const unsubscribeSuppliers = onSnapshot(suppliersCollectionRef, (snapshot) => {
        const suppliersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Supplier }));
        setSuppliers(suppliersData);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeClients();
      unsubscribeSuppliers();
    };
  }, [db, userId, appId]);

  // Restante do ficheiro AppLayout.tsx permanece igual...

  const handleModalConfirm = () => {
    if (modalAction && modalData) {
      if (modalData.amount !== undefined) {
        (modalAction as (id: string, amount: number) => void)(modalData.id, modalData.amount);
      } else {
        (modalAction as (id: string) => void)(modalData.id);
      }
    }
    setShowModal(false);
  };

  const value: AppContextType = {
    db,
    userId,
    appId,
    showTemporaryMessage,
    confirmAction,
    showModal,
    setShowModal,
    modalAction,
    modalData,
    activeTab,
    setActiveTab,
    products,
    clients,
    suppliers,
    message: message,
  };

  return (
    <AppContext.Provider value={value}>
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex flex-col p-4 font-sans antialiased">
        <Header />
        {message && <Message text={message.text} type={message.type} />}
        <main className="flex-grow bg-white shadow-xl rounded-xl p-6">
          {loadingFirebase ? <LoadingSpinner /> : children}
        </main>
        <Modal
          show={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleModalConfirm}
          message="Tem certeza que deseja prosseguir com esta ação?"
        />
      </div>
    </AppContext.Provider>
  );
}
