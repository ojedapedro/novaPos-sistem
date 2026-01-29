import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((type: NotificationType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className="pointer-events-auto min-w-[300px] max-w-sm bg-white shadow-xl rounded-lg overflow-hidden border-l-4 animate-fade-in-up flex relative"
            style={{
                borderColor: n.type === 'success' ? '#22c55e' : n.type === 'error' ? '#ef4444' : n.type === 'warning' ? '#eab308' : '#3b82f6'
            }}
          >
             <div className="p-4 flex items-start gap-3 flex-1 bg-white">
                <div className={`mt-0.5 ${
                     n.type === 'success' ? 'text-green-500' : 
                     n.type === 'error' ? 'text-red-500' : 
                     n.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                }`}>
                    {n.type === 'success' && <CheckCircle size={20} />}
                    {n.type === 'error' && <AlertCircle size={20} />}
                    {n.type === 'warning' && <AlertTriangle size={20} />}
                    {n.type === 'info' && <Info size={20} />}
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm capitalize">
                        {n.type === 'success' ? 'Éxito' : n.type === 'error' ? 'Error' : n.type === 'warning' ? 'Atención' : 'Información'}
                    </h4>
                    <p className="text-sm text-gray-600 leading-tight mt-1">{n.message}</p>
                </div>
                <button 
                    onClick={() => removeNotification(n.id)} 
                    className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={16} />
                </button>
             </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};