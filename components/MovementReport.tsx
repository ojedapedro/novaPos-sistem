import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Filter, ArrowUpCircle, ArrowDownCircle, Wallet, Download, X } from 'lucide-react';
import { CashMovement, TransactionType, PaymentMethod } from '../types';
import { DataService } from '../services/dataService';

export const MovementReport: React.FC = () => {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  
  // Filters State
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load latest movements
    setMovements(DataService.getMovements().reverse());
  }, []);

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    return movements.filter(m => {
      const mDate = new Date(m.date).toISOString().split('T')[0];
      
      // 1. Date Range
      const dateMatch = (!startDate || mDate >= startDate) && (!endDate || mDate <= endDate);
      
      // 2. Type (Ingreso/Egreso)
      const typeMatch = typeFilter === 'ALL' || m.type === typeFilter;

      // 3. Payment Method
      const methodMatch = methodFilter === 'ALL' || m.method === methodFilter;

      // 4. Search Text
      const textMatch = 
         m.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (m.reference || '').toLowerCase().includes(searchTerm.toLowerCase());

      return dateMatch && typeMatch && methodMatch && textMatch;
    });
  }, [movements, startDate, endDate, typeFilter, methodFilter, searchTerm]);

  // --- Summary Calculation (Grouped by Currency) ---
  const summaryByCurrency = useMemo(() => {
    const summary: Record<string, { income: number; expense: number; balance: number }> = {};

    filteredData.forEach(m => {
      if (!summary[m.currency]) {
        summary[m.currency] = { income: 0, expense: 0, balance: 0 };
      }

      if (m.type === TransactionType.INGRESO) {
        summary[m.currency].income += m.amount;
        summary[m.currency].balance += m.amount;
      } else {
        summary[m.currency].expense += m.amount;
        summary[m.currency].balance -= m.amount;
      }
    });

    return summary;
  }, [filteredData]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setTypeFilter('ALL');
    setMethodFilter('ALL');
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      
      {/* Controls Bar */}
      <div className="bg-white p-4 border-b border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between sticky top-0 z-20">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
             {/* Date Range */}
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Calendar size={16} className="text-gray-400" />
                <input 
                    type="date" 
                    className="bg-transparent text-sm text-gray-700 outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input 
                    type="date" 
                    className="bg-transparent text-sm text-gray-700 outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
             </div>

             {/* Type Filter */}
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Filter size={16} className="text-gray-400" />
                <select 
                    className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="ALL">Todos los Tipos</option>
                    <option value={TransactionType.INGRESO}>Ingresos</option>
                    <option value={TransactionType.EGRESO}>Egresos</option>
                </select>
             </div>

             {/* Method Filter */}
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Wallet size={16} className="text-gray-400" />
                <select 
                    className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer max-w-[120px]"
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                >
                    <option value="ALL">Todos los Métodos</option>
                    {Object.values(PaymentMethod).map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
             </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-48">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar ref..." 
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             {(searchTerm || typeFilter !== 'ALL' || methodFilter !== 'ALL') && (
                 <button onClick={clearFilters} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                    <X size={18} />
                 </button>
             )}
        </div>
      </div>

      <div className="p-6 flex-1 overflow-auto custom-scrollbar">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {Object.entries(summaryByCurrency).map(([currency, data]) => (
                <div key={currency} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{currency}</span>
                        {data.balance >= 0 ? <ArrowUpCircle className="text-green-500" size={20}/> : <ArrowDownCircle className="text-red-500" size={20}/>}
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Ingresos</span>
                            <span className="font-medium text-green-600">+{data.income.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Egresos</span>
                            <span className="font-medium text-red-600">-{data.expense.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between items-center">
                            <span className="font-bold text-gray-700">Balance</span>
                            <span className={`font-bold text-lg ${data.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {data.balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
            {Object.keys(summaryByCurrency).length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    No hay movimientos para mostrar en el resumen.
                </div>
            )}
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700">Detalle de Movimientos</h3>
                <span className="text-xs text-gray-500">{filteredData.length} registros encontrados</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white text-gray-500 font-medium text-xs uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Origen / Ref</th>
                            <th className="px-6 py-4 text-center">Tipo</th>
                            <th className="px-6 py-4">Método</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                            <th className="px-6 py-4 text-right">Saldo Línea</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    No se encontraron registros con los filtros actuales.
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((mov) => (
                                <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-600">
                                        <div className="font-medium">{new Date(mov.date).toLocaleDateString()}</div>
                                        <div className="text-xs text-gray-400">{new Date(mov.date).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-800">{mov.origin}</div>
                                        <div className="text-xs text-gray-400 font-mono">{mov.reference || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                            mov.type === TransactionType.INGRESO 
                                            ? 'bg-green-50 text-green-700 border-green-100' 
                                            : 'bg-red-50 text-red-700 border-red-100'
                                        }`}>
                                            {mov.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {mov.method}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${
                                        mov.type === TransactionType.INGRESO ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {mov.type === TransactionType.INGRESO ? '+' : '-'}
                                        {mov.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} 
                                        <span className="text-xs text-gray-400 font-normal ml-1">{mov.currency}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-400">
                                        {/* Placeholder for running balance if needed logic is complex here */}
                                        -
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};