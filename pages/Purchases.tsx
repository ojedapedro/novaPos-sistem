import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, Truck, X, Check, Save, FileText, Calendar, Filter, UserPlus, Phone, CreditCard } from 'lucide-react';
import { Product, PurchaseItem, Supplier, PaymentMethod, TransactionType, TransactionOrigin, ExchangeRate, CashMovement } from '../types';
import { DataService } from '../services/dataService';
import { ProductFormModal } from '../components/ProductFormModal';

interface PurchasesProps {
  exchangeRate: ExchangeRate;
}

export const Purchases: React.FC<PurchasesProps> = ({ exchangeRate }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'report'>('new');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // --- New Purchase Logic ---
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.EFECTIVO_USD);
  const [reference, setReference] = useState('');

  // --- Product Modal State ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // --- Supplier Modal State ---
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', paymentType: 'Contado' });

  // --- Report Logic ---
  const [allMovements, setAllMovements] = useState<CashMovement[]>([]);
  const [filterSupplier, setFilterSupplier] = useState<string>('ALL');
  // Default to first day of current month
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setProducts(DataService.getProducts());
    setAllMovements(DataService.getMovements());
    const loadedSuppliers = DataService.getSuppliers();
    setSuppliers(loadedSuppliers);
    if (loadedSuppliers.length > 0) {
        setSelectedSupplier(loadedSuppliers[0].id);
    }
  }, []);

  // --- Helper: Conversion ---
  const toUSD = (amount: number, currency: string) => {
    if (currency === 'USD') return amount;
    if (currency === 'BS') return amount / exchangeRate.usdToBs;
    if (currency === 'EUR') return (amount * exchangeRate.eurToBs) / exchangeRate.usdToBs;
    return amount;
  };

  // --- Report Processing ---
  const purchaseReport = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59); // Include full end day

    const filtered = allMovements.filter(m => {
        const mDate = new Date(m.date);
        const isPurchase = m.type === TransactionType.EGRESO && m.origin === TransactionOrigin.COMPRA;
        const inDateRange = mDate >= start && mDate <= end;
        
        // Filter logic: If ALL, match everything. If specific ID, match exact supplierId.
        const matchesSupplier = filterSupplier === 'ALL' || m.supplierId === filterSupplier;

        return isPurchase && inDateRange && matchesSupplier;
    });

    const totalSpentUSD = filtered.reduce((acc, curr) => acc + toUSD(curr.amount, curr.currency), 0);
    
    return {
        movements: filtered.reverse(),
        totalSpentUSD,
        count: filtered.length
    };
  }, [allMovements, filterSupplier, startDate, endDate, exchangeRate]);

  // Label for UI
  const currentSupplierLabel = useMemo(() => {
      if (filterSupplier === 'ALL') return '(Todos)';
      const s = suppliers.find(sup => sup.id === filterSupplier);
      return s ? `(${s.name})` : '(Desconocido)';
  }, [filterSupplier, suppliers]);


  // --- New Purchase Processing ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.active && 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, newCost: product.priceBuy }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const updateCost = (id: string, cost: string) => {
    const numCost = parseFloat(cost);
    if (isNaN(numCost)) return;
    setCart(prev => prev.map(item => {
        if (item.id === id) {
            return { ...item, newCost: numCost };
        }
        return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCreateProduct = (product: Product) => {
      DataService.updateProduct(product);
      setProducts(DataService.getProducts()); // Refresh list
      setIsProductModalOpen(false);
      // Auto add to cart for convenience
      addToCart(product);
  };

  const handleCreateSupplier = () => {
    if (!newSupplier.name.trim()) return alert("El nombre del proveedor es obligatorio");
    
    const supplier: Supplier = {
        id: `S${Date.now()}`,
        name: newSupplier.name,
        phone: newSupplier.phone,
        paymentType: newSupplier.paymentType as 'Contado' | 'Crédito'
    };

    DataService.addSupplier(supplier);
    setSuppliers(DataService.getSuppliers());
    setSelectedSupplier(supplier.id); // Select new supplier
    setIsSupplierModalOpen(false);
    setNewSupplier({ name: '', phone: '', paymentType: 'Contado' }); // Reset form
  };

  const cartTotalUSD = cart.reduce((sum, item) => sum + (item.newCost * item.quantity), 0);
  
  const processPurchase = () => {
    if (cart.length === 0) return;
    if (!selectedSupplier) {
        alert("Seleccione un proveedor");
        return;
    }

    const supplierName = suppliers.find(s => s.id === selectedSupplier)?.name || 'Proveedor';

    const movementId = `M${Date.now()}`;
    const newMovement = {
        id: movementId,
        date: new Date().toISOString(),
        type: TransactionType.EGRESO,
        origin: TransactionOrigin.COMPRA,
        method: paymentMethod,
        amount: cartTotalUSD,
        currency: 'USD',
        reference: `${supplierName} - ${reference}`,
        supplierId: selectedSupplier // Link to supplier for reporting
    };

    DataService.savePurchase(cart, newMovement);
    
    // Reset
    setCart([]);
    setIsModalOpen(false);
    setProducts(DataService.getProducts());
    setAllMovements(DataService.getMovements()); // Refresh report data immediately
    setReference('');
    alert("Compra registrada.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        {/* Module Navigation Tabs */}
        <div className="bg-white px-6 py-2 border-b border-gray-200 flex items-center gap-4">
            <button 
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'new' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                <Plus size={16} /> Nueva Compra
            </button>
            <button 
                type="button"
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                <FileText size={16} /> Historial y Reportes
            </button>
        </div>

      {activeTab === 'new' ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Product Catalog */}
            <div className="w-2/3 p-6 overflow-y-auto custom-scrollbar">
                <div className="mb-4 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">Nueva Compra</h2>
                        <p className="text-gray-500 text-sm">Seleccione productos para reponer inventario.</p>
                    </div>
                </div>
                <div className="mb-6 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscar productos..." 
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        type="button"
                        onClick={() => setIsProductModalOpen(true)}
                        className="bg-white border border-gray-300 text-gray-700 px-4 rounded-xl hover:bg-gray-50 flex items-center gap-2 font-medium shadow-sm active:bg-gray-100"
                        title="Crear nuevo producto si no existe"
                    >
                        <Plus size={20} /> <span className="hidden sm:inline">Crear Producto</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                    <div 
                    key={product.id} 
                    className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all cursor-pointer hover:shadow-md flex flex-col justify-between"
                    onClick={() => addToCart(product)}
                    >
                    <div>
                        <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{product.category}</span>
                        <span className="text-xs font-bold text-gray-500">Stock: {product.stock}</span>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1 leading-tight">{product.name}</h3>
                    </div>
                    <div className="mt-3 flex justify-between items-end">
                        <div>
                            <p className="text-xs text-gray-400">Costo Actual</p>
                            <p className="text-lg font-bold text-gray-700">${product.priceBuy.toFixed(2)}</p>
                        </div>
                        <button className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100">
                        <Plus size={18} />
                        </button>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            {/* Purchase Cart Sidebar */}
            <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Truck size={20} />
                        <h2 className="font-bold text-lg">Orden de Compra</h2>
                    </div>
                    {cart.length > 0 && (
                        <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">
                            Limpiar
                        </button>
                    )}
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Proveedor</label>
                    <div className="flex gap-2">
                        <select 
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                            value={selectedSupplier}
                            onChange={(e) => setSelectedSupplier(e.target.value)}
                        >
                            {suppliers.length === 0 && <option value="">Sin proveedores</option>}
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button 
                            type="button"
                            onClick={() => setIsSupplierModalOpen(true)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Nuevo Proveedor"
                        >
                            <UserPlus size={18} />
                        </button>
                    </div>
                </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                    <Truck size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Agregue productos a la orden</p>
                    </div>
                ) : (
                    cart.map(item => (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-800 text-sm flex-1">{item.name}</h4>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 ml-2"><Trash2 size={16} /></button>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2 bg-white rounded border border-gray-200 p-1">
                                <button type="button" onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><Minus size={12} /></button>
                                <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                                <button type="button" onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><Plus size={12} /></button>
                            </div>

                            {/* Cost Input */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Costo $</span>
                                <input 
                                    type="number" 
                                    className="w-20 p-1 text-right border border-gray-300 rounded text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={item.newCost}
                                    onChange={(e) => updateCost(item.id, e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="text-right mt-2 text-xs font-bold text-gray-600">
                            Subtotal: ${(item.newCost * item.quantity).toFixed(2)}
                        </div>
                    </div>
                    ))
                )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-xl font-bold text-gray-800">Total Compra</span>
                    <div className="text-right">
                    <div className="text-xl font-bold text-red-600">${cartTotalUSD.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Bs. {(cartTotalUSD * exchangeRate.usdToBs).toFixed(2)}</div>
                    </div>
                </div>
                <button 
                    type="button"
                    className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    disabled={cart.length === 0}
                    onClick={() => setIsModalOpen(true)}
                >
                    <Save size={18} /> Registrar Compra
                </button>
                </div>
            </div>
        </div>
      ) : (
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <h2 className="text-2xl font-bold text-gray-800">Reporte de Compras</h2>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                      <div className="flex items-center gap-2 px-2 border-r border-gray-200">
                          <Calendar size={18} className="text-gray-400" />
                          <input 
                              type="date" 
                              className="text-sm text-gray-600 outline-none" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                          />
                          <span className="text-gray-400">-</span>
                          <input 
                              type="date" 
                              className="text-sm text-gray-600 outline-none"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                          />
                      </div>
                      <div className="flex items-center gap-2 px-2">
                          <Filter size={18} className="text-gray-400" />
                          <select 
                              className="text-sm text-gray-600 outline-none bg-transparent cursor-pointer"
                              value={filterSupplier}
                              onChange={(e) => setFilterSupplier(e.target.value)}
                          >
                              <option value="ALL">Todos los Proveedores</option>
                              {suppliers.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                          </select>
                      </div>
                  </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                      <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Total Comprado {currentSupplierLabel}</p>
                          <h3 className="text-3xl font-bold text-gray-800">${purchaseReport.totalSpentUSD.toFixed(2)}</h3>
                          <p className="text-xs text-gray-400 mt-1">Estimado en USD</p>
                      </div>
                      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                          <Truck size={28} />
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                      <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Transacciones</p>
                          <h3 className="text-3xl font-bold text-gray-800">{purchaseReport.count}</h3>
                          <p className="text-xs text-green-600 mt-1 font-medium">Registros encontrados</p>
                      </div>
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-lg">
                          <FileText size={28} />
                      </div>
                  </div>
              </div>

              {/* Detail Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-700">Detalle de Operaciones</h3>
                  </div>
                  <table className="w-full text-left">
                      <thead className="bg-white text-gray-500 font-medium text-xs uppercase border-b border-gray-100">
                          <tr>
                              <th className="px-6 py-4">Fecha</th>
                              <th className="px-6 py-4">Proveedor / Referencia</th>
                              <th className="px-6 py-4">Método Pago</th>
                              <th className="px-6 py-4 text-right">Monto</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {purchaseReport.movements.length === 0 ? (
                              <tr>
                                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                      No se encontraron compras en este periodo con los filtros seleccionados.
                                  </td>
                              </tr>
                          ) : (
                            purchaseReport.movements.map(mov => {
                                const supplierName = suppliers.find(s => s.id === mov.supplierId)?.name || 'Desconocido';
                                return (
                                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(mov.date).toLocaleDateString()}
                                            <div className="text-xs text-gray-400">{new Date(mov.date).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{supplierName}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{mov.reference}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                {mov.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-gray-800">
                                                {mov.amount.toFixed(2)} <span className="text-xs font-normal text-gray-500">{mov.currency}</span>
                                            </div>
                                            {mov.currency !== 'USD' && (
                                                <div className="text-xs text-gray-400">
                                                    ~${toUSD(mov.amount, mov.currency).toFixed(2)}
                                                </div>
                                            )}
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

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Confirmar Egreso</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                    <p className="text-sm text-red-600 mb-1">Monto a Retirar de Caja</p>
                    <div className="text-3xl font-bold text-gray-900">${cartTotalUSD.toFixed(2)}</div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago (Egreso)</label>
                    <select 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    >
                        {Object.values(PaymentMethod).map(method => (
                            <option key={method} value={method}>{method}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Referencia / Nota</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Ej: Factura #1234"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium">Cancelar</button>
              <button 
                type="button"
                onClick={processPurchase} 
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
              >
                <Check size={18} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isSupplierModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-lg font-bold text-gray-800">Nuevo Proveedor</h2>
                      <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre Empresa / Proveedor</label>
                          <div className="relative">
                              <UserPlus className="absolute left-3 top-2.5 text-gray-400" size={18} />
                              <input 
                                  type="text" 
                                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ej: Distribuidora Polar"
                                  value={newSupplier.name}
                                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono / Contacto</label>
                          <div className="relative">
                              <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                              <input 
                                  type="text" 
                                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ej: 0414-1234567"
                                  value={newSupplier.phone}
                                  onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Condición de Pago Habitual</label>
                          <div className="relative">
                              <CreditCard className="absolute left-3 top-2.5 text-gray-400" size={18} />
                              <select 
                                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  value={newSupplier.paymentType}
                                  onChange={(e) => setNewSupplier({...newSupplier, paymentType: e.target.value})}
                              >
                                  <option value="Contado">Contado</option>
                                  <option value="Crédito">Crédito</option>
                              </select>
                          </div>
                      </div>
                  </div>
                  <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                      <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm">Cancelar</button>
                      <button type="button" onClick={handleCreateSupplier} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Guardar Proveedor</button>
                  </div>
              </div>
          </div>
      )}

      {/* Product Creation Modal (Reused) */}
      <ProductFormModal 
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleCreateProduct}
        existingIds={products.map(p => p.id)}
      />
    </div>
  );
};