import { Product, Client, SaleHeader, SaleDetail, CashMovement, Supplier, PurchaseItem, PurchaseHeader, PurchaseDetail } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_SALES, INITIAL_DETAILS, INITIAL_MOVEMENTS, INITIAL_SUPPLIERS, INITIAL_PURCHASES, INITIAL_PURCHASE_DETAILS } from './mockData';
import { ApiService } from './api';

const STORAGE_KEYS = {
  PRODUCTS: 'nova_products',
  CLIENTS: 'nova_clients',
  SUPPLIERS: 'nova_suppliers',
  SALES_HEADER: 'nova_sales_header',
  SALES_DETAIL: 'nova_sales_detail',
  PURCHASES_HEADER: 'nova_purchases_header',
  PURCHASES_DETAIL: 'nova_purchases_detail',
  MOVEMENTS: 'nova_movements',
  LAST_SYNC: 'nova_last_sync'
};

// In-Memory Cache for performance
let cache: any = {
  products: [],
  clients: [],
  suppliers: [],
  sales: [],
  details: [],
  purchases: [],
  purchaseDetails: [],
  movements: []
};

// Helper to save to local storage and update cache
const updateLocal = (key: string, data: any, cacheKey: string) => {
  cache[cacheKey] = data;
  localStorage.setItem(key, JSON.stringify(data));
};

const loadFromStorage = () => {
  cache.products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
  cache.clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || JSON.stringify(INITIAL_CLIENTS));
  cache.suppliers = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPPLIERS) || JSON.stringify(INITIAL_SUPPLIERS));
  cache.sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES_HEADER) || JSON.stringify(INITIAL_SALES));
  cache.details = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES_DETAIL) || JSON.stringify(INITIAL_DETAILS));
  cache.purchases = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES_HEADER) || JSON.stringify(INITIAL_PURCHASES));
  cache.purchaseDetails = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES_DETAIL) || JSON.stringify(INITIAL_PURCHASE_DETAILS));
  cache.movements = JSON.parse(localStorage.getItem(STORAGE_KEYS.MOVEMENTS) || JSON.stringify(INITIAL_MOVEMENTS));
};

// Initial load
loadFromStorage();

export const DataService = {
  /**
   * Initializes the app data.
   * Tries to fetch from Google Sheets. If successful, updates LocalStorage.
   * If fails, falls back to existing LocalStorage data.
   */
  initialize: async () => {
    try {
      const cloudData = await ApiService.fetchDatabase();
      if (cloudData) {
        // Update Local Storage with Cloud Data
        updateLocal(STORAGE_KEYS.PRODUCTS, cloudData.products, 'products');
        updateLocal(STORAGE_KEYS.CLIENTS, cloudData.clients, 'clients');
        updateLocal(STORAGE_KEYS.SUPPLIERS, cloudData.suppliers, 'suppliers');
        updateLocal(STORAGE_KEYS.SALES_HEADER, cloudData.sales, 'sales');
        updateLocal(STORAGE_KEYS.SALES_DETAIL, cloudData.details, 'details');
        updateLocal(STORAGE_KEYS.PURCHASES_HEADER, cloudData.purchases, 'purchases');
        updateLocal(STORAGE_KEYS.PURCHASES_DETAIL, cloudData.purchaseDetails, 'purchaseDetails');
        updateLocal(STORAGE_KEYS.MOVEMENTS, cloudData.movements, 'movements');
        console.log('Data synced with Google Sheets');
      }
    } catch (e) {
      console.warn('Offline mode or API error. Using local data.', e);
    }
  },

  // Getters return from memory cache (Sync, fast)
  getProducts: (): Product[] => cache.products,
  getClients: (): Client[] => cache.clients,
  getSuppliers: (): Supplier[] => cache.suppliers,
  getSales: (): SaleHeader[] => cache.sales,
  getSaleDetails: (): SaleDetail[] => cache.details,
  getPurchases: (): PurchaseHeader[] => cache.purchases,
  getPurchaseDetails: (): PurchaseDetail[] => cache.purchaseDetails,
  getMovements: (): CashMovement[] => cache.movements,

  // Setters update Cache -> LocalStorage -> Async API Call
  saveSale: (header: SaleHeader, details: SaleDetail[], movements: CashMovement[]) => {
    // 1. Optimistic Update (Local)
    const newSales = [...cache.sales, header];
    const newDetails = [...cache.details, ...details];
    const newMovements = [...cache.movements, ...movements];
    
    // Update Inventory Locally
    const newProducts = cache.products.map((p: Product) => {
      const soldItem = details.find(d => d.productId === p.id);
      return soldItem ? { ...p, stock: p.stock - soldItem.quantity } : p;
    });

    updateLocal(STORAGE_KEYS.SALES_HEADER, newSales, 'sales');
    updateLocal(STORAGE_KEYS.SALES_DETAIL, newDetails, 'details');
    updateLocal(STORAGE_KEYS.MOVEMENTS, newMovements, 'movements');
    updateLocal(STORAGE_KEYS.PRODUCTS, newProducts, 'products');

    // 2. Sync to Cloud
    ApiService.sendAction('SAVE_SALE', { header, details, movements });
  },

  savePurchase: (items: PurchaseItem[], movement: CashMovement) => {
    // 1. Generate Purchase Records
    const purchaseId = `C${Date.now()}`;
    const header: PurchaseHeader = {
        id: purchaseId,
        date: movement.date,
        supplierId: movement.supplierId || '',
        total: movement.amount,
        currency: movement.currency,
        reference: movement.reference || '',
        status: 'Completada'
    };

    const details: PurchaseDetail[] = items.map(item => ({
        purchaseId,
        productId: item.id,
        quantity: item.quantity,
        costUnit: item.newCost,
        subtotal: item.quantity * item.newCost
    }));

    // 2. Optimistic Update
    const newMovements = [...cache.movements, movement];
    const newPurchases = [...cache.purchases, header];
    const newPurchaseDetails = [...cache.purchaseDetails, ...details];
    
    // Update Inventory Locally
    const newProducts = cache.products.map((p: Product) => {
      const purchasedItem = items.find(item => item.id === p.id);
      if (purchasedItem) {
        return { 
            ...p, 
            stock: p.stock + purchasedItem.quantity,
            priceBuy: purchasedItem.newCost 
        };
      }
      return p;
    });

    updateLocal(STORAGE_KEYS.MOVEMENTS, newMovements, 'movements');
    updateLocal(STORAGE_KEYS.PURCHASES_HEADER, newPurchases, 'purchases');
    updateLocal(STORAGE_KEYS.PURCHASES_DETAIL, newPurchaseDetails, 'purchaseDetails');
    updateLocal(STORAGE_KEYS.PRODUCTS, newProducts, 'products');

    // 3. Sync to Cloud
    ApiService.sendAction('SAVE_PURCHASE', { items, movement, header, details });
  },

  addMovement: (movement: CashMovement) => {
    const newMovements = [...cache.movements, movement];
    updateLocal(STORAGE_KEYS.MOVEMENTS, newMovements, 'movements');
  },
  
  updateProduct: (product: Product) => {
    const index = cache.products.findIndex((p: Product) => p.id === product.id);
    const newProducts = [...cache.products];
    if (index >= 0) {
      newProducts[index] = product;
    } else {
      newProducts.push(product);
    }
    updateLocal(STORAGE_KEYS.PRODUCTS, newProducts, 'products');

    // Sync to Cloud
    ApiService.sendAction('SYNC_INVENTORY', product);
  },

  saveSupplier: (supplier: Supplier) => {
    const index = cache.suppliers.findIndex((s: Supplier) => s.id === supplier.id);
    const newSuppliers = [...cache.suppliers];
    
    if (index >= 0) {
        newSuppliers[index] = supplier;
    } else {
        newSuppliers.push(supplier);
    }
    
    updateLocal(STORAGE_KEYS.SUPPLIERS, newSuppliers, 'suppliers');
    
    // Sync to Cloud
    ApiService.sendAction('SAVE_SUPPLIER', supplier);
  },

  deleteSupplier: (supplierId: string) => {
    const newSuppliers = cache.suppliers.filter((s: Supplier) => s.id !== supplierId);
    updateLocal(STORAGE_KEYS.SUPPLIERS, newSuppliers, 'suppliers');
    
    // Sync to Cloud
    ApiService.sendAction('DELETE_SUPPLIER', { id: supplierId });
  },

  saveClient: (client: Client) => {
    const newClients = [...cache.clients, client];
    updateLocal(STORAGE_KEYS.CLIENTS, newClients, 'clients');
    
    // Sync to Cloud
    ApiService.sendAction('SAVE_CLIENT', client);
  }
};