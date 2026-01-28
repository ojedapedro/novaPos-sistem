import React from 'react';
import { ExchangeRate } from '../types';
import { DailySalesReport } from '../components/DailySalesReport';

interface DashboardProps {
  exchangeRate: ExchangeRate;
}

export const Dashboard: React.FC<DashboardProps> = ({ exchangeRate }) => {
  return (
    <div className="p-6 animate-fade-in pb-20">
      <DailySalesReport exchangeRate={exchangeRate} />
    </div>
  );
};