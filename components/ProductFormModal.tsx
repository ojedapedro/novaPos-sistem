import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  initialData?: Product | null;
  existingIds: string[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSave, initialData, existingIds }) => {
  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    category: 'General',
    priceBuy: 0,
    priceSell: 0,
    stock: 0,
    minStock: 5,
    active: true
  });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Reset form for new product
      setFormData({
        id: '',
        name: '',
        category: 'General',
        priceBuy: 0,
        priceSell: 0,
        stock: 0,
        minStock: 5,
        active: true
      });
    }
    setError('');
  }, [initialData, isOpen]);

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.id.trim()) return setError('El código es obligatorio');
    if (!formData.name.trim()) return setError('El nombre es obligatorio');
    if (formData.priceBuy < 0) return setError('El costo no puede ser negativo');
    if (formData.priceSell < 0) return setError('El precio no puede ser negativo');

    // Check ID uniqueness only if creating new
    if (!initialData && existingIds.includes(formData.id)) {
        return setError('Este código de producto ya existe');
    }

    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">
            {initialData ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Código (ID)</label>
                    <input 
                        type="text" 
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${initialData ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                        value={formData.id}
                        onChange={(e) => handleChange('id', e.target.value)}
                        disabled={!!initialData}
                        placeholder="Ej: P001"
                    />
                </div>
                 <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Categoría</label>
                    <input 
                        type="text" 
                        list="categories-list"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        placeholder="Ej: Alimentos"
                    />
                    <datalist id="categories-list">
                        <option value="Alimentos" />
                        <option value="Bebidas" />
                        <option value="Limpieza" />
                        <option value="Personal" />
                        <option value="Electrónica" />
                    </datalist>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del Producto</label>
                <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Descripción completa..."
                />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Costo ($)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">$</span>
                        <input 
                            type="number" 
                            step="0.01"
                            className="w-full pl-6 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.priceBuy}
                            onChange={(e) => handleChange('priceBuy', parseFloat(e.target.value))}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Precio Venta ($)</label>
                    <div className="relative">
                         <span className="absolute left-3 top-2 text-gray-400">$</span>
                         <input 
                            type="number" 
                            step="0.01"
                            className="w-full pl-6 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.priceSell}
                            onChange={(e) => handleChange('priceSell', parseFloat(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Stock Actual</label>
                    <input 
                        type="number" 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.stock}
                        onChange={(e) => handleChange('stock', parseInt(e.target.value))}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Stock Mínimo</label>
                    <input 
                        type="number" 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.minStock}
                        onChange={(e) => handleChange('minStock', parseInt(e.target.value))}
                    />
                </div>
            </div>
            
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <input 
                    type="checkbox" 
                    id="activeCheck"
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={formData.active}
                    onChange={(e) => handleChange('active', e.target.checked)}
                />
                <label htmlFor="activeCheck" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Producto Activo (Visible en Venta)
                </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                    <Save size={18} /> Guardar Producto
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};