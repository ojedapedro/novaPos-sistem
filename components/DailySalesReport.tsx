import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingDown, Wallet, CreditCard, Calculator } from 'lucide-react';
import { DataService } from '../services/dataService';
import { StatCard } from './StatCard';
import { ExchangeRate, TransactionType, PaymentMethod, TransactionOrigin } from '../types';

interface DailySalesReportProps {
  exchangeRate: ExchangeRate;
}

export const DailySalesReport: React.FC<DailySalesReportProps> = ({ exchangeRate }) => {
  const sales = DataService.getSales();
  const movements = DataService.getMovements();

  // --- 1. Filter Data for "Today" ---
  const today = new Date();
  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear();
  };

  const salesToday = sales.filter(s => isToday(s.date));
  const movementsToday = movements.filter(m => isToday(m.date));

  // --- 2. Calculate Key Daily Metrics ---
  
  // Total Sales (Revenue recorded in SaleHeader)
  const totalSalesRevenueUSD = salesToday.reduce((acc, curr) => acc + curr.total, 0);
  const totalSalesRevenueBs = totalSalesRevenueUSD * exchangeRate.usdToBs;

  // Helper: Convert any amount to USD for aggregation
  const toUSD = (amount: number, currency: string) => {
    if (currency === 'USD') return amount;
    if (currency === 'BS') return amount / exchangeRate.usdToBs;
    if (currency === 'EUR') return (amount * exchangeRate.eurToBs) / exchangeRate.usdToBs;
    return amount;
  };

  // Total Income (Ingresos - 'Pagos_Contado') from Movements
  const incomeMovements = movementsToday.filter(m => m.type === TransactionType.INGRESO);
  const totalIncomeUSD = incomeMovements.reduce((acc, m) => acc + toUSD(m.amount, m.currency), 0);

  // Total Expenses (Egresos - 'Movimientos_Caja') from Movements
  const expenseMovements = movementsToday.filter(m => m.type === TransactionType.EGRESO);
  const totalExpensesUSD = expenseMovements.reduce((acc, m) => acc + toUSD(m.amount, m.currency), 0);

  // Net Flow
  const netFlow = totalIncomeUSD - totalExpensesUSD;

  // --- 3. Breakdown by Payment Method ---
  const incomeByMethod = useMemo(() => {
    const grouped: Record<string, { totalNative: number; currency: string; count: number; totalUSD: number }> = {};

    incomeMovements.forEach(m => {
      if (!grouped[m.method]) {
        grouped[m.method] = { totalNative: 0, currency: m.currency, count: 0, totalUSD: 0 };
      }
      grouped[m.method].totalNative += m.amount;
      grouped[m.method].totalUSD += toUSD(m.amount, m.currency);
      grouped[m.method].count += 1;
    });

    return Object.entries(grouped).map(([method, data]) => ({
      method: method as PaymentMethod,
      ...data
    })).sort((a, b) => b.totalUSD - a.totalUSD);
  }, [incomeMovements, exchangeRate]);

  // --- 4. Chart Data (Last 7 Days) for context ---
  const salesTrendData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return { 
            label: d.toLocaleDateString('es-ES', { weekday: 'short' }), 
            dateStr: d.toDateString() 
        };
    }).reverse();
    
    return last7Days.map(day => {
        const dailyTotal = sales
            .filter(s => new Date(s.date).toDateString() === day.dateStr)
            .reduce((sum, s) => sum + s.total, 0);
        return { name: day.label, ventas: dailyTotal };
    });
  }, [sales]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Reporte Diario de Caja</h2>
           <p className="text-gray-500 text-sm capitalize">{today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-right hidden sm:block">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Tasa de Cambio</div>
            <div className="font-mono font-bold text-gray-700 flex items-center gap-2">
                <Calculator size={16} className="text-blue-500"/>
                {exchangeRate.usdToBs.toFixed(2)} Bs/$
            </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Ventas del Día (Total)</p>
                <h3 className="text-2xl font-bold text-gray-800">${totalSalesRevenueUSD.toFixed(2)}</h3>
                <p className="text-sm font-medium text-gray-400 mt-1">
                    Bs. {totalSalesRevenueBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <DollarSign size={24} />
            </div>
        </div>

        <StatCard 
          title="Egresos Operativos" 
          value={`$${totalExpensesUSD.toFixed(2)}`} 
          icon={TrendingDown} 
          color="red"
          trend={`${expenseMovements.length} movimientos`}
        />
        <StatCard 
          title="Flujo Neto (Caja)" 
          value={`$${netFlow.toFixed(2)}`} 
          icon={Wallet} 
          color={netFlow >= 0 ? "green" : "red"}
          trend="Ingresos - Egresos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Method Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CreditCard size={20} className="text-blue-500"/>
                Ingresos por Método de Pago
             </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3 text-left">Método</th>
                  <th className="px-6 py-3 text-right">Recibido (Moneda Orig.)</th>
                  <th className="px-6 py-3 text-right">Equivalente (USD)</th>
                  <th className="px-6 py-3 text-center">% Flujo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incomeByMethod.length > 0 ? (
                    incomeByMethod.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                            <div className="font-medium text-gray-800">{item.method}</div>
                            <div className="text-xs text-gray-400">{item.count} transacciones</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className="font-mono font-bold text-gray-700">
                                {item.totalNative.toLocaleString('es-VE', { minimumFractionDigits: 2 })} 
                                <span className="text-xs text-gray-500 ml-1">{item.currency}</span>
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className="text-gray-600 font-medium">
                                ${item.totalUSD.toFixed(2)}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 rounded-full" 
                                        style={{ width: `${(item.totalUSD / (totalIncomeUSD || 1)) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {Math.round((item.totalUSD / (totalIncomeUSD || 1)) * 100)}%
                                </span>
                            </div>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                            No se han registrado ingresos hoy.
                        </td>
                    </tr>
                )}
              </tbody>
              {incomeByMethod.length > 0 && (
                <tfoot className="bg-gray-50">
                    <tr>
                        <td className="px-6 py-3 font-bold text-gray-700">Total Recaudado</td>
                        <td className="px-6 py-3"></td>
                        <td className="px-6 py-3 text-right font-bold text-green-600">${totalIncomeUSD.toFixed(2)}</td>
                        <td></td>
                    </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Expenses List & Trend Chart */}
        <div className="space-y-6">
            {/* Daily Expenses List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingDown size={20} className="text-red-500"/>
                    Egresos (Mov. Caja)
                </h3>
                {expenseMovements.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        Sin egresos registrados hoy.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expenseMovements.map(mov => (
                            <div key={mov.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                <div>
                                    <div className="text-sm font-semibold text-gray-800">{mov.origin}</div>
                                    <div className="text-xs text-red-500 max-w-[120px] truncate" title={mov.reference}>{mov.reference || 'Sin referencia'}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-red-600">-{mov.amount.toFixed(2)} {mov.currency}</div>
                                    {mov.currency !== 'USD' && (
                                        <div className="text-xs text-gray-400">-${toUSD(mov.amount, mov.currency).toFixed(2)}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                         <div className="pt-3 border-t border-red-100 flex justify-between items-center mt-2">
                            <span className="text-xs font-bold text-red-800 uppercase">Total Egresos</span>
                            <span className="text-sm font-bold text-red-600">${totalExpensesUSD.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Simple Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-64">
                <h3 className="text-sm font-semibold text-gray-500 mb-4">Tendencia Ventas (7 días)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#9ca3af'}} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f3f4f6' }}
                    />
                    <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};
