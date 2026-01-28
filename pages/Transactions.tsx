import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { CashMovement, TransactionType } from '../types';
import { DataService } from '../services/dataService';

export const Transactions: React.FC = () => {
  const [movements, setMovements] = useState<CashMovement[]>([]);

  useEffect(() => {
    setMovements(DataService.getMovements().reverse()); // Newest first
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Movimientos de Caja</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
            <tr>
              <th className="p-4">Fecha/Hora</th>
              <th className="p-4">Origen</th>
              <th className="p-4">Método</th>
              <th className="p-4">Referencia</th>
              <th className="p-4 text-right">Monto</th>
              <th className="p-4">Moneda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movements.map(mov => (
              <tr key={mov.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-600 text-sm">
                  {new Date(mov.date).toLocaleString()}
                </td>
                <td className="p-4">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                    {mov.origin}
                  </span>
                </td>
                <td className="p-4 text-gray-700 text-sm">{mov.method}</td>
                <td className="p-4 text-gray-500 text-sm font-mono">{mov.reference || '-'}</td>
                <td className={`p-4 text-right font-bold ${mov.type === TransactionType.INGRESO ? 'text-green-600' : 'text-red-600'}`}>
                  <div className="flex items-center justify-end gap-1">
                    {mov.type === TransactionType.INGRESO ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                    {mov.amount.toFixed(2)}
                  </div>
                </td>
                <td className="p-4 text-gray-600 text-sm">{mov.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
