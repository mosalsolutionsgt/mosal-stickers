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

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "Mosal Stickers - Google Drive & Sheets Connector",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

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
        "Subtotal Stickers",
        "Envío / Flete",
        "Total Cobrado",
        "Detalle Completo de Productos (Material, Corte, Margen)",
        "Enlace a Archivo en Drive"
      ]);
      // Dar formato a los encabezados
      sheet.getRange(1, 1, 1, 16).setBackground("#FFE600").setFontWeight("bold").setFontColor("#000000");
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
      data.subtotal || "",
      data.shippingFee || "",
      data.total || "",
      data.itemsDetailedText || data.itemsSummary || "",
      fileUrl
    ]);

    // 4. Enviar notificación por correo a Mosal Solutions
    var recipient = "mosalsolutionsgt@gmail.com";
    var subject = "📦 Nuevo Pedido Web #" + (data.orderId || "") + " - " + (data.customerName || "Cliente") + " (" + (data.total || "") + ")";
    var body = "¡Hola Mosal Solutions!\n\n" +
      "Se ha recibido un nuevo pedido en la tienda web con especificaciones técnicas completas:\n\n" +
      "📋 DETALLES DE LA ORDEN:\n" +
      "• No. de Orden: #" + (data.orderId || "") + "\n" +
      "• Fecha: " + (data.date || "") + "\n" +
      "• Método de Pago: " + (data.payMethod || "") + "\n\n" +
      "👤 DATOS DEL CLIENTE Y ENVÍO:\n" +
      "• Nombre: " + (data.customerName || "") + "\n" +
      "• Teléfono / WhatsApp: " + (data.phone || "") + "\n" +
      "• Correo: " + (data.email || "") + "\n" +
      "• Dirección: " + (data.address || "") + ", " + (data.city || "") + " (" + (data.department || "") + ")\n" +
      "• NIT: " + (data.nit || "C/F") + "\n" +
      "• Nombre Facturación: " + (data.billingName || "Mismo del cliente") + "\n\n" +
      "📦 DETALLE COMPLETO DE PRODUCTOS:\n" +
      "--------------------------------------------------\n" +
      (data.itemsDetailedText || data.itemsSummary || "Ver detalle en el sistema") + "\n" +
      "--------------------------------------------------\n\n" +
      "💰 DESGLOSE ECONÓMICO Y FLETE:\n" +
      "• Subtotal Stickers: " + (data.subtotal || "Q 0.00") + "\n" +
      "• Costo de Envío (" + (data.shippingZone || data.department || "Guatemala") + "): " + (data.shippingFee || "Q 0.00") + "\n" +
      "• TOTAL COBRADO: " + (data.total || "Q 0.00") + "\n\n" +
      "📁 ARCHIVO EN ALTA RESOLUCIÓN (GOOGLE DRIVE):\n" + fileUrl + "\n\n" +
      "📊 HOJA DE CÁLCULO DE PEDIDOS:\n" + spreadsheet.getUrl() + "\n\n" +
      "— Sistema Web Mosal Stickers";

    MailApp.sendEmail(recipient, subject, body);

    // 5. Enviar correo automático de confirmación al cliente si proporcionó un correo válido
    if (data.email && data.email.indexOf("@") !== -1) {
      try {
        var clientSubject = "✓ Confirmación de tu Pedido Mosal Stickers #" + (data.orderId || "");
        var clientBody = "¡Hola " + (data.customerName || "Estimado Cliente") + "! 👋\n\n" +
          "Muchas gracias por tu compra en Mosal Solutions. Tu pedido #" + (data.orderId || "") + " ha sido recibido y registrado en nuestra cola de producción.\n\n" +
          "📦 DETALLE DE TU PEDIDO:\n" +
          "--------------------------------------------------\n" +
          (data.itemsDetailedText || data.itemsSummary || "") + "\n" +
          "--------------------------------------------------\n\n" +
          "💰 DESGLOSE:\n" +
          "• Subtotal Stickers: " + (data.subtotal || "") + "\n" +
          "• Costo de Envío (" + (data.shippingZone || data.department || "Guatemala") + "): " + (data.shippingFee || "") + "\n" +
          "• Total Pagado: " + (data.total || "") + "\n" +
          "• Método de Pago: " + (data.payMethod || "") + "\n\n" +
          "📍 DIRECCIÓN DE ENTREGA:\n" +
          (data.address || "") + ", " + (data.city || "") + " (" + (data.department || "") + ")\n\n" +
          "¿CUÁLES SON LOS SIGUIENTES PASOS?\n" +
          "1. Nuestro equipo gráfico revisará la resolución de tu archivo.\n" +
          "2. Te escribiremos a tu WhatsApp (" + (data.phone || "") + ") con la prueba digital para tu visto bueno previo.\n" +
          "3. Una vez aprobado, pasa a impresión, corte de alta precisión y despacho con guía de rastreo.\n\n" +
          "Cualquier consulta puedes contactarnos directo a nuestro WhatsApp: +502 3029-2980 o respondiendo a este correo.\n\n" +
          "¡Gracias por confiar en Mosal Solutions!\n" +
          "www.mosalstickers.com";

        MailApp.sendEmail(data.email, clientSubject, clientBody);
      } catch (clientErr) {
        Logger.log("Error enviando confirmación al cliente: " + clientErr);
      }
    }

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
