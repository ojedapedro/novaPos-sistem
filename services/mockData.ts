import { Product, Client, SaleHeader, SaleDetail, CashMovement, SaleType, SaleStatus, TransactionType, TransactionOrigin, PaymentMethod, Supplier, PurchaseHeader, PurchaseDetail } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'P001', name: 'Harina de Maíz 1kg', category: 'Alimentos', priceBuy: 0.8, priceSell: 1.2, stock: 150, minStock: 20, active: true },
  { id: 'P002', name: 'Arroz Premium 1kg', category: 'Alimentos', priceBuy: 0.9, priceSell: 1.3, stock: 80, minStock: 15, active: true },
  { id: 'P003', name: 'Aceite Vegetal 1L', category: 'Alimentos', priceBuy: 2.5, priceSell: 3.5, stock: 45, minStock: 10, active: true },
  { id: 'P004', name: 'Refresco Cola 2L', category: 'Bebidas', priceBuy: 1.8, priceSell: 2.5, stock: 60, minStock: 12, active: true },
  { id: 'P005', name: 'Jabón en Polvo 500g', category: 'Limpieza', priceBuy: 1.5, priceSell: 2.2, stock: 30, minStock: 5, active: true },
  { id: 'P006', name: 'Atún en Lata 140g', category: 'Alimentos', priceBuy: 1.2, priceSell: 1.8, stock: 12, minStock: 20, active: true }, // Low stock
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'C001', name: 'Cliente General', phone: '0000000', type: 'Casual' },
  { id: 'C002', name: 'Juan Pérez', phone: '0414-1234567', type: 'Frecuente' },
  { id: 'C003', name: 'Maria Rodríguez', phone: '0412-9876543', type: 'VIP' },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'S001', name: 'Distribuidora Polar', phone: '0212-5555555', paymentType: 'Contado' },
  { id: 'S002', name: 'Alimentos Mary', phone: '0212-4444444', paymentType: 'Crédito' },
  { id: 'S003', name: 'Inversiones Global', phone: '0414-9999999', paymentType: 'Contado' },
];

// Fechas dinámicas para que el dashboard siempre muestre datos de "hoy"
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

export const INITIAL_SALES: SaleHeader[] = [
  { id: 'V001', date: yesterday.toISOString(), clientId: 'C002', type: SaleType.CONTADO, total: 15.5, currencyBase: 'USD', status: SaleStatus.PAGADA },
  { id: 'V002', date: today.toISOString(), clientId: 'C001', type: SaleType.CONTADO, total: 12.0, currencyBase: 'USD', status: SaleStatus.PAGADA },
  { id: 'V003', date: today.toISOString(), clientId: 'C003', type: SaleType.CONTADO, total: 45.0, currencyBase: 'USD', status: SaleStatus.PAGADA }
];

export const INITIAL_DETAILS: SaleDetail[] = [
  { saleId: 'V001', productId: 'P001', quantity: 5, priceUnit: 1.2, subtotal: 6.0 },
  { saleId: 'V001', productId: 'P003', quantity: 2, priceUnit: 3.5, subtotal: 7.0 },
  { saleId: 'V002', productId: 'P002', quantity: 4, priceUnit: 1.3, subtotal: 5.2 },
  { saleId: 'V002', productId: 'P004', quantity: 2, priceUnit: 2.5, subtotal: 5.0 },
  { saleId: 'V003', productId: 'P003', quantity: 10, priceUnit: 3.5, subtotal: 35.0 },
];

export const INITIAL_PURCHASES: PurchaseHeader[] = [
    { id: 'C001', date: yesterday.toISOString(), supplierId: 'S002', total: 120.0, currency: 'USD', reference: 'Restock Arroz', status: 'Completada' },
    { id: 'C002', date: today.toISOString(), supplierId: 'S001', total: 500.0, currency: 'BS', reference: 'Pago Transporte', status: 'Completada' }
];

export const INITIAL_PURCHASE_DETAILS: PurchaseDetail[] = [
    { purchaseId: 'C001', productId: 'P002', quantity: 100, costUnit: 1.2, subtotal: 120.0 },
    { purchaseId: 'C002', productId: 'P001', quantity: 10, costUnit: 50.0, subtotal: 500.0 } // Approx BS calculation in mock
];

export const INITIAL_MOVEMENTS: CashMovement[] = [
  // Movimiento de Ayer
  { id: 'M001', date: yesterday.toISOString(), type: TransactionType.INGRESO, origin: TransactionOrigin.VENTA, method: PaymentMethod.EFECTIVO_USD, amount: 15.5, currency: 'USD' },
  
  // Movimientos de Hoy (Venta V002 - Mixta)
  { id: 'M002', date: today.toISOString(), type: TransactionType.INGRESO, origin: TransactionOrigin.VENTA, method: PaymentMethod.EFECTIVO_USD, amount: 5.0, currency: 'USD' },
  { id: 'M003', date: today.toISOString(), type: TransactionType.INGRESO, origin: TransactionOrigin.VENTA, method: PaymentMethod.EFECTIVO_BS, amount: 318.5, currency: 'BS' }, // ~7 USD
  
  // Movimientos de Hoy (Venta V003 - Zelle)
  { id: 'M004', date: today.toISOString(), type: TransactionType.INGRESO, origin: TransactionOrigin.VENTA, method: PaymentMethod.ZELLE, amount: 45.0, currency: 'USD', reference: 'ZL-998877' },

  // Movimientos de Compra (Egresos) - Linked to purchases conceptually
  { id: 'M005', date: today.toISOString(), type: TransactionType.EGRESO, origin: TransactionOrigin.COMPRA, method: PaymentMethod.EFECTIVO_BS, amount: 500.0, currency: 'BS', reference: 'Pago Transporte', supplierId: 'S001' },
  { id: 'M006', date: yesterday.toISOString(), type: TransactionType.EGRESO, origin: TransactionOrigin.COMPRA, method: PaymentMethod.ZELLE, amount: 120.0, currency: 'USD', reference: 'Restock Arroz', supplierId: 'S002' }
];