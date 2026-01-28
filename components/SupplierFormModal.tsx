import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, CreditCard, AlertCircle } from 'lucide-react';
import { Supplier } from '../types';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  initialData?: Supplier | null;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Supplier>({
    id: '',
    name: '',
    phone: '',
    paymentType: 'Contado'
  });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: '',
        name: '',
        phone: '',
        paymentType: 'Contado'
      });
    }
    setError('');
  }, [initialData, isOpen]);

  const handleChange = (field: keyof Supplier, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError('El nombre es obligatorio');
    
    const supplierToSave = {
        ...formData,
        id: initialData ? initialData.id : `S${Date.now()}`
    };

    onSave(supplierToSave);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">
            {initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre Empresa / Proveedor</label>
                <div className="relative">
                    <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        className="w-full pl-10 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Distribuidora Polar"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
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
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Condición de Pago Habitual</label>
                <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <select 
                        className="w-full pl-10 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={formData.paymentType}
                        onChange={(e) => handleChange('paymentType', e.target.value)}
                    >
                        <option value="Contado">Contado</option>
                        <option value="Crédito">Crédito</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                >
                    <Save size={16} /> Guardar
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};