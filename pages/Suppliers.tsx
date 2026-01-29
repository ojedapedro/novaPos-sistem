import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, User, Phone, CreditCard, Trash2, Edit2 } from 'lucide-react';
import { Supplier } from '../types';
import { DataService } from '../services/dataService';
import { SupplierFormModal } from '../components/SupplierFormModal';
import { useNotification } from '../context/NotificationContext';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    setSuppliers(DataService.getSuppliers());
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.phone.includes(searchTerm)
    );
  }, [suppliers, searchTerm]);

  // Handlers
  const handleNewSupplier = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDeleteSupplier = (id: string) => {
      if (confirm('¿Está seguro de eliminar este proveedor?')) {
          DataService.deleteSupplier(id);
          setSuppliers(DataService.getSuppliers());
          showNotification('success', 'Proveedor eliminado correctamente');
      }
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    DataService.saveSupplier(supplier);
    setSuppliers(DataService.getSuppliers());
    setIsModalOpen(false);
    showNotification('success', 'Proveedor guardado correctamente');
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Proveedores</h2>
        <button 
            onClick={handleNewSupplier}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar proveedor..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-medium text-sm sticky top-0 z-10 shadow-sm">
                <tr>
                <th className="p-4 border-b border-gray-100">Nombre</th>
                <th className="p-4 border-b border-gray-100">Teléfono</th>
                <th className="p-4 border-b border-gray-100">Condición Pago</th>
                <th className="p-4 border-b border-gray-100 text-center">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400">No se encontraron proveedores.</td>
                    </tr>
                ) : (
                    filteredSuppliers.map(supplier => (
                    <tr key={supplier.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="p-4 text-gray-800 font-medium flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <User size={16} />
                            </div>
                            {supplier.name}
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                            <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400" />
                                {supplier.phone || '-'}
                            </div>
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                             <div className="flex items-center gap-2">
                                <CreditCard size={14} className="text-gray-400" />
                                <span className={`px-2 py-0.5 rounded text-xs border ${supplier.paymentType === 'Contado' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                    {supplier.paymentType}
                                </span>
                            </div>
                        </td>
                        <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                                <button 
                                    onClick={() => handleEditSupplier(supplier)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteSupplier(supplier.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
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

      <SupplierFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveSupplier}
        initialData={editingSupplier}
      />
    </div>
  );
};