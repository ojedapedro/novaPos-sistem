// ID de la Hoja de Cálculo proporcionado
const SPREADSHEET_ID = '1GPTjlwwFtvsjGDY8sgEbo2UCemwbu1MuZwPgnnpeinM';

/**
 * CONFIGURACIÓN DE LA ESTRUCTURA DE LA BASE DE DATOS
 * Ejecuta la función 'setupDatabase' manualmente una vez para crear las hojas.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const structure = {
    'Inventario': ['id', 'name', 'category', 'priceBuy', 'priceSell', 'stock', 'minStock', 'active'],
    'Clientes': ['id', 'name', 'phone', 'type'],
    'Proveedores': ['id', 'name', 'phone', 'paymentType'],
    'Ventas_Cabecera': ['id', 'date', 'clientId', 'type', 'total', 'currencyBase', 'status'],
    'Ventas_Detalle': ['saleId', 'productId', 'quantity', 'priceUnit', 'subtotal'],
    'Movimientos_Caja': ['id', 'date', 'type', 'origin', 'method', 'amount', 'currency', 'reference', 'supplierId']
  };

  for (const [sheetName, headers] of Object.entries(structure)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Eliminar columnas y filas extra para optimizar
      sheet.deleteRows(2, sheet.getMaxRows() - 2); 
      sheet.deleteColumns(headers.length + 1, sheet.getMaxColumns() - headers.length);
    }
    
    // Siempre actualizamos los encabezados en la primera fila
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f3f4f6');
  }
  
  Logger.log('Base de datos NovaPOS inicializada correctamente.');
}

/**
 * API: DO GET
 * Devuelve todos los datos para inicializar la app (Productos, Clientes, Config, etc.)
 */
function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const data = {
    products: getSheetData(ss, 'Inventario'),
    clients: getSheetData(ss, 'Clientes'),
    suppliers: getSheetData(ss, 'Proveedores'),
    sales: getSheetData(ss, 'Ventas_Cabecera'),
    details: getSheetData(ss, 'Ventas_Detalle'),
    movements: getSheetData(ss, 'Movimientos_Caja')
  };
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * API: DO POST
 * Maneja la escritura de datos: Ventas, Compras, Nuevos Clientes, etc.
 */
function doPost(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const request = JSON.parse(e.postData.contents);
  const action = request.action;
  
  let result = { status: 'success' };
  
  try {
    switch (action) {
      case 'SAVE_SALE':
        saveSale(ss, request.payload);
        break;
      case 'SAVE_PURCHASE':
        savePurchase(ss, request.payload);
        break;
      case 'SYNC_INVENTORY':
         // Lógica para actualizar un producto individual
         updateProduct(ss, request.payload);
         break;
      default:
        result = { status: 'error', message: 'Acción desconocida' };
    }
  } catch (error) {
    result = { status: 'error', message: error.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- HELPER FUNCTIONS ---

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift(); // Eliminar encabezados
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      // Convertir tipos si es necesario
      obj[header] = row[index]; 
    });
    return obj;
  });
}

function saveSale(ss, payload) {
  const { header, details, movements } = payload;
  
  // 1. Guardar Cabecera
  const headerSheet = ss.getSheetByName('Ventas_Cabecera');
  headerSheet.appendRow([
    header.id, header.date, header.clientId, header.type, 
    header.total, header.currencyBase, header.status
  ]);
  
  // 2. Guardar Detalles
  const detailSheet = ss.getSheetByName('Ventas_Detalle');
  const detailsRows = details.map(d => [d.saleId, d.productId, d.quantity, d.priceUnit, d.subtotal]);
  // Insertar múltiples filas a la vez es más eficiente, pero appendRow es fila por fila.
  // Para optimizar en producción usar setValues con getRange.
  detailsRows.forEach(row => detailSheet.appendRow(row));
  
  // 3. Guardar Movimientos (Pagos)
  if (movements && movements.length > 0) {
    const movSheet = ss.getSheetByName('Movimientos_Caja');
    movements.forEach(m => {
       movSheet.appendRow([m.id, m.date, m.type, m.origin, m.method, m.amount, m.currency, m.reference, '']);
    });
  }
  
  // 4. Actualizar Stock
  updateStock(ss, details, false); // false = restar stock
}

function savePurchase(ss, payload) {
  const { items, movement } = payload;
  
  // 1. Guardar Movimiento (Egreso)
  const movSheet = ss.getSheetByName('Movimientos_Caja');
  movSheet.appendRow([
    movement.id, movement.date, movement.type, movement.origin, 
    movement.method, movement.amount, movement.currency, movement.reference, movement.supplierId
  ]);
  
  // 2. Actualizar Inventario (Stock y Costo)
  updateStock(ss, items, true); // true = sumar stock
}

function updateStock(ss, items, isPurchase) {
  const sheet = ss.getSheetByName('Inventario');
  const data = sheet.getDataRange().getValues();
  // Mapa de ID -> Indice de Fila (Base 0)
  const idMap = new Map();
  
  // Empezamos en 1 para saltar encabezado
  for (let i = 1; i < data.length; i++) {
    idMap.set(data[i][0].toString(), i);
  }
  
  items.forEach(item => {
    const productId = isPurchase ? item.id : item.productId;
    const qty = item.quantity;
    
    if (idMap.has(productId)) {
      const rowIndex = idMap.get(productId);
      
      // Columna F (Indice 5) es Stock. Columna D (Indice 3) es PriceBuy.
      // Recuerda: getRange usa base 1. rowIndex es base 0 respecto a `data`.
      // La fila en la hoja es rowIndex + 1.
      
      const currentStock = data[rowIndex][5];
      const newStock = isPurchase ? (currentStock + qty) : (currentStock - qty);
      
      // Actualizar Stock
      sheet.getRange(rowIndex + 1, 6).setValue(newStock);
      
      // Si es compra, actualizar Costo (PriceBuy)
      if (isPurchase && item.newCost) {
         sheet.getRange(rowIndex + 1, 4).setValue(item.newCost);
      }
    }
  });
}

function updateProduct(ss, product) {
    // Implementar lógica para actualizar o crear un producto en la hoja 'Inventario'
    const sheet = ss.getSheetByName('Inventario');
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    for(let i=1; i<data.length; i++) {
        if(data[i][0] == product.id) {
            // Actualizar fila existente
            sheet.getRange(i+1, 1, 1, 8).setValues([[
                product.id, product.name, product.category, 
                product.priceBuy, product.priceSell, product.stock, 
                product.minStock, product.active
            ]]);
            found = true;
            break;
        }
    }
    
    if(!found) {
        // Crear nuevo
        sheet.appendRow([
             product.id, product.name, product.category, 
             product.priceBuy, product.priceSell, product.stock, 
             product.minStock, product.active
        ]);
    }
}
