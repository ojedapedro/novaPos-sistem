import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Printer, DollarSign, ArrowUpCircle, ArrowDownCircle, Wallet, FileText, Search } from 'lucide-react';
import { DataService } from '../services/dataService';
import { CashMovement, ExchangeRate, TransactionType } from '../types';

interface CashCloseProps {
  exchangeRate: ExchangeRate;
}

interface BalanceLine {
  method: string;
  currency: string;
  income: number;
  expense: number;
  balance: number;
}

export const CashClose: React.FC<CashCloseProps> = ({ exchangeRate }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [movements, setMovements] = useState<CashMovement[]>([]);

  useEffect(() => {
    setMovements(DataService.getMovements());
  }, []);

  // --- Logic ---
  const dayMovements = useMemo(() => {
    return movements.filter(m => {
      const mDate = new Date(m.date).toISOString().split('T')[0]; // Compare YYYY-MM-DD
      return mDate === selectedDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, selectedDate]);

  const summary = useMemo(() => {
    const balances: Record<string, BalanceLine> = {};
    let totalIncomeUSD = 0;
    let totalExpenseUSD = 0;

    // Helper to convert to USD for grand total
    const toUSD = (amount: number, currency: string) => {
        if (currency === 'USD') return amount;
        if (currency === 'BS') return amount / exchangeRate.usdToBs;
        if (currency === 'EUR') return (amount * exchangeRate.eurToBs) / exchangeRate.usdToBs;
        return amount;
    };

    dayMovements.forEach(m => {
      const key = `${m.method}-${m.currency}`;
      
      if (!balances[key]) {
        balances[key] = {
          method: m.method,
          currency: m.currency,
          income: 0,
          expense: 0,
          balance: 0
        };
      }

      if (m.type === TransactionType.INGRESO) {
        balances[key].income += m.amount;
        balances[key].balance += m.amount;
        totalIncomeUSD += toUSD(m.amount, m.currency);
      } else {
        balances[key].expense += m.amount;
        balances[key].balance -= m.amount;
        totalExpenseUSD += toUSD(m.amount, m.currency);
      }
    });

    return {
      lines: Object.values(balances).sort((a, b) => a.method.localeCompare(b.method)),
      totalIncomeUSD,
      totalExpenseUSD,
      netTotalUSD: totalIncomeUSD - totalExpenseUSD
    };
  }, [dayMovements, exchangeRate]);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in bg-gray-50/50 print:p-0 print:bg-white print:h-auto print:absolute print:top-0 print:left-0 print:w-full print:z-50">
      
      {/* Header - Screen Only */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-blue-600" />
            Cierre de Caja
          </h2>
          <p className="text-gray-500 text-sm">Resumen de movimientos y arqueo diario</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
           <div className="flex items-center gap-2 px-3 border-r border-gray-200">
              <Calendar size={18} className="text-gray-500" />
              <input 
                type="date" 
                className="outline-none text-gray-700 font-medium bg-transparent"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
           </div>
           <button 
             onClick={handlePrint}
             className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm"
           >
             <Printer size={16} /> Imprimir
           </button>
        </div>
      </div>

      {/* Printable Area Container */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200 flex flex-col flex-1 overflow-hidden print:shadow-none print:border-none print:rounded-none print:overflow-visible">
        
        {/* Printable Header - Only Visible on Print */}
        <div className="hidden print:flex flex-col items-center justify-center mb-8 pb-4 border-b-2 border-gray-800 text-center pt-8 px-8">
             <div className="text-4xl font-black text-gray-900 tracking-tight mb-2">NOVAPOS</div>
             <h1 className="text-xl font-bold text-gray-700 uppercase tracking-widest mb-1">Reporte de Cierre de Caja</h1>
             <p className="text-sm text-gray-500">{formattedDate} • {new Date().toLocaleTimeString()}</p>
        </div>

        {/* Screen Header inside Card */}
        <div className="p-8 border-b border-gray-100 text-center print:hidden">
            <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Reporte de Cierre Diario</h1>
            <p className="text-gray-500 mt-1 capitalize">{formattedDate}</p>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-8 print:p-8 print:overflow-visible">
            
            {/* 1. Grand Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 print:grid-cols-3 print:gap-4 print:mb-6">
                <div className="bg-green-50 p-6 rounded-2xl border border-green-100 print:bg-white print:border-gray-300 print:p-4">
                    <p className="text-green-600 font-medium text-sm mb-1 flex items-center gap-2 print:text-black font-bold uppercase text-xs">
                        <ArrowUpCircle size={16} className="print:hidden"/> Ingresos Totales (Est. USD)
                    </p>
                    <p className="text-3xl font-bold text-green-700 print:text-black print:text-2xl">${summary.totalIncomeUSD.toFixed(2)}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 print:bg-white print:border-gray-300 print:p-4">
                    <p className="text-red-600 font-medium text-sm mb-1 flex items-center gap-2 print:text-black font-bold uppercase text-xs">
                        <ArrowDownCircle size={16} className="print:hidden"/> Egresos Totales (Est. USD)
                    </p>
                    <p className="text-3xl font-bold text-red-700 print:text-black print:text-2xl">${summary.totalExpenseUSD.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 print:bg-white print:border-gray-800 print:border-2 print:p-4">
                    <p className="text-blue-600 font-medium text-sm mb-1 flex items-center gap-2 print:text-black font-bold uppercase text-xs">
                        <DollarSign size={16} className="print:hidden"/> Balance Neto (Est. USD)
                    </p>
                    <p className="text-3xl font-bold text-blue-700 print:text-black print:text-2xl">${summary.netTotalUSD.toFixed(2)}</p>
                </div>
            </div>

            {/* 2. Balance by Method (The core of "Cierre de Caja") */}
            <div className="mb-10 print:mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2 print:text-black print:border-gray-300 print:text-sm print:uppercase">
                    <Wallet size={18} className="text-gray-500 print:hidden"/>
                    Arqueo por Método de Pago
                </h3>
                <table className="w-full text-left border-collapse print:text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold print:bg-white print:text-black print:border-b-2 print:border-black">
                        <tr>
                            <th className="p-3 rounded-l-lg print:rounded-none print:pl-0">Método</th>
                            <th className="p-3 text-right text-green-600 print:text-black">Entradas</th>
                            <th className="p-3 text-right text-red-600 print:text-black">Salidas</th>
                            <th className="p-3 text-right font-bold text-gray-800 rounded-r-lg print:rounded-none print:pr-0">En Caja</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 print:divide-gray-300">
                        {summary.lines.map((line, idx) => (
                            <tr key={idx}>
                                <td className="p-3 font-medium text-gray-700 print:pl-0 print:py-2">
                                    {line.method} <span className="text-xs text-gray-400 font-normal ml-1 print:text-gray-600">({line.currency})</span>
                                </td>
                                <td className="p-3 text-right text-green-600 font-medium print:text-black print:py-2">
                                    {line.income > 0 ? `${line.income.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '-'}
                                </td>
                                <td className="p-3 text-right text-red-500 font-medium print:text-black print:py-2">
                                    {line.expense > 0 ? `(${line.expense.toLocaleString('es-VE', { minimumFractionDigits: 2 })})` : '-'}
                                </td>
                                <td className="p-3 text-right font-bold text-gray-800 bg-gray-50/50 print:bg-white print:pr-0 print:py-2">
                                    {line.balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-gray-500">{line.currency}</span>
                                </td>
                            </tr>
                        ))}
                        {summary.lines.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-6 text-center text-gray-400 italic">No hay movimientos registrados para este día.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 3. Detailed List */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2 print:text-black print:border-gray-300 print:text-sm print:uppercase print:mt-8">
                    <FileText size={18} className="text-gray-500 print:hidden"/>
                    Detalle de Transacciones
                </h3>
                {dayMovements.length > 0 ? (
                    <table className="w-full text-left text-sm print:text-xs">
                        <thead className="text-gray-500 border-b border-gray-100 print:text-black print:border-gray-300">
                            <tr>
                                <th className="pb-2 font-medium print:w-16">Hora</th>
                                <th className="pb-2 font-medium">Concepto / Referencia</th>
                                <th className="pb-2 font-medium">Método</th>
                                <th className="pb-2 font-medium text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 print:divide-gray-200">
                            {dayMovements.map(mov => (
                                <tr key={mov.id} className="group print:break-inside-avoid">
                                    <td className="py-3 text-gray-500 w-24 print:py-1 print:w-16 print:text-gray-600">
                                        {new Date(mov.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="py-3 print:py-1">
                                        <div className="font-medium text-gray-800 print:text-black">{mov.origin}</div>
                                        <div className="text-xs text-gray-400 print:text-gray-500">{mov.reference || 'Sin ref.'}</div>
                                    </td>
                                    <td className="py-3 text-gray-600 print:py-1">
                                        {mov.method}
                                    </td>
                                    <td className={`py-3 text-right font-bold ${mov.type === TransactionType.INGRESO ? 'text-green-600 print:text-black' : 'text-red-600 print:text-black'} print:py-1`}>
                                        {mov.type === TransactionType.INGRESO ? '' : '- '}{mov.amount.toFixed(2)} {mov.currency}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-gray-400 italic text-center py-4">Sin detalles disponibles.</p>
                )}
            </div>

            {/* Signature Area for Print */}
            <div className="mt-20 pt-8 border-t border-gray-300 hidden print:flex justify-between break-inside-avoid">
                <div className="text-center w-1/3">
                    <div className="border-t border-black mb-2 pt-2"></div>
                    <p className="text-xs uppercase font-bold text-gray-700">Firma Cajero</p>
                </div>
                <div className="text-center w-1/3">
                    <div className="border-t border-black mb-2 pt-2"></div>
                    <p className="text-xs uppercase font-bold text-gray-700">Firma Supervisor</p>
                </div>
            </div>

        </div>
      </div>
      
      {/* Print Styles Global Overrides */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: auto; }
          body { -webkit-print-color-adjust: exact; }
          .custom-scrollbar::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </div>
  );
};