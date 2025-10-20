import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { postProductsPrinter } from "../../services/printerService.js";

export async function soldProduct(req, res) {
  try {
    const soldProducts = req.body;

    // Validar entrada
    if (!Array.isArray(soldProducts) || soldProducts.length === 0) {
      return handleError(
        req,
        res,
        "Se requiere un arreglo no vacío de productos vendidos"
      );
    }

    // Validar cada producto
    for (const item of soldProducts) {
      if (!item.id || typeof item.id !== "string" || item.id.trim() === "") {
        return handleError(
          req,
          res,
          `ID inválido para el producto: ${JSON.stringify(item)}`
        );
      }
      if (!Number.isInteger(item.amount) || item.amount <= 0) {
        return handleError(
          req,
          res,
          `Cantidad inválida para el producto con ID ${item.id}`
        );
      }
    }

    // Leer datos de productos
    const productsData = await readData(PRODUCTS_FILE);

    // Verificar si todos los IDs de productos existen
    const invalidProduct = soldProducts.find(
      (item) => !productsData.some((product) => product.id === item.id)
    );
    if (invalidProduct) {
      return handleError(
        req,
        res,
        `Producto con ID ${invalidProduct.id} no encontrado`
      );
    }

    // Verificar inventario y preparar actualizaciones
    const updatedProducts = productsData.map((product) => {
      const soldItem = soldProducts.find((item) => item.id === product.id);
      if (soldItem) {
        if (product.total < soldItem.amount) {
          return handleError(
            req,
            res,
            `No hay suficiente stock para el producto ${product.name} (disponible: ${product.total}, solicitado: ${soldItem.amount})`
          );
        }
        return {
          ...product,
          total: product.total - soldItem.amount,
          sales: product.sales + soldItem.amount,
        };
      }
      return product;
    });

    // Verificar si ya se envió una respuesta (por ejemplo, por falta de stock)
    if (res.headersSent) {
      return;
    }

    // Datos para la impresora
    const printableProducts = soldProducts.map((item) => {
      const product = productsData.find((p) => p.id === item.id);
      return {
        name: product.name,
        price: product.price,
        amount: item.amount,
      };
    });
    const sale = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      products: soldProducts,
    };
    // Agregar o guardar en un archivo de ventas
    await writeData(sale, FILES.SALES);

    // Guardar productos actualizados
    await overwriteData(updatedProducts, FILES.PRODUCTS);

    // Enviar a la impresor
    const printerSuccess = await postProductsPrinter(printableProducts);

    handleSuccess(req, res, { printer: printerSuccess, updatedProducts }, 201);
  } catch {
    handleError(req, res, "Error al procesar la venta");
  }
}
