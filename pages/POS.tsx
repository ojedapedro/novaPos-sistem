import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, X, Check } from 'lucide-react';
import { Product, CartItem, Client, SaleType, SaleStatus, ExchangeRate, PaymentMethod, TransactionType, TransactionOrigin } from '../types';
import { DataService } from '../services/dataService';

interface POSProps {
  exchangeRate: ExchangeRate;
}

export const POS: React.FC<POSProps> = ({ exchangeRate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('C001'); // Default general client
  const [clients, setClients] = useState<Client[]>([]);
  
  // Checkout Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    [PaymentMethod.EFECTIVO_USD]: 0,
    [PaymentMethod.EFECTIVO_BS]: 0,
    [PaymentMethod.PAGO_MOVIL]: 0,
    [PaymentMethod.ZELLE]: 0,
    [PaymentMethod.CASHEA]: 0,
    ref: ''
  });
  const [saleType, setSaleType] = useState<SaleType>(SaleType.CONTADO);

  useEffect(() => {
    setProducts(DataService.getProducts());
    setClients(DataService.getClients());
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.active && 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // Stock limit
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
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
    const numVal = parseFloat(value) || 0;
    setPaymentDetails(prev => ({ ...prev, [method]: numVal }));
  };

  // Logic to calculate remaining amount in USD equivalent
  const totalPaidInUSD = 
    paymentDetails[PaymentMethod.EFECTIVO_USD] +
    (paymentDetails[PaymentMethod.EFECTIVO_BS] / exchangeRate.usdToBs) +
    (paymentDetails[PaymentMethod.PAGO_MOVIL] / exchangeRate.usdToBs) +
    paymentDetails[PaymentMethod.ZELLE] +
    paymentDetails[PaymentMethod.CASHEA]; // Cashea typically processed in USD or fixed rate

  const remainingUSD = Math.max(0, cartTotalUSD - totalPaidInUSD);

  const processSale = () => {
    if (cart.length === 0) return;
    if (saleType === SaleType.CONTADO && remainingUSD > 0.01) {
      alert("El pago está incompleto.");
      return;
    }

    const saleId = `V${Date.now()}`;
    const newSale = {
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

    // Generate Cash Movements for each non-zero payment method
    const movements = [];
    if (paymentDetails[PaymentMethod.EFECTIVO_USD] > 0) {
      movements.push(createMovement(saleId, PaymentMethod.EFECTIVO_USD, paymentDetails[PaymentMethod.EFECTIVO_USD], 'USD'));
    }
    if (paymentDetails[PaymentMethod.EFECTIVO_BS] > 0) {
      movements.push(createMovement(saleId, PaymentMethod.EFECTIVO_BS, paymentDetails[PaymentMethod.EFECTIVO_BS], 'BS'));
    }
    if (paymentDetails[PaymentMethod.PAGO_MOVIL] > 0) {
      movements.push(createMovement(saleId, PaymentMethod.PAGO_MOVIL, paymentDetails[PaymentMethod.PAGO_MOVIL], 'BS'));
    }
    if (paymentDetails[PaymentMethod.ZELLE] > 0) {
      movements.push(createMovement(saleId, PaymentMethod.ZELLE, paymentDetails[PaymentMethod.ZELLE], 'USD'));
    }

    DataService.saveSale(newSale, saleDetails, movements);
    
    // Reset
    setCart([]);
    setIsModalOpen(false);
    setProducts(DataService.getProducts()); // Refresh stock display
    alert("Venta procesada con éxito.");
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

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* Product Catalog */}
      <div className="w-2/3 p-6 overflow-y-auto custom-scrollbar">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar productos por nombre o categoría..." 
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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

      {/* Cart Sidebar */}
      <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-gray-700 mb-4">
            <ShoppingCart size={20} />
            <h2 className="font-bold text-lg">Carrito de Venta</h2>
          </div>
          <select 
            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <ShoppingCart size={48} className="mx-auto mb-3 opacity-20" />
              <p>El carrito está vacío</p>
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

      {/* Payment Modal */}
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
                      <div className="text-xl font-bold">${remainingUSD.toFixed(2)}</div>
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
                        <input type="number" className="w-full p-2 border rounded-lg" placeholder="0.00" 
                          onChange={(e) => handlePaymentChange(PaymentMethod.EFECTIVO_USD, e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Efectivo Bs</label>
                        <input type="number" className="w-full p-2 border rounded-lg" placeholder="0.00" 
                           onChange={(e) => handlePaymentChange(PaymentMethod.EFECTIVO_BS, e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Pago Móvil (Bs)</label>
                        <input type="number" className="w-full p-2 border rounded-lg" placeholder="0.00" 
                           onChange={(e) => handlePaymentChange(PaymentMethod.PAGO_MOVIL, e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Zelle ($)</label>
                        <input type="number" className="w-full p-2 border rounded-lg" placeholder="0.00" 
                           onChange={(e) => handlePaymentChange(PaymentMethod.ZELLE, e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Referencia (Opcional)</label>
                      <input type="text" className="w-full p-2 border rounded-lg" placeholder="Ref: 123456" 
                        onChange={(e) => setPaymentDetails(prev => ({...prev, ref: e.target.value}))} />
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
    </div>
  );
};
