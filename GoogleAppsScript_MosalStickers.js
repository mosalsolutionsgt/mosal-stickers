/**
 * ============================================================================
 * MOSAL STICKERS - GOOGLE APPS SCRIPT PARA GOOGLE DRIVE Y GOOGLE SHEETS
 * ============================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN (En 2 minutos):
 * 
 * 1. Ve a https://script.google.com con tu cuenta de mosalsolutionsgt@gmail.com
 * 2. Haz clic en "Nuevo proyecto" (botón azul en la esquina superior izquierda).
 * 3. Borra todo el código que aparezca y pega TODO este archivo.
 * 4. Arriba en "Proyecto sin título", cámbiale el nombre a "Mosal Stickers Backend".
 * 5. Haz clic en el botón azul "Implementar" (arriba a la derecha) > "Nueva implementación".
 * 6. En el engranaje ⚙️ de la izquierda elige: "Aplicación web".
 * 7. Llena estos 3 campos:
 *    - Descripción: "Mosal Stickers V1"
 *    - Ejecutar como: "Yo (mosalsolutionsgt@gmail.com)"
 *    - Quién tiene acceso: "Cualquier usuario" (IMPORTANTE: para que tu tienda web pueda enviar los datos).
 * 8. Haz clic en "Implementar", autoriza los permisos de Google.
 * 9. Copia la "URL de la aplicación web" (termina en /exec) y pégala en:
 *    `src/js/payment-config.js` en la propiedad `googleDrive.webhookUrl`.
 * 
 * ¡Listo! Cada vez que un cliente haga un pedido:
 *  - El archivo de diseño se guardará en tu Google Drive ("Mosal Stickers - Pedidos Web").
 *  - Los datos del cliente se agregarán a un Google Sheet ("Mosal Stickers - Registro de Pedidos").
 *  - Recibirás un correo con el link directo al archivo para imprimir.
 * ============================================================================
 */

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);

    // 1. Obtener o crear carpeta en Google Drive
    var folderName = "Mosal Stickers - Pedidos Web";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    // 2. Guardar archivo si viene adjunto
    var fileUrl = "Sin archivo adjunto";
    var fileName = "N/A";
    if (data.file && data.file.base64) {
      var contentType = data.file.mimeType || "application/octet-stream";
      var decodedBytes = Utilities.base64Decode(data.file.base64);
      var safeName = "[" + (data.orderId || "ORDEN") + "] " + (data.file.name || "diseno.png");
      var createdFile = folder.createFile(Utilities.newBlob(decodedBytes, contentType, safeName));
      createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = createdFile.getUrl();
      fileName = data.file.name;
    }

    // 3. Obtener o crear hoja de cálculo en Google Sheets
    var sheetName = "Mosal Stickers - Registro de Pedidos";
    var files = DriveApp.getFilesByName(sheetName);
    var spreadsheet;
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      spreadsheet = SpreadsheetApp.create(sheetName);
      var sheet = spreadsheet.getActiveSheet();
      sheet.appendRow([
        "Fecha",
        "No. Orden",
        "Cliente",
        "Teléfono",
        "Correo",
        "Dirección",
        "Municipio",
        "Departamento",
        "NIT",
        "Facturación",
        "Método de Pago",
        "Total",
        "Productos",
        "Enlace a Archivo en Drive"
      ]);
      // Dar formato a los encabezados
      sheet.getRange(1, 1, 1, 14).setBackground("#FFE600").setFontWeight("bold").setFontColor("#000000");
      sheet.setFrozenRows(1);

      // Mover el Spreadsheet a la carpeta de Pedidos
      var file = DriveApp.getFileById(spreadsheet.getId());
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }

    var sheet = spreadsheet.getActiveSheet();
    sheet.appendRow([
      data.date || new Date().toLocaleString("es-GT", { timeZone: "America/Guatemala" }),
      data.orderId || "",
      data.customerName || "",
      data.phone || "",
      data.email || "",
      data.address || "",
      data.city || "",
      data.department || "",
      data.nit || "C/F",
      data.billingName || "",
      data.payMethod || "",
      data.total || "",
      data.itemsSummary || "",
      fileUrl
    ]);

    // 4. Enviar notificación por correo a Mosal Solutions
    var recipient = "mosalsolutionsgt@gmail.com";
    var subject = "📦 Nuevo Pedido Web #" + (data.orderId || "") + " - " + (data.customerName || "Cliente") + " (" + (data.total || "") + ")";
    var body = "¡Hola Mosal Solutions!\n\n" +
      "Se ha recibido un nuevo pedido en la tienda web:\n\n" +
      "📋 DETALLES DEL PEDIDO:\n" +
      "• No. de Orden: #" + (data.orderId || "") + "\n" +
      "• Fecha: " + (data.date || "") + "\n" +
      "• Total: " + (data.total || "") + "\n" +
      "• Método de pago: " + (data.payMethod || "") + "\n\n" +
      "👤 DATOS DEL CLIENTE:\n" +
      "• Nombre: " + (data.customerName || "") + "\n" +
      "• Teléfono / WhatsApp: " + (data.phone || "") + "\n" +
      "• Correo: " + (data.email || "") + "\n" +
      "• Dirección: " + (data.address || "") + ", " + (data.city || "") + " (" + (data.department || "") + ")\n" +
      "• NIT: " + (data.nit || "C/F") + "\n" +
      "• Nombre Facturación: " + (data.billingName || "Mismo del cliente") + "\n\n" +
      "📦 PRODUCTOS:\n" + (data.itemsSummary || "Ver detalle en el sistema") + "\n\n" +
      "📁 ARCHIVO EN ALTA RESOLUCIÓN (GOOGLE DRIVE):\n" + fileUrl + "\n\n" +
      "📊 HOJA DE CÁLCULO DE PEDIDOS:\n" + spreadsheet.getUrl() + "\n\n" +
      "— Sistema Web Mosal Stickers";

    MailApp.sendEmail(recipient, subject, body);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      orderId: data.orderId,
      fileUrl: fileUrl,
      sheetUrl: spreadsheet.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
