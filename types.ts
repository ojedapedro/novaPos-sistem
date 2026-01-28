// Enums
export enum SaleType {
  CONTADO = 'Contado',
  CREDITO = 'Crédito'
}

export enum PaymentMethod {
  EFECTIVO_BS = 'Efectivo Bs',
  EFECTIVO_USD = 'Efectivo $',
  EFECTIVO_EUR = 'Efectivo €',
  PAGO_MOVIL = 'Pago Móvil',
  TRANSFERENCIA = 'Transferencia',
  ZELLE = 'Zelle',
  CASHEA = 'Cashea',
  ZONA_NARANJA = 'Zona Naranja',
  WEPA = 'Wepa'
}

export enum TransactionType {
  INGRESO = 'Ingreso',
  EGRESO = 'Egreso'
}

export enum TransactionOrigin {
  VENTA = 'Venta',
  COMPRA = 'Compra',
  AJUSTE = 'Ajuste'
}

export enum SaleStatus {
  PAGADA = 'Pagada',
  PARCIAL = 'Parcial',
  PENDIENTE = 'Pendiente'
}

// Entities
export interface Product {
  id: string;
  name: string;
  category: string;
  priceBuy: number;
  priceSell: number;
  stock: number;
  minStock: number;
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  type: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  paymentType: 'Contado' | 'Crédito';
}

export interface SaleHeader {
  id: string;
  date: string; // ISO String
  clientId: string;
  type: SaleType;
  total: number;
  currencyBase: string;
  status: SaleStatus;
}

export interface SaleDetail {
  saleId: string;
  productId: string;
  quantity: number;
  priceUnit: number;
  subtotal: number;
}

export interface PurchaseHeader {
  id: string;
  date: string;
  supplierId: string;
  total: number;
  currency: string;
  reference: string;
  status: string; // 'Completada'
}

export interface PurchaseDetail {
  purchaseId: string;
  productId: string;
  quantity: number;
  costUnit: number;
  subtotal: number;
}

export interface CashMovement {
  id: string;
  date: string;
  type: TransactionType;
  origin: TransactionOrigin;
  method: PaymentMethod;
  amount: number;
  currency: string;
  reference?: string;
  supplierId?: string; // Optional link to specific supplier
}

// App State Helpers
export interface CartItem extends Product {
  quantity: number;
}

export interface PurchaseItem extends Product {
  quantity: number;
  newCost: number; // To update priceBuy
}

export interface ExchangeRate {
  usdToBs: number;
  eurToBs: number;
}