import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Package, DollarSign, Menu, Bell, Truck, Loader2, Users, RefreshCw, Wallet } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Transactions } from './pages/Transactions';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { CashClose } from './pages/CashClose';
import { ExchangeRate } from './types';
import { DataService } from './services/dataService';
import { NotificationProvider, useNotification } from './context/NotificationContext';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'purchases' | 'inventory' | 'transactions' | 'suppliers' | 'cash_close'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showNotification } = useNotification();
  
  // Exchange Rate State (Lifted up to manage globally)
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({
    usdToBs: 45.50,
    eurToBs: 48.20
  });

  useEffect(() => {
    const initApp = async () => {
      // Load data from Google Sheets (or fallback to local)
      await DataService.initialize();
      setIsLoading(false);
    };
    initApp();
  }, []);

  const handleUpdateExchangeRate = (newRate: number) => {
    setExchangeRate(prev => ({
      ...prev,
      usdToBs: newRate
    }));
    showNotification('info', `Tasa actualizada a ${newRate.toFixed(2)} Bs/$`);
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await DataService.initialize();
      // Pequeño timeout para que el usuario perciba la acción si es muy rápida
      await new Promise(resolve => setTimeout(resolve, 800));
      showNotification('success', 'Datos sincronizados correctamente con la nube');
    } catch (error) {
      console.error("Error syncing", error);
      showNotification('error', 'Error al sincronizar datos');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard exchangeRate={exchangeRate} />;
      case 'pos': return <POS exchangeRate={exchangeRate} onUpdateExchangeRate={handleUpdateExchangeRate} />;
      case 'purchases': return <Purchases exchangeRate={exchangeRate} />;
      case 'inventory': return <Inventory />;
      case 'transactions': return <Transactions />;
      case 'suppliers': return <Suppliers />;
      case 'cash_close': return <CashClose exchangeRate={exchangeRate} />;
      default: return <Dashboard exchangeRate={exchangeRate} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 font-medium">Sincronizando con NovaPOS BD...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20 print:hidden">
        <div className="h-20 flex items-center px-8 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-800">NovaPOS</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('pos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'pos' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <ShoppingCart size={20} />
            <span>Punto de Venta</span>
          </button>

          <button 
            onClick={() => setActiveTab('purchases')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'purchases' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Truck size={20} />
            <span>Compras</span>
          </button>

          <button 
             onClick={() => setActiveTab('inventory')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'inventory' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Package size={20} />
            <span>Inventario</span>
          </button>

          <button 
             onClick={() => setActiveTab('suppliers')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'suppliers' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Users size={20} />
            <span>Proveedores</span>
          </button>

          <button 
             onClick={() => setActiveTab('transactions')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'transactions' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <DollarSign size={20} />
            <span>Movimientos</span>
          </button>

          <button 
             onClick={() => setActiveTab('cash_close')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'cash_close' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Wallet size={20} />
            <span>Cierre de Caja</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg shadow-blue-200">
            <p className="text-xs opacity-80 mb-1">Tasa del día</p>
            <div className="flex justify-between items-center">
              <span className="font-bold">USD</span>
              <span className="font-mono">{exchangeRate.usdToBs.toFixed(2)} Bs</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="font-bold">EUR</span>
              <span className="font-mono">{exchangeRate.eurToBs.toFixed(2)} Bs</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10 print:hidden">
          <h1 className="text-xl font-bold text-gray-800 capitalize">
            {activeTab === 'pos' ? 'Punto de Venta' : 
             activeTab === 'cash_close' ? 'Cierre de Caja' : activeTab}
          </h1>
          
          <div className="flex items-center gap-4">
             {/* Sync Button */}
             <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${isSyncing ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}
                title="Sincronizar datos con la nube"
             >
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
             </button>

             <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full relative">
               <Bell size={20} />
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                <img src="https://picsum.photos/100/100" alt="User" className="w-full h-full object-cover" />
             </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto bg-gray-50 custom-scrollbar relative print:overflow-visible print:bg-white">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
};

export default App;