export const postProductsPrinter = async (products) => {
  const newDataPrinter = products.map((product) =>
    formatLine(product.name, product.price, product.amount)
  );

  // Calcular total (sumar precio * cantidad)
  const total = products.reduce((acum, product) => {
    return acum + product.price * (product.amount || 1);
  }, 0);

  // Construimos directamente el cuerpo que se enviará
  const data = {
    operaciones: [
      { nombre: "HabilitarCaracteresPersonalizados", argumentos: [] },
      { nombre: "DeshabilitarElModoDeCaracteresChinos", argumentos: [] },
      { nombre: "Iniciar", argumentos: [] },

      { nombre: "EstablecerAlineacion", argumentos: [1] },
      { nombre: "EscribirTexto", argumentos: ["Centro\nTecnologico\n"] },
      {
        nombre: "EscribirTexto",
        argumentos: ["NIT: 71319344-8\nTel: 3145494395\n\n"],
      },

      { nombre: "EstablecerAlineacion", argumentos: [0] },
      ...newDataPrinter,

      {
        nombre: "EscribirTexto",
        argumentos: ["------------------------------\n"],
      },

      { nombre: "EstablecerAlineacion", argumentos: [2] },
      {
        nombre: "EscribirTexto",
        argumentos: [`TOTAL: ${total.toLocaleString("es-CO")}\n`],
      },

      { nombre: "Feed", argumentos: [2] },
      { nombre: "EstablecerAlineacion", argumentos: [1] },
      { nombre: "HabilitarCaracteresPersonalizados", argumentos: [] },
      { nombre: "EscribirTexto", argumentos: ["¡Gracias por su compra!\n"] },
      { nombre: "Feed", argumentos: [3] },
    ],
  };

  try {
    const response = await fetch("http://192.168.0.111:3000/imprimir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (e) {
    console.error("Error al conectar con el server de impresión:", e);
    return {
      success: false,
      message: "No se pudo conectar con el server de impresión",
    };
  }
};

// Función para formatear una línea de producto
function formatLine(nombre, precio, cantidad = 1, ancho = 32) {
  const izquierda = `${cantidad} x ${nombre}`;
  const derecha = `$${precio.toLocaleString("es-CO")}`;

  let espacios = ancho - (izquierda.length + derecha.length);
  if (espacios < 1) espacios = 1;

  return {
    nombre: "EscribirTexto",
    argumentos: [`${izquierda}${" ".repeat(espacios)}${derecha}\n`],
  };
}
