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

// NOVO: Interface para Fornecedores
export interface Supplier {
  id?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string; // Ex: "30 dias", "À vista"
}

// NOVO: Interface para Itens de uma Ordem de Compra
export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number; // Custo por unidade na compra
}

// NOVO: Interface para Ordens de Compra
export interface PurchaseOrder {
  id?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'Pendente' | 'Recebida' | 'Cancelada';
  orderDate: string; // Data do pedido
  receivedDate?: string; // Data de recebimento
  notes?: string;
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
  type: 'Venda' | 'Ajuste de Entrada' | 'Ajuste de Saída' | 'Compra'; // Adicionado 'Compra'
  quantity: number;
  reason: string;
  timestamp: string;
  userId: string;
}
