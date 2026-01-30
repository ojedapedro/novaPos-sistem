import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { DataService } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';
import * as XLSX from 'xlsx';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotification();

  // Template structure definition
  const TEMPLATE_HEADERS = [
    'CODIGO', 'NOMBRE', 'CATEGORIA', 'COSTO_COMPRA', 'PRECIO_VENTA', 'STOCK_ACTUAL', 'STOCK_MINIMO', 'ACTIVO'
  ];

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ['P1001', 'Ejemplo Producto', 'General', 1.50, 2.00, 50, 5, 'SI'] // Example row
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Inventario");
    XLSX.writeFile(wb, "Plantilla_Inventario_NovaPOS.xlsx");
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Skip header row
        const rows = jsonData.slice(1) as any[];

        if (rows.length === 0) {
          showNotification('warning', 'El archivo parece estar vacío.');
          setIsProcessing(false);
          return;
        }

        const productsToImport: Product[] = [];
        let errors = 0;

        rows.forEach((row, index) => {
            // Mapping based on index assuming template order
            // 0: CODIGO, 1: NOMBRE, 2: CATEGORIA, 3: COSTO, 4: PRECIO, 5: STOCK, 6: MIN, 7: ACTIVO
            const id = row[0] ? String(row[0]).trim() : '';
            const name = row[1] ? String(row[1]).trim() : '';
            
            if (!id || !name) {
                errors++;
                return; // Skip invalid rows
            }

            const product: Product = {
                id: id,
                name: name,
                category: row[2] ? String(row[2]).trim() : 'General',
                priceBuy: Number(row[3]) || 0,
                priceSell: Number(row[4]) || 0,
                stock: Number(row[5]) || 0,
                minStock: Number(row[6]) || 5,
                active: String(row[7]).toUpperCase() === 'SI' || String(row[7]).toUpperCase() === 'YES' || row[7] === true
            };
            productsToImport.push(product);
        });

        if (productsToImport.length > 0) {
            DataService.importBatchProducts(productsToImport);
            showNotification('success', `${productsToImport.length} productos procesados correctamente.`);
            if (errors > 0) {
                showNotification('warning', `${errors} filas fueron ignoradas por datos incompletos.`);
            }
            onSuccess();
            onClose();
        } else {
            showNotification('error', 'No se encontraron productos válidos en el archivo.');
        }

      } catch (error) {
        console.error("Error parsing excel", error);
        showNotification('error', 'Error al leer el archivo. Asegúrate que sea un Excel válido.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        processFile(file);
      } else {
        showNotification('error', 'Formato no soportado. Por favor sube un archivo Excel (.xlsx)');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        processFile(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Upload size={20} className="text-blue-600" />
            Carga Masiva de Inventario
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <FileSpreadsheet className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                <div>
                    <h4 className="font-semibold text-blue-800 text-sm">Instrucciones</h4>
                    <p className="text-sm text-blue-600 mt-1">
                        1. Descarga la plantilla.<br/>
                        2. Llena los datos de tus productos.<br/>
                        3. Sube el archivo Excel actualizado.<br/>
                        <span className="text-xs opacity-80">* Los códigos existentes se actualizarán, los nuevos se crearán.</span>
                    </p>
                    <button 
                        onClick={handleDownloadTemplate}
                        className="mt-3 flex items-center gap-2 text-xs font-bold bg-white text-blue-600 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                        <Download size={14} /> Descargar Plantilla
                    </button>
                </div>
            </div>

            <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileSelect}
                />
                
                {isProcessing ? (
                    <div className="flex flex-col items-center text-blue-600">
                        <Loader2 size={40} className="animate-spin mb-3" />
                        <p className="font-medium">Procesando archivo...</p>
                    </div>
                ) : (
                    <>
                        <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                        <p className="font-medium text-gray-700">Arrastra tu archivo Excel aquí</p>
                        <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar</p>
                    </>
                )}
            </div>
        </div>

        <div className="p-4 bg-gray-50 text-xs text-gray-500 text-center border-t border-gray-100">
            Soporta formatos .xlsx y .xls
        </div>
      </div>
    </div>
  );
};