import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Calendar, FileText, Package } from 'lucide-react';
import { Product, TransactionType } from '../types';
import { DataService } from '../services/dataService';

interface KardexModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

interface KardexEntry {
  id: string;
  date: string;
  type: 'Entrada' | 'Salida';
  documentType: 'Compra' | 'Venta';
  quantity: number;
  unitValue: number;
  balance: number; // Stock después del movimiento
}

export const KardexModal: React.FC<KardexModalProps> = ({ isOpen, onClose, product }) => {
  const [history, setHistory] = useState<KardexEntry[]>([]);

  useEffect(() => {
    if (isOpen && product) {
      const sales = DataService.getSales();
      const saleDetails = DataService.getSaleDetails();
      const purchases = DataService.getPurchases();
      const purchaseDetails = DataService.getPurchaseDetails();

      // 1. Obtener Salidas (Ventas)
      const exits: KardexEntry[] = saleDetails
        .filter(d => d.productId === product.id)
        .map(d => {
          const header = sales.find(s => s.id === d.saleId);
          return {
            id: d.saleId,
            date: header ? header.date : new Date().toISOString(),
            type: 'Salida',
            documentType: 'Venta',
            quantity: d.quantity,
            unitValue: d.priceUnit,
            balance: 0 // Se calcula después
          };
        });

      // 2. Obtener Entradas (Compras)
      const entries: KardexEntry[] = purchaseDetails
        .filter(d => d.productId === product.id)
        .map(d => {
          const header = purchases.find(p => p.id === d.purchaseId);
          return {
            id: d.purchaseId,
            date: header ? header.date : new Date().toISOString(),
            type: 'Entrada',
            documentType: 'Compra',
            quantity: d.quantity,
            unitValue: d.costUnit,
            balance: 0 // Se calcula después
          };
        });

      // 3. Unificar y Ordenar (Más reciente primero)
      const combined = [...exits, ...entries].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // 4. Calcular Saldo Retrospectivo
      // Partimos del stock actual y vamos "deshaciendo" los movimientos hacia atrás
      let currentBalance = product.stock;
      
      const historyWithBalance = combined.map(item => {
        const entryWithBalance = { ...item, balance: currentBalance };
        
        // Preparar el balance para el siguiente item (que es más antiguo)
        if (item.type === 'Entrada') {
          currentBalance -= item.quantity; // Si entró, antes había menos
        } else {
          currentBalance += item.quantity; // Si salió, antes había más
        }
        
        return entryWithBalance;
      });

      setHistory(historyWithBalance);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div>
             <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Package size={20} />
                <span className="font-mono text-sm font-semibold bg-blue-100 px-2 py-0.5 rounded text-blue-700">{product.id}</span>
             </div>
             <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
             <div className="text-sm text-gray-500 flex gap-4 mt-2">
                <span>Categoría: <strong>{product.category}</strong></span>
                <span>Stock Actual: <strong className="text-gray-800 text-lg">{product.stock}</strong></span>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar p-6">
           <table className="w-full text-left border-collapse">
              <thead className="bg-white text-gray-500 font-medium text-xs uppercase border-b-2 border-gray-100 sticky top-0">
                  <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4 text-center">Operación</th>
                      <th className="py-3 px-4 text-right">Cantidad</th>
                      <th className="py-3 px-4 text-right">Valor Unit.</th>
                      <th className="py-3 px-4 text-right">Saldo Stock</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                  {history.length === 0 ? (
                      <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-400">
                              No hay movimientos registrados para este producto.
                          </td>
                      </tr>
                  ) : (
                      history.map((item, idx) => (
                          <tr key={`${item.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-gray-600">
                                  <div className="flex items-center gap-2">
                                      <Calendar size={14} className="text-gray-400"/>
                                      {new Date(item.date).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-400 pl-6">{new Date(item.date).toLocaleTimeString()}</div>
                              </td>
                              <td className="py-3 px-4">
                                  <div className="font-medium text-gray-700 flex items-center gap-2">
                                    <FileText size={14} className="text-gray-400"/>
                                    {item.id}
                                  </div>
                                  <div className="text-xs text-gray-500 pl-6">{item.documentType}</div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                  {item.type === 'Entrada' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                          <ArrowDownLeft size={12} /> Compra
                                      </span>
                                  ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                          <ArrowUpRight size={12} /> Venta
                                      </span>
                                  )}
                              </td>
                              <td className={`py-3 px-4 text-right font-bold ${item.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.type === 'Entrada' ? '+' : '-'}{item.quantity}
                              </td>
                              <td className="py-3 px-4 text-right text-gray-600">
                                  ${item.unitValue.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-gray-800 bg-gray-50/50">
                                  {item.balance}
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
           </table>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium">
                Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};