import React from 'react';
import { MovementReport } from '../components/MovementReport';

export const Transactions: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-0">
          <h2 className="text-2xl font-bold text-gray-800">Movimientos de Caja</h2>
          <p className="text-gray-500 text-sm mb-4">Registro y auditoría de todas las transacciones financieras.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <MovementReport />
      </div>
    </div>
  );
};