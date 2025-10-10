// Constantes y configuración
const PRINTER_CONFIG = {
  baseUrl: "http://192.168.0.111:3000/imprimir",
  headers: { "Content-Type": "application/json" },
  lineWidth: 32,
};

const COMPANY_INFO = {
  name: "Centro Tecnológico",
  nit: "NIT: 71319344-8",
  phone: "Tel: 3145494395",
};

// Operaciones base de la impresora
const PRINTER_OPERATIONS = {
  start: [
    { nombre: "HabilitarCaracteresPersonalizados", argumentos: [] },
    { nombre: "DeshabilitarElModoDeCaracteresChinos", argumentos: [] },
    { nombre: "Iniciar", argumentos: [] },
  ],
  end: [
    { nombre: "Feed", argumentos: [2] },
    { nombre: "EstablecerAlineacion", argumentos: [1] },
    { nombre: "HabilitarCaracteresPersonalizados", argumentos: [] },
    { nombre: "Feed", argumentos: [3] },
  ],
};

// Servicio base para comunicación con la impresora
class PrinterService {
  static async sendToPrinter(data) {
    try {
      const response = await fetch(PRINTER_CONFIG.baseUrl, {
        method: "POST",
        headers: PRINTER_CONFIG.headers,
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error("Error al conectar con el server de impresión:", error);
      return {
        success: false,
        message: "No se pudo conectar con el server de impresión",
      };
    }
  }
}

// Formateadores
class LineFormatter {
  static formatProductLine(name, price, amount = 1) {
    const left = `${amount} x ${name}`;
    const right = `$${price.toLocaleString("es-CO")}`;
    return this.formatLine(left, right);
  }

  static formatDeviceLine(name, price) {
    const left = `${name}`;
    const right = `$${price.toLocaleString("es-CO")}`;
    return this.formatLine(left, right);
  }

  static formatLine(left, right, width = PRINTER_CONFIG.lineWidth) {
    const spaces = Math.max(1, width - (left.length + right.length));
    return {
      nombre: "EscribirTexto",
      argumentos: [`${left}${" ".repeat(spaces)}${right}\n`],
    };
  }
}

// Builders para diferentes tipos de documentos
class DocumentBuilder {
  constructor() {
    this.operations = [];
  }

  addStartOperations() {
    this.operations.push(...PRINTER_OPERATIONS.start);
    return this;
  }

  addHeader(title) {
    this.operations.push(
      { nombre: "EstablecerAlineacion", argumentos: [1] },
      { nombre: "EscribirTexto", argumentos: [`${title}\n`] },
      { nombre: "EscribirTexto", argumentos: [`${COMPANY_INFO.name}\n`] },
      { nombre: "EscribirTexto", argumentos: [`${COMPANY_INFO.nit}\n`] },
      { nombre: "EscribirTexto", argumentos: [`${COMPANY_INFO.phone}\n\n`] }
    );
    return this;
  }

  addLeftAlignedContent() {
    this.operations.push({ nombre: "EstablecerAlineacion", argumentos: [0] });
    return this;
  }

  addLines(lines) {
    this.operations.push(...lines);
    return this;
  }

  addSeparator() {
    this.operations.push({
      nombre: "EscribirTexto",
      argumentos: ["------------------------------\n"],
    });
    return this;
  }

  addTotal(total, label = "TOTAL") {
    this.operations.push(
      { nombre: "EstablecerAlineacion", argumentos: [2] },
      {
        nombre: "EscribirTexto",
        argumentos: [`${label}: $${total.toLocaleString("es-CO")}\n`],
      }
    );
    return this;
  }

  addFooter(message) {
    this.operations.push(
      { nombre: "EstablecerAlineacion", argumentos: [1] },
      { nombre: "EscribirTexto", argumentos: [`${message}\n`] }
    );
    return this;
  }

  addEndOperations() {
    this.operations.push(...PRINTER_OPERATIONS.end);
    return this;
  }

  build() {
    return { operaciones: this.operations };
  }
}

// Servicios específicos
class ProductPrintService {
  static async print(products) {
    const productLines = products.map((product) =>
      LineFormatter.formatProductLine(
        product.name,
        product.price,
        product.amount
      )
    );

    const total = products.reduce(
      (sum, product) => sum + product.price * (product.amount || 1),
      0
    );

    const data = new DocumentBuilder()
      .addStartOperations()
      .addHeader("Centro Tecnologico")
      .addLeftAlignedContent()
      .addLines(productLines)
      .addSeparator()
      .addTotal(total)
      .addFooter("¡Gracias por su compra!")
      .addEndOperations()
      .build();

    return await PrinterService.sendToPrinter(data);
  }
}

class TechnicalServicePrintService {
  static async print(device, repairs) {
    const lines = [];

    // Información del cliente
    lines.push({
      nombre: "EscribirTexto",
      argumentos: [`Cliente: ${device.name}\n`],
    });
    lines.push({
      nombre: "EscribirTexto",
      argumentos: ["------------------------------\n"],
    });

    // Dispositivo y reparaciones
    lines.push(LineFormatter.formatDeviceLine(device.device, device.price));

    const repairLines = repairs.map((repair) =>
      LineFormatter.formatDeviceLine(repair.name, repair.price)
    );
    lines.push(...repairLines);

    const total = repairs.reduce(
      (sum, repair) => sum + repair.price * (repair.amount || 1),
      device.price
    );

    const data = new DocumentBuilder()
      .addStartOperations()
      .addHeader("SERVICIO TÉCNICO")
      .addLeftAlignedContent()
      .addLines(lines)
      .addSeparator()
      .addTotal(total)
      .addFooter("¡Gracias por confiar en nosotros!")
      .addEndOperations()
      .build();

    return await PrinterService.sendToPrinter(data);
  }
}

// Exportar las funciones originales (manteniendo compatibilidad)
export const postProductsPrinter = ProductPrintService.print;
export const postTechnicalServicePrinter = TechnicalServicePrintService.print;

// Exportar los servicios para uso avanzado
export { ProductPrintService, TechnicalServicePrintService };
