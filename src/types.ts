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

export interface Supplier {
  id?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
}

export interface PurchaseOrder {
  id?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'Pendente' | 'Recebida' | 'Cancelada';
  orderDate: string;
  receivedDate?: string;
  notes?: string;
}

// CORREÇÃO: A interface CartItem agora apenas estende Product e adiciona a quantidade.
// A propriedade redundante 'product' foi removida.
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
  type: 'Venda' | 'Ajuste de Entrada' | 'Ajuste de Saída' | 'Compra';
  quantity: number;
  reason: string;
  timestamp: string;
  userId: string;
}
