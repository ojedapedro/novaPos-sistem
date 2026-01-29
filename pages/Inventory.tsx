import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, AlertCircle, X, CheckCircle2, Ban, Edit2, ClipboardList } from 'lucide-react';
import { Product } from '../types';
import { DataService } from '../services/dataService';
import { ProductFormModal } from '../components/ProductFormModal';
import { KardexModal } from '../components/KardexModal';
import { useNotification } from '../context/NotificationContext';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [stockFilter, setStockFilter] = useState('Todos');

  // Estados para Modal Producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Estados para Modal Kardex
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [selectedProductForKardex, setSelectedProductForKardex] = useState<Product | null>(null);

  useEffect(() => {
    setProducts(DataService.getProducts());
  }, []);

  // Helpers
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'Todas' || p.category === categoryFilter;
        const matchesStatus = statusFilter === 'Todos' ? true : statusFilter === 'Activo' ? p.active : !p.active;
        const matchesStock = stockFilter === 'Todos' ? true : p.stock <= p.minStock;
        return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter]);

  const activeFiltersCount = (categoryFilter !== 'Todas' ? 1 : 0) + (statusFilter !== 'Todos' ? 1 : 0) + (stockFilter !== 'Todos' ? 1 : 0);

  // Handlers
  const handleNewProduct = () => {
      setEditingProduct(null);
      setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
      setEditingProduct(product);
      setIsModalOpen(true);
  };

  const handleOpenKardex = (product: Product) => {
      setSelectedProductForKardex(product);
      setIsKardexOpen(true);
  };

  const handleSaveProduct = (product: Product) => {
      DataService.updateProduct(product);
      setProducts(DataService.getProducts()); // Refresh local list
      setIsModalOpen(false);
      showNotification('success', 'Producto guardado correctamente');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('Todas');
    setStatusFilter('Todos');
    setStockFilter('Todos');
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventario</h2>
        <button 
            onClick={handleNewProduct}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-gray-100 space-y-4">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                    type="text" 
                    placeholder="Buscar por código, nombre o categoría..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                    <Filter size={18} /> 
                    Filtros
                    {activeFiltersCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-fade-in grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Categoría</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Estado</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="Todos">Todos</option>
                            <option value="Activo">Activos</option>
                            <option value="Inactivo">Inactivos</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Nivel de Stock</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
                            <option value="Todos">Todos</option>
                            <option value="Bajo">Stock Bajo (Alerta)</option>
                        </select>
                    </div>
                    <div>
                        <button onClick={clearFilters} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <X size={16} /> Limpiar Filtros
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-medium text-sm sticky top-0 z-10 shadow-sm">
                <tr>
                <th className="p-4 border-b border-gray-100">Código</th>
                <th className="p-4 border-b border-gray-100">Producto</th>
                <th className="p-4 border-b border-gray-100">Categoría</th>
                <th className="p-4 border-b border-gray-100 text-right">Costo</th>
                <th className="p-4 border-b border-gray-100 text-right">Precio Venta</th>
                <th className="p-4 border-b border-gray-100 text-center">Stock</th>
                <th className="p-4 border-b border-gray-100 text-center">Estado</th>
                <th className="p-4 border-b border-gray-100 text-center">Acción</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">No se encontraron productos.</td>
                    </tr>
                ) : (
                    filtered.map(product => (
                    <tr key={product.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="p-4 text-gray-500 text-sm font-mono">{product.id}</td>
                        <td className="p-4 font-medium text-gray-800">{product.name}</td>
                        <td className="p-4 text-gray-600 text-sm"><span className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">{product.category}</span></td>
                        <td className="p-4 text-right text-gray-600 text-sm">${product.priceBuy.toFixed(2)}</td>
                        <td className="p-4 text-right font-medium text-blue-600">${product.priceSell.toFixed(2)}</td>
                        <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                {product.stock <= product.minStock && <AlertCircle size={16} className="text-red-500" />}
                                <span className={`${product.stock <= product.minStock ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{product.stock}</span>
                            </div>
                        </td>
                        <td className="p-4 text-center">
                            {product.active ? 
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"><CheckCircle2 size={12} /> Activo</span> : 
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200"><Ban size={12} /> Inactivo</span>
                            }
                        </td>
                        <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                                <button 
                                    onClick={() => handleOpenKardex(product)}
                                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Ver Kardex (Movimientos)"
                                >
                                    <ClipboardList size={16} />
                                </button>
                                <button 
                                    onClick={() => handleEditProduct(product)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar Producto"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>

      <ProductFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveProduct}
        initialData={editingProduct}
        existingIds={products.map(p => p.id)}
      />

      <KardexModal 
        isOpen={isKardexOpen}
        onClose={() => setIsKardexOpen(false)}
        product={selectedProductForKardex}
      />
    </div>
  );
};