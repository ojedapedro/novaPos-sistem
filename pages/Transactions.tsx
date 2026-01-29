import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Calendar, Filter, X, Search } from 'lucide-react';
import { CashMovement, TransactionType } from '../types';
import { DataService } from '../services/dataService';

export const Transactions: React.FC = () => {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  
  // Initialize dates to current month range
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setMovements(DataService.getMovements().reverse()); // Newest first
  }, []);

  // --- Filtering Logic ---
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const mDate = new Date(m.date).toISOString().split('T')[0];
      
      // Date Range Check
      const inDateRange = (!startDate || mDate >= startDate) && (!endDate || mDate <= endDate);
      
      // Text Search Check (Reference, Origin, Method)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
         m.origin.toLowerCase().includes(searchLower) ||
         m.method.toLowerCase().includes(searchLower) ||
         (m.reference || '').toLowerCase().includes(searchLower);

      return inDateRange && matchesSearch;
    });
  }, [movements, startDate, endDate, searchTerm]);

  // --- Summary Statistics for Filtered View ---
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    // Note: This summary sums up raw amounts regardless of currency for a quick view.
    // For a strict accounting view, we would need the exchange rate here to normalize.
    // We display distinct totals per currency or just a raw sum if acceptable for simple view.
    // Let's group by currency for accuracy.
    const totalsByCurrency: Record<string, { income: number, expense: number }> = {};

    filteredMovements.forEach(m => {
        if (!totalsByCurrency[m.currency]) {
            totalsByCurrency[m.currency] = { income: 0, expense: 0 };
        }
        if (m.type === TransactionType.INGRESO) {
            totalsByCurrency[m.currency].income += m.amount;
        } else {
            totalsByCurrency[m.currency].expense += m.amount;
        }
    });

    return totalsByCurrency;
  }, [filteredMovements]);

  const clearFilters = () => {
      setStartDate('');
      setEndDate('');
      setSearchTerm('');
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Movimientos de Caja</h2>
            <p className="text-gray-500 text-sm">Registro detallado de ingresos y egresos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 px-2 border-r border-gray-200">
                <Search size={18} className="text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar ref..." 
                    className="text-sm outline-none w-24 md:w-32"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 px-2">
                <Calendar size={18} className="text-gray-400" />
                <input 
                    type="date" 
                    className="text-sm text-gray-600 outline-none bg-transparent" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                />
                <span className="text-gray-400">-</span>
                <input 
                    type="date" 
                    className="text-sm text-gray-600 outline-none bg-transparent" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                />
            </div>
            {(startDate || endDate || searchTerm) && (
                <button 
                    onClick={clearFilters}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Limpiar Filtros"
                >
                    <X size={16} />
                </button>
            )}
        </div>
      </div>
      
      {/* Dynamic Summary Cards for Filtered Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(summary).map(([currency, totals]) => (
            <React.Fragment key={currency}>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Entradas ({currency})</p>
                    <div className="flex items-center gap-2">
                        <ArrowUpRight size={20} className="text-green-500" />
                        <span className="text-xl font-bold text-gray-800">+{totals.income.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
                 <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Salidas ({currency})</p>
                     <div className="flex items-center gap-2">
                        <ArrowDownLeft size={20} className="text-red-500" />
                        <span className="text-xl font-bold text-gray-800">-{totals.expense.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </React.Fragment>
        ))}
        {Object.keys(summary).length === 0 && (
             <div className="col-span-full bg-gray-50 p-3 rounded-lg text-center text-gray-400 text-sm border border-dashed border-gray-200">
                No hay movimientos en el rango seleccionado.
             </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium text-sm sticky top-0 z-10">
                <tr>
                <th className="p-4 border-b border-gray-100">Fecha/Hora</th>
                <th className="p-4 border-b border-gray-100">Origen</th>
                <th className="p-4 border-b border-gray-100">Método</th>
                <th className="p-4 border-b border-gray-100">Referencia</th>
                <th className="p-4 border-b border-gray-100 text-right">Monto</th>
                <th className="p-4 border-b border-gray-100 text-center">Moneda</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredMovements.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                            No se encontraron registros. Intente cambiar los filtros.
                        </td>
                    </tr>
                ) : (
                    filteredMovements.map(mov => (
                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-gray-600 text-sm">
                        <div className="font-medium text-gray-800">{new Date(mov.date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">{new Date(mov.date).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${mov.origin === 'Venta' ? 'bg-blue-50 text-blue-700 border-blue-100' : mov.origin === 'Compra' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                            {mov.origin}
                        </span>
                        </td>
                        <td className="p-4 text-gray-700 text-sm">{mov.method}</td>
                        <td className="p-4 text-gray-500 text-sm font-mono">{mov.reference || '-'}</td>
                        <td className={`p-4 text-right font-bold ${mov.type === TransactionType.INGRESO ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="flex items-center justify-end gap-1">
                            {mov.type === TransactionType.INGRESO ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            {mov.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                        </td>
                        <td className="p-4 text-center">
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{mov.currency}</span>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};