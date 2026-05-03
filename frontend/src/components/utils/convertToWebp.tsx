export async function convertToWebp(
  imgFile: File,
  quality: number = 0.9,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(imgFile);

    image.src = objectUrl;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error("No se pudo crear el contexto del canvas"));
      }

      ctx.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          // Limpiamos la memoria apenas terminamos
          URL.revokeObjectURL(objectUrl);

          if (!blob) {
            return reject(new Error("Error al convertir a WebP"));
          }

          // Creamos el nuevo archivo con extensión .webp
          const webpFile = new File(
            [blob],
            imgFile.name.replace(/\.[^/.]+$/, "") + ".webp",
            {
              type: "image/webp",
            },
          );

          resolve(webpFile);
        },
        "image/webp",
        quality,
      );
    };

    image.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
}
