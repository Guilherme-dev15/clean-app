// src/components/AppContext.ts
import { createContext, useContext } from 'react';
import type { Firestore } from 'firebase/firestore';
import { Product, Client } from '../types';

type ModalAction = ((id: string, amount?: number) => Promise<void> | void) | null;
type ModalData = { id: string; amount?: number } | null;








export interface AppContextType {
  db: Firestore | null;
  userId: string | null;
  appId: string;
  showTemporaryMessage: (msg: string, type?: string) => void;
  confirmAction: (action: ModalAction, data: ModalData) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  modalAction: ModalAction;
  modalData: ModalData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  products: Product[];
  clients: Client[];
  message: { text: string; type: string } | null;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppLayout');
  }
  return context;
};