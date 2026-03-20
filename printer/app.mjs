import "dotenv/config";
import express from "express";
import fs from "fs";

const app = express();
app.use(express.json());

const DEVICE = process.env.DEVICE_PRINTER || "/dev/usb/lp0";

// Comandos ESC/POS
const ESC = "\x1B";
const GS = "\x1D";
const FS = "\x1C";

const COMMANDS = {
  INIT: ESC + "@",
  // Establecer alineación hacia a la izquierda
  ALIGN_LEFT: ESC + "a" + "\x00",
  // Establecer alineación hacia el centro
  ALIGN_CENTER: ESC + "a" + "\x01",
  // Establecer alineación hacia a la derecha
  ALIGN_RIGHT: ESC + "a" + "\x02",
  // Establecer letras negritas
  BOLD_ON: ESC + "E" + "\x01",
  // Desabilitar letras negritas
  BOLD_OFF: ESC + "E" + "\x00",
  // Establecer el corte del paper
  CUT: GS + "V" + "\x00",
  // Tamaño de texto
  TEXT_SIZE: (size) => ESC + "!" + String.fromCharCode(size),
  // Selección de página de códigos
  CODE_PAGE: (n) => ESC + "t" + String.fromCharCode(n),
};

// Códigos de página
const CODE_PAGES = {
  CP437: 0, // USA, Europa Estándar
  CP850: 2, // Latinoamérica
  CP860: 3, // Portugués
  CP863: 4, // Canadá-Francés
  CP865: 5, // Nórdico
  CP1252: 17, // Windows Latin
  CP855: 11, // Cirílico
  CP866: 12, // Cirílico alternativo
  CP852: 18, // Latino Europa Oriental
};

// QR ESC/POS
function qr(data) {
  const storeLen = data.length + 3;
  const pL = storeLen % 256;
  const pH = Math.floor(storeLen / 256);

  return (
    GS +
    "(k" +
    String.fromCharCode(pL, pH, 49, 80, 48) +
    data +
    GS +
    "(k" +
    "\x03\x00\x31\x51\x30"
  );
}

// Procesador de operaciones
function procesarOperaciones(ops) {
  let output = COMMANDS.INIT;

  // Selecionar codigo de pagina
  // Agregar variable de entorno a futuro
  output += COMMANDS.CODE_PAGE(CODE_PAGES.CP860);

  for (const op of ops) {
    switch (op.nombre) {
      case "EscribirTexto":
        // Limpiar el texto
        let texto = op.argumentos[0] || "";

        // Convertir caracteres especiales comunes
        texto = texto
          .replace(/[áàâãä]/g, "a")
          .replace(/[éèêë]/g, "e")
          .replace(/[íìîï]/g, "i")
          .replace(/[óòôõö]/g, "o")
          .replace(/[úùûü]/g, "u")
          .replace(/[ñ]/g, "n")
          .replace(/[ÁÀÂÃÄ]/g, "A")
          .replace(/[ÉÈÊË]/g, "E")
          .replace(/[ÍÌÎÏ]/g, "I")
          .replace(/[ÓÒÔÕÖ]/g, "O")
          .replace(/[ÚÙÛÜ]/g, "U")
          .replace(/[Ñ]/g, "N");

        output += texto;
        break;

      case "Feed":
        output += "\n".repeat(op.argumentos[0] || 1);
        break;

      case "EstablecerAlineacion":
        const align = op.argumentos[0];
        if (align === 0) output += COMMANDS.ALIGN_LEFT;
        if (align === 1) output += COMMANDS.ALIGN_CENTER;
        if (align === 2) output += COMMANDS.ALIGN_RIGHT;
        break;

      case "ImprimirCodigoQr":
        output += qr(op.argumentos[0]);
        break;

      case "Negrita":
        output += op.argumentos[0] ? COMMANDS.BOLD_ON : COMMANDS.BOLD_OFF;
        break;

      case "TextoGrande":
        output += COMMANDS.TEXT_SIZE(0x30);
        break;

      case "TextoNormal":
        output += COMMANDS.TEXT_SIZE(0x00);
        break;

      case "HabilitarCaracteresPersonalizados":
        // No implementado
        // Pronto se borrara (mantiene compatibilidad con el modulo del backend)
        break;

      case "DeshabilitarElModoDeCaracteresChinos":
        output += FS + "."; // Deshabilita modo chino
        break;

      default:
        console.warn(`Operación no implementada: ${op.nombre}`);
        break;
    }
  }

  output += "\n\n" + COMMANDS.CUT;
  console.log(output);

  try {
    // Enviar los datos a imprimir
    return Buffer.from(output, "binary");
  } catch (e) {
    console.warn("Error con CP850, intentando CP860:", e);
  }
}

app.post("/imprimir", (req, res) => {
  try {
    const { operaciones } = req.body;

    const buffer = procesarOperaciones(operaciones);

    fs.writeFileSync(DEVICE, buffer);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al enviar los datos a la impresora" });
  }
});

app.listen(8000, () => {
  console.log("Printer corriendo en puerto 8000");
});
