// Constantes y configuración
const PRINTER_CONFIG = {
  baseUrl: "http://localhost:8000/imprimir",
  headers: { "Content-Type": "application/json" },
  lineWidth: 32,
};

const COMPANY_INFO = {
  name: "Centro Tecnologico",
  nit: "NIT: 71319344-8",
  phone: "Tel: 3145494395",
};

// Operaciones base de la impresora
const PRINTER_OPERATIONS = {
  start: [
    { nombre: "Iniciar", argumentos: [] },
    { nombre: "HabilitarCaracteresPersonalizados", argumentos: [] },
    {
      nombre: "DeshabilitarElModoDeCaracteresChinos",
      argumentos: [],
    },
  ],
  end: [
    { nombre: "EstablecerAlineacion", argumentos: [1] },
    { nombre: "HabilitarCaracteresPersonalizados", argumentos: [] },
    {
      nombre: "EscribirTexto",
      argumentos: ["Gracias por confiar en nosotros!!"],
    },
    { nombre: "Feed", argumentos: [3] },
  ],
};

// Servicio base para comunicación con la impresora
class PrinterService {
  static async sendToPrinter(data) {
    const newData = {
      serial: "",
      nombreImpresora: "lp0",
      operaciones: data.operaciones,
    };

    try {
      const response = await fetch(PRINTER_CONFIG.baseUrl, {
        method: "POST",
        headers: PRINTER_CONFIG.headers,
        body: JSON.stringify(newData),
      });

      await response.json();

      return { success: true, message: "Impresión enviada con éxito" };
    } catch (error) {
      console.error("Error al conectar con el server de impresión:");
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
    const newLeft = left.slice(0, 16);
    const spaces = Math.max(1, width - (newLeft.length + right.length));
    return {
      nombre: "EscribirTexto",
      argumentos: [`${newLeft}${" ".repeat(spaces)}${right}\n`],
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
      { nombre: "EscribirTexto", argumentos: [`${COMPANY_INFO.phone}\n\n`] },
    );
    return this;
  }

  addAlignedContent(aling) {
    this.operations.push({
      nombre: "EstablecerAlineacion",
      argumentos: [aling],
    });
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
    this.operations.push({
      nombre: "EscribirTexto",
      argumentos: [`${label}: $${total.toLocaleString("es-CO")}\n`],
    });
    return this;
  }
  addPricePay(total, label = "ABONADO") {
    this.operations.push({
      nombre: "EscribirTexto",
      argumentos: [`${label}: $${total.toLocaleString("es-CO")}\n`],
    });
    return this;
  }

  addQR(data) {
    this.operations.push({
      nombre: "ImprimirCodigoQr",
      argumentos: [data, 380, 3, 0],
    });
    return this;
  }

  addText(text) {
    this.operations.push({
      nombre: "EscribirTexto",
      argumentos: [`${text}\n`],
    });
    return this;
  }

  addFooter(message) {
    this.operations.push(
      { nombre: "EstablecerAlineacion", argumentos: [1] },
      {
        nombre: "EscribirTexto",
        argumentos: [`${message}\n`],
      },
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
        product.stock,
      ),
    );

    const total = products.reduce(
      (sum, product) => sum + product.price * (product.stock || 1),
      0,
    );

    const data = new DocumentBuilder()
      .addStartOperations()
      .addHeader("Centro Tecnologico")
      .addAlignedContent(0)
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
    // Separacion
    lines.push({
      nombre: "EscribirTexto",
      argumentos: ["------------------------------\n"],
    });
    // Alinear al centro
    lines.push({ nombre: "EstablecerAlineacion", argumentos: [1] });
    // Establece si esta abonado o pagado
    lines.push({
      nombre: "EscribirTexto",
      argumentos: [
        device.pricePay >= 1000
          ? "ABONADO\n"
          : device.pay
            ? "PAGADO\n"
            : "NO PAGADO\n",
      ],
    });
    //Establece alineacion a la izquierda
    lines.push({ nombre: "EstablecerAlineacion", argumentos: [0] });

    //Escribe el nombre del dispositivo a reparar
    lines.push({
      nombre: "EscribirTexto",
      argumentos: [`Dispositivo: ${device.model} ${device.device}\n`],
    });

    //Reparaciones realizadas
    lines.push({
      nombre: "EscribirTexto",
      argumentos: ["Reparaciones:\n"],
    });

    const repairLines = repairs.map((repair) =>
      LineFormatter.formatDeviceLine(
        `${repair.name} ${repair.category}`,
        repair.price,
      ),
    );
    lines.push(...repairLines);

    // Total a pagar
    const total = repairs.reduce(
      (sum, repair) => sum + repair.price,
      device.price || 0,
    );

    const data = new DocumentBuilder()
      .addStartOperations()
      .addHeader("SERVICIO TECNICO")
      .addAlignedContent(0)
      .addLines(lines)
      .addSeparator()
      .addAlignedContent(2)
      .addTotal(total)
      .addPricePay(device.pricePay || 0)
      // PRIMERO el footer (garantía)
      .addAlignedContent(0)
      .addSeparator()
      .addFooter(
        "\nGARANTIA: 30 dias por defectos de mano de obra, No cubre danos por mal uso o problemas no relacionados con la reparacion. Conserva este ticket",
      )

      .addAlignedContent(1)
      .addEndOperations()
      .addQR(device.id)
      .addText(`Cliente: ${device.name}`)
      .build();

    return await PrinterService.sendToPrinter(data);
  }
}
export const postProductsPrinter = ProductPrintService.print;
export const postTechnicalServicePrinter = TechnicalServicePrintService.print;

export { ProductPrintService, TechnicalServicePrintService };
