export const postProductsPrinter = async (products) => {
  const newProducts = products.map((product) =>
    formatLine(product.name, product.price, product.quantity)
  );

  const operaciones = [
    {
      nombre: "HabilitarCaracteresPersonalizados",
      argumentos: [],
    },
    {
      nombre: "DeshabilitarElModoDeCaracteresChinos",
      argumentos: [],
    },
    { nombre: "Iniciar", argumentos: [] },

    { nombre: "EstablecerAlineacion", argumentos: [1] },
    { nombre: "EscribirTexto", argumentos: ["Centro\nTecnologico\n"] },
    {
      nombre: "EscribirTexto",
      argumentos: ["NIT: 389281938\nTel: 3145494395\n\n"],
    },

    { nombre: "EstablecerAlineacion", argumentos: [0] },
    newProducts,
    {
      nombre: "EscribirTexto",
      argumentos: ["------------------------------\n"],
    },

    { nombre: "EstablecerAlineacion", argumentos: [2] },
    { nombre: "EscribirTexto", argumentos: ["TOTAL: $12.500\n"] },

    { nombre: "Feed", argumentos: [2] },
    { nombre: "EstablecerAlineacion", argumentos: [1] },
    {
      nombre: "HabilitarCaracteresPersonalizados",
      argumentos: [],
    },
    {
      nombre: "EscribirTexto",
      argumentos: ["¡Gracias por su compra!\n"],
    },

    { nombre: "Feed", argumentos: [3] },
    { nombre: "Cortar", argumentos: [] },
  ];
  try {
    const postPrinter = await fetch("http://192.168.0.103:8000/imprimir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serial: "",
        nombreImpresora: "lp0",
        operaciones: operaciones,
      }),
    });
    const response = await postPrinter.json();
    return response;
  } catch (e) {
    console.error("Error al conectar con el server de impresión:", e);
    return {
      success: false,
      message: "No se pudo conectar con el server de impresión",
    };
  }
};

function formatLine(nombre, precio, cantidad = 1, ancho = 32) {
  const izquierda = `${cantidad} x ${nombre}`;

  // Texto de la derecha (precio formateado)
  const derecha = `$${precio.toLocaleString("es-CO")}`;

  // Cuántos espacios necesito entre izquierda y derecha
  let espacios = ancho - (izquierda.length + derecha.length);
  if (espacios < 1) espacios = 1;

  return {
    nombre: "EscribirTexto",
    argumentos: [izquierda + " ".repeat(espacios) + derecha],
  };
}
