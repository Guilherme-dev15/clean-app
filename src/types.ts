// src/types.ts

export interface Product {
  id?: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  category: string;
  lastUpdated?: string;
}

export interface Expense {
  id?: string;
  description: string;
  amount: number;
  timestamp?: string;
}

export interface Attachment {
  url: string;
  description: string;
}

export interface Client {
  debt: number;
  id?: string;
  name: string;
  documentType: 'CPF' | 'CNPJ';
  documentNumber: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  invoicingNotes: Attachment[];
  lastUpdated?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
}

export interface Sale {
  id?: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  userId: string;
  clientId: string | null;
}

export interface StockMovement {
  id?: string;
  productId: string;
  productName: string;
  type: 'Venda' | 'Ajuste de Entrada' | 'Ajuste de Saída';
  quantity: number;
  reason: string;
  timestamp: string;
  userId: string;
}