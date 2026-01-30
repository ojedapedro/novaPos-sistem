import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, X, Check, Edit2, RefreshCw, User, ChevronDown, FileText, Calendar, Filter, Eye, Package, UserPlus, Phone, Barcode } from 'lucide-react';
import { Product, CartItem, Client, SaleType, SaleStatus, ExchangeRate, PaymentMethod, TransactionType, TransactionOrigin, SaleHeader, SaleDetail } from '../types';
import { DataService } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';

interface POSProps {
  exchangeRate: ExchangeRate;
  onUpdateExchangeRate: (rate: number) => void;
}

export const POS: React.FC<POSProps> = ({ exchangeRate, onUpdateExchangeRate }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'report'>('new');
  const { showNotification } = useNotification();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // --- Common State ---
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // --- POS (New Sale) State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false); // Checkout Modal
  const [paymentDetails, setPaymentDetails] = useState({
    [PaymentMethod.EFECTIVO_USD]: 0,
    [PaymentMethod.EFECTIVO_BS]: 0,
    [PaymentMethod.PAGO_MOVIL]: 0,
    [PaymentMethod.ZELLE]: 0,
    [PaymentMethod.CASHEA]: 0,
    ref: ''
  });
  const [saleType, setSaleType] = useState<SaleType>(SaleType.CONTADO);

  // --- New Client Modal State ---
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // --- Report (History) State ---
  const [salesHistory, setSalesHistory] = useState<SaleHeader[]>([]);
  const [saleDetailsHistory, setSaleDetailsHistory] = useState<SaleDetail[]>([]);
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null); // Detail Modal

  useEffect(() => {
    // Load initial data
    setProducts(DataService.getProducts());
    const loadedClients = DataService.getClients();
    setClients(loadedClients);
    setSalesHistory(DataService.getSales());
    setSaleDetailsHistory(DataService.getSaleDetails());
    
    // Default client selection
    if (loadedClients.length > 0) {
        const defaultClient = loadedClients.find(c => c.id === 'C001') || loadedClients[0];
        setSelectedClient(defaultClient.id);
    }

    setTempRate(exchangeRate.usdToBs.toString());
    
    // Auto-focus search input on load
    if (activeTab === 'new') {
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [exchangeRate.usdToBs, activeTab]);

  // --- POS Logic ---
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.active && 
      (p.name.toLowerCase().includes(term) || 
       p.category.toLowerCase().includes(term) ||
       p.id.toLowerCase().includes(term)) // Allow search by ID in list
    );
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
        showNotification('warning', `Stock insuficiente para ${product.name}`);
        return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
            showNotification('warning', 'No hay más unidades disponibles');
            return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // --- Barcode Scanner Logic ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      // Find exact match by ID (Barcode)
      const exactMatch = products.find(p => p.id.toLowerCase() === searchTerm.toLowerCase());
      
      if (exactMatch) {
        if (exactMatch.active) {
            addToCart(exactMatch);
            setSearchTerm(''); // Clear input for next scan
            showNotification('success', 'Producto agregado');
        } else {
            showNotification('error', 'Producto inactivo');
        }
      } else {
        // Optional: If no exact ID match, maybe add the first result if it's a very specific search?
        // For safety in POS, better to warn if not found.
        if (filteredProducts.length === 0) {
            showNotification('warning', 'Producto no encontrado');
        }
      }
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        const stockLimit = products.find(p => p.id === id)?.stock || 0;
        return { ...item, quantity: Math.max(1, Math.min(newQty, stockLimit)) };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotalUSD = cart.reduce((sum, item) => sum + (item.priceSell * item.quantity), 0);
  const cartTotalBs = cartTotalUSD * exchangeRate.usdToBs;

  const handlePaymentChange = (method: PaymentMethod, value: string) => {
    const numVal = parseFloat(value);
    setPaymentDetails(prev => ({ 
        ...prev, 
        [method]: isNaN(numVal) ? 0 : numVal 
    }));
  };

  const totalPaidInUSD = 
    (paymentDetails[PaymentMethod.EFECTIVO_USD] || 0) +
    ((paymentDetails[PaymentMethod.EFECTIVO_BS] || 0) / exchangeRate.usdToBs) +
    ((paymentDetails[PaymentMethod.PAGO_MOVIL] || 0) / exchangeRate.usdToBs) +
    (paymentDetails[PaymentMethod.ZELLE] || 0) +
    (paymentDetails[PaymentMethod.CASHEA] || 0);

  const remainingUSD = Math.max(0, cartTotalUSD - totalPaidInUSD);
  const remainingBs = remainingUSD * exchangeRate.usdToBs;

  const handleRateSave = () => {
    const newRate = parseFloat(tempRate);
    if (!isNaN(newRate) && newRate > 0) {
        onUpdateExchangeRate(newRate);
        setIsEditingRate(false);
    }
  };

  const handleCreateClient = () => {
      if (!newClientName.trim()) {
          showNotification('error', "El nombre del cliente es obligatorio");
          return;
      }

      const newClient: Client = {
          id: `C${Date.now()}`,
          name: newClientName,
          phone: newClientPhone,
          type: 'Frecuente'
      };

      DataService.saveClient(newClient);
      const updatedClients = DataService.getClients();
      setClients(updatedClients);
      setSelectedClient(newClient.id); // Auto-select new client
      
      // Reset and close
      setNewClientName('');
      setNewClientPhone('');
      setIsClientModalOpen(false);
      showNotification('success', "Cliente creado correctamente");
  };

  const processSale = () => {
    if (cart.length === 0) return;
    if (saleType === SaleType.CONTADO && remainingUSD > 0.01) {
      showNotification('warning', "El pago está incompleto. Verifique los montos.");
      return;
    }

    const saleId = `V${Date.now()}`;
    const newSale: SaleHeader = {
      id: saleId,
      date: new Date().toISOString(),
      clientId: selectedClient,
      type: saleType,
      total: cartTotalUSD,
      currencyBase: 'USD',
      status: saleType === SaleType.CONTADO ? SaleStatus.PAGADA : SaleStatus.PENDIENTE
    };

    const saleDetails = cart.map(item => ({
      saleId,
      productId: item.id,
      quantity: item.quantity,
      priceUnit: item.priceSell,
      subtotal: item.quantity * item.priceSell
    }));

    const movements = [];
    if (paymentDetails[PaymentMethod.EFECTIVO_USD] > 0) movements.push(createMovement(saleId, PaymentMethod.EFECTIVO_USD, paymentDetails[PaymentMethod.EFECTIVO_USD], 'USD'));
    if (paymentDetails[PaymentMethod.EFECTIVO_BS] > 0) movements.push(createMovement(saleId, PaymentMethod.EFECTIVO_BS, paymentDetails[PaymentMethod.EFECTIVO_BS], 'BS'));
    if (paymentDetails[PaymentMethod.PAGO_MOVIL] > 0) movements.push(createMovement(saleId, PaymentMethod.PAGO_MOVIL, paymentDetails[PaymentMethod.PAGO_MOVIL], 'BS'));
    if (paymentDetails[PaymentMethod.ZELLE] > 0) movements.push(createMovement(saleId, PaymentMethod.ZELLE, paymentDetails[PaymentMethod.ZELLE], 'USD'));

    DataService.saveSale(newSale, saleDetails, movements);
    
    // Refresh Data
    setCart([]);
    setIsModalOpen(false);
    setPaymentDetails({
        [PaymentMethod.EFECTIVO_USD]: 0, [PaymentMethod.EFECTIVO_BS]: 0,
        [PaymentMethod.PAGO_MOVIL]: 0, [PaymentMethod.ZELLE]: 0,
        [PaymentMethod.CASHEA]: 0, ref: ''
    });
    setProducts(DataService.getProducts());
    setSalesHistory(DataService.getSales());
    setSaleDetailsHistory(DataService.getSaleDetails());
    showNotification('success', "Venta procesada con éxito.");
    
    // Refocus for next sale
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const createMovement = (refId: string, method: PaymentMethod, amount: number, currency: string) => ({
    id: `M${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
    date: new Date().toISOString(),
    type: TransactionType.INGRESO,
    origin: TransactionOrigin.VENTA,
    method,
    amount,
    currency,
    reference: paymentDetails.ref || refId
  });

  // --- Report Logic ---
  const salesReport = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    const filtered = salesHistory.filter(s => {
        const sDate = new Date(s.date);
        const inDateRange = sDate >= start && sDate <= end;
        const matchesClient = filterClient === 'ALL' || s.clientId === filterClient;
        return inDateRange && matchesClient;
    });

    const totalRevenueUSD = filtered.reduce((acc, curr) => acc + curr.total, 0);

    return {
        sales: filtered.reverse(),
        totalRevenueUSD,
        count: filtered.length
    };
  }, [salesHistory, filterClient, startDate, endDate]);

  const currentClientLabel = useMemo(() => {
    if (filterClient === 'ALL') return '(Todos)';
    const c = clients.find(cl => cl.id === filterClient);
    return c ? `(${c.name})` : '(Desconocido)';
  }, [filterClient, clients]);

  const selectedSaleDetails = useMemo(() => {
      if (!selectedSaleId) return [];
      return saleDetailsHistory.filter(d => d.saleId === selectedSaleId);
  }, [selectedSaleId, saleDetailsHistory]);

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || id;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        {/* Tab Navigation */}
        <div className="bg-white px-6 py-2 border-b border-gray-200 flex items-center gap-4 shadow-sm z-10">
            <button 
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'new' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                <ShoppingCart size={16} /> Punto de Venta
            </button>
            <button 
                type="button"
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                <FileText size={16} /> Historial de Ventas
            </button>
        </div>

        {activeTab === 'new' ? (
             <div className="flex flex-1 overflow-hidden">
             {/* POS: Product Catalog */}
             <div className="w-2/3 p-6 overflow-y-auto custom-scrollbar">
               <div className="mb-6 relative">
                 <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                 <input 
                   ref={searchInputRef}
                   type="text" 
                   placeholder="Buscar o escanear código de barras..." 
                   className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   onKeyDown={handleKeyDown}
                   autoFocus
                 />
                 <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                     <Barcode size={20} />
                 </div>
               </div>
       
               <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                 {filteredProducts.map(product => (
                   <div 
                     key={product.id} 
                     className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between ${product.stock <= 0 ? 'opacity-50 border-gray-100' : 'border-gray-200 hover:border-blue-300'}`}
                     onClick={() => addToCart(product)}
                   >
                     <div>
                       <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{product.category}</span>
                         <span className={`text-xs font-bold ${product.stock <= product.minStock ? 'text-red-500' : 'text-green-500'}`}>
                           Stock: {product.stock}
                         </span>
                       </div>
                       <h3 className="font-semibold text-gray-800 mb-1 leading-tight">{product.name}</h3>
                       <div className="text-xs text-gray-400 font-mono mt-1">{product.id}</div>
                     </div>
                     <div className="mt-3 flex justify-between items-end">
                       <div>
                         <p className="text-lg font-bold text-blue-600">${product.priceSell.toFixed(2)}</p>
                         <p className="text-xs text-gray-400">Bs. {(product.priceSell * exchangeRate.usdToBs).toFixed(2)}</p>
                       </div>
                       <button 
                         className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 disabled:cursor-not-allowed"
                         disabled={product.stock <= 0}
                       >
                         <Plus size={18} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
       
             {/* POS: Cart Sidebar */}
             <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
               <div className="p-5 border-b border-gray-100 bg-gray-50">
                 <div className="flex items-center gap-2 text-gray-700 mb-4">
                   <ShoppingCart size={20} />
                   <h2 className="font-bold text-lg">Carrito de Venta</h2>
                 </div>
                 
                 {/* Rate Editor Widget */}
                 <div className="flex justify-between items-center mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2">
                        <RefreshCw size={16} className="text-blue-600" />
                        <span className="text-sm text-blue-800 font-medium">Tasa BCV/Paralelo:</span>
                    </div>
                    {isEditingRate ? (
                        <div className="flex items-center gap-2">
                            <input 
                               type="number" 
                               className="w-20 p-1 text-right text-sm border border-blue-300 rounded focus:outline-none"
                               value={tempRate}
                               onChange={(e) => setTempRate(e.target.value)}
                               autoFocus
                            />
                            <button onClick={handleRateSave} className="p-1 text-green-600 hover:bg-green-100 rounded">
                               <Check size={16} />
                            </button>
                            <button onClick={() => setIsEditingRate(false)} className="p-1 text-red-500 hover:bg-red-100 rounded">
                               <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-900">{exchangeRate.usdToBs.toFixed(2)} Bs</span>
                            <button onClick={() => setIsEditingRate(true)} className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Editar Tasa">
                               <Edit2 size={14} />
                            </button>
                        </div>
                    )}
                 </div>
       
                 {/* Client Selector */}
                 <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Cliente</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                           <User className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
                           <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
                           <select 
                             className="w-full pl-9 pr-8 p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:border-blue-300 transition-colors"
                             value={selectedClient}
                             onChange={(e) => setSelectedClient(e.target.value)}
                           >
                             <option value="" disabled>Seleccione un cliente</option>
                             {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                        </div>
                        <button 
                            onClick={() => setIsClientModalOpen(true)}
                            className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Nuevo Cliente"
                        >
                            <UserPlus size={18} />
                        </button>
                    </div>
                 </div>
               </div>
       
               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {cart.length === 0 ? (
                   <div className="text-center text-gray-400 mt-10">
                     <Barcode size={48} className="mx-auto mb-3 opacity-20" />
                     <p>Escanee un producto para empezar</p>
                   </div>
                 ) : (
                   cart.map(item => (
                     <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                       <div className="flex-1">
                         <h4 className="font-medium text-gray-800 text-sm">{item.name}</h4>
                         <div className="text-xs text-gray-500 mt-1">${(item.priceSell * item.quantity).toFixed(2)}</div>
                       </div>
                       <div className="flex items-center gap-3">
                         <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded text-gray-600"><Minus size={14} /></button>
                         <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                         <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded text-gray-600"><Plus size={14} /></button>
                         <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-400 hover:text-red-600 ml-2"><Trash2 size={16} /></button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
       
               <div className="p-6 border-t border-gray-200 bg-gray-50">
                 <div className="flex justify-between mb-2">
                   <span className="text-gray-500">Subtotal</span>
                   <span className="font-medium">${cartTotalUSD.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center mb-6">
                   <span className="text-xl font-bold text-gray-800">Total</span>
                   <div className="text-right">
                     <div className="text-xl font-bold text-blue-600">${cartTotalUSD.toFixed(2)}</div>
                     <div className="text-sm text-gray-500">Bs. {cartTotalBs.toFixed(2)}</div>
                   </div>
                 </div>
                 <button 
                   className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                   disabled={cart.length === 0}
                   onClick={() => setIsModalOpen(true)}
                 >
                   <CreditCard size={18} /> Procesar Venta
                 </button>
               </div>
             </div>
           </div>
        ) : (
            // --- Sales History View ---
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Reporte de Ventas</h2>
                    <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 px-2 border-r border-gray-200">
                            <Calendar size={18} className="text-gray-400" />
                            <input type="date" className="text-sm text-gray-600 outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-gray-400">-</span>
                            <input type="date" className="text-sm text-gray-600 outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 px-2">
                            <Filter size={18} className="text-gray-400" />
                            <select 
                                className="text-sm text-gray-600 outline-none bg-transparent cursor-pointer"
                                value={filterClient}
                                onChange={(e) => setFilterClient(e.target.value)}
                            >
                                <option value="ALL">Todos los Clientes</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Ventas Totales {currentClientLabel}</p>
                            <h3 className="text-3xl font-bold text-gray-800">${salesReport.totalRevenueUSD.toFixed(2)}</h3>
                            <p className="text-xs text-gray-400 mt-1">Ingresos brutos (USD)</p>
                        </div>
                        <div className="p-4 bg-green-50 text-green-600 rounded-lg"><CreditCard size={28} /></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Transacciones</p>
                            <h3 className="text-3xl font-bold text-gray-800">{salesReport.count}</h3>
                            <p className="text-xs text-blue-600 mt-1 font-medium">Operaciones realizadas</p>
                        </div>
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-lg"><FileText size={28} /></div>
                    </div>
                </div>

                {/* Sales Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Historial de Transacciones</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-white text-gray-500 font-medium text-xs uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {salesReport.sales.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        No se encontraron ventas en este periodo.
                                    </td>
                                </tr>
                            ) : (
                                salesReport.sales.map(sale => {
                                    const clientName = clients.find(c => c.id === sale.clientId)?.name || 'Cliente Casual';
                                    return (
                                        <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(sale.date).toLocaleDateString()}
                                                <div className="text-xs text-gray-400">{new Date(sale.date).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-800">{clientName}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${sale.type === SaleType.CONTADO ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                                    {sale.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-bold text-gray-800">${sale.total.toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${sale.status === SaleStatus.PAGADA ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => setSelectedSaleId(sale.id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Ver Productos"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      {/* POS: Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Finalizar Compra</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-8">
              {/* Left: Summary */}
              <div className="space-y-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Venta</label>
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                      <button 
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${saleType === SaleType.CONTADO ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setSaleType(SaleType.CONTADO)}
                      >
                        Contado
                      </button>
                      <button 
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${saleType === SaleType.CREDITO ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setSaleType(SaleType.CREDITO)}
                      >
                        Crédito
                      </button>
                    </div>
                 </div>

                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-600 mb-1">Monto a Pagar</p>
                    <div className="text-3xl font-bold text-gray-900">${cartTotalUSD.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Bs. {cartTotalBs.toFixed(2)}</div>
                 </div>

                 {saleType === SaleType.CONTADO && (
                   <div className={`p-4 rounded-xl border ${remainingUSD > 0.01 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                      <p className="text-sm font-medium mb-1">{remainingUSD > 0.01 ? 'Restante por Pagar' : 'Pago Completo'}</p>
                      <div className="flex justify-between items-end">
                          <div className="text-xl font-bold">${remainingUSD.toFixed(2)}</div>
                          <div className="text-sm font-medium opacity-80">Bs. {remainingBs.toFixed(2)}</div>
                      </div>
                   </div>
                 )}
              </div>

              {/* Right: Payment Methods */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Métodos de Pago</h3>
                
                {saleType === SaleType.CONTADO ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Efectivo USD ($)</label>
                        <input 
                            type="number" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="0.00" 
                            value={paymentDetails[PaymentMethod.EFECTIVO_USD] || ''}
                            onChange={(e) => handlePaymentChange(PaymentMethod.EFECTIVO_USD, e.target.value)} 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs text-gray-500">Efectivo Bs</label>
                            {paymentDetails[PaymentMethod.EFECTIVO_BS] > 0 && (
                                <span className="text-xs font-medium text-blue-600">
                                    ${(paymentDetails[PaymentMethod.EFECTIVO_BS] / exchangeRate.usdToBs).toFixed(2)}
                                </span>
                            )}
                        </div>
                        <input 
                            type="number" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="0.00" 
                            value={paymentDetails[PaymentMethod.EFECTIVO_BS] || ''}
                            onChange={(e) => handlePaymentChange(PaymentMethod.EFECTIVO_BS, e.target.value)} 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs text-gray-500">Pago Móvil (Bs)</label>
                            {paymentDetails[PaymentMethod.PAGO_MOVIL] > 0 && (
                                <span className="text-xs font-medium text-blue-600">
                                    ${(paymentDetails[PaymentMethod.PAGO_MOVIL] / exchangeRate.usdToBs).toFixed(2)}
                                </span>
                            )}
                        </div>
                        <input 
                            type="number" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="0.00" 
                            value={paymentDetails[PaymentMethod.PAGO_MOVIL] || ''}
                            onChange={(e) => handlePaymentChange(PaymentMethod.PAGO_MOVIL, e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Zelle ($)</label>
                        <input 
                            type="number" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="0.00" 
                            value={paymentDetails[PaymentMethod.ZELLE] || ''}
                            onChange={(e) => handlePaymentChange(PaymentMethod.ZELLE, e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Referencia (Opcional)</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg" 
                        placeholder="Ref: 123456" 
                        value={paymentDetails.ref}
                        onChange={(e) => setPaymentDetails(prev => ({...prev, ref: e.target.value}))} 
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg cursor-pointer hover:border-blue-400 bg-white">
                      <div className="font-bold text-gray-800">Cashea</div>
                      <div className="text-xs text-gray-500">Crédito en cuotas</div>
                    </div>
                     <div className="p-4 border rounded-lg cursor-pointer hover:border-blue-400 bg-white">
                      <div className="font-bold text-gray-800">Crédito Interno</div>
                      <div className="text-xs text-gray-500">Cuenta por cobrar al cliente</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium">Cancelar</button>
              <button 
                onClick={processSale} 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <Check size={18} /> Confirmar {saleType === SaleType.CONTADO ? 'Pago' : 'Crédito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {isClientModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-lg font-bold text-gray-800">Nuevo Cliente</h2>
                      <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre Completo</label>
                          <div className="relative">
                              <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                              <input 
                                  type="text" 
                                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ej: María Pérez"
                                  value={newClientName}
                                  onChange={(e) => setNewClientName(e.target.value)}
                                  autoFocus
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono (Opcional)</label>
                          <div className="relative">
                              <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                              <input 
                                  type="text" 
                                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ej: 0412-1234567"
                                  value={newClientPhone}
                                  onChange={(e) => setNewClientPhone(e.target.value)}
                              />
                          </div>
                      </div>
                  </div>
                  <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                      <button onClick={() => setIsClientModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm">Cancelar</button>
                      <button onClick={handleCreateClient} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Guardar Cliente</button>
                  </div>
              </div>
          </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Package size={20} className="text-blue-600"/>
                        Detalle de Venta
                    </h2>
                    <button onClick={() => setSelectedSaleId(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="mb-4 text-sm text-gray-500 flex justify-between">
                        <span>ID Venta: <span className="font-mono text-gray-700 font-bold">{selectedSaleId}</span></span>
                        <span>{new Date(salesHistory.find(s => s.id === selectedSaleId)?.date || '').toLocaleString()}</span>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3 text-center">Cant.</th>
                                <th className="px-4 py-3 text-right">Precio Unit.</th>
                                <th className="px-4 py-3 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {selectedSaleDetails.map((detail, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-800">{getProductName(detail.productId)}</td>
                                    <td className="px-4 py-3 text-center">{detail.quantity}</td>
                                    <td className="px-4 py-3 text-right">${detail.priceUnit.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-700">${detail.subtotal.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-800">Total</td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">
                                    ${selectedSaleDetails.reduce((sum, d) => sum + d.subtotal, 0).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div className="p-5 border-t border-gray-100 flex justify-end bg-gray-50">
                    <button onClick={() => setSelectedSaleId(null)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Cerrar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};