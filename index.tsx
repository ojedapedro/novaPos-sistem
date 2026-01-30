import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
} catch (error) {
    console.error("Critical Render Error:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
        <h1>Error Crítico de Inicialización</h1>
        <p>La aplicación no pudo iniciarse. Por favor, revisa la consola para más detalles o intenta limpiar los datos del navegador.</p>
        <button onclick="localStorage.clear(); window.location.reload();" style="padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Restablecer Datos y Recargar
        </button>
    </div>`;
}