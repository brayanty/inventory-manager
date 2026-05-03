import { useRef, useEffect, useState, useCallback } from "react";

interface TakePhotoProps {
  addImage: (image: File) => void;
}

function TakePhoto({ addImage }: TakePhotoProps) {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);

  // Refs para mantener las variables entre renders
  const streamRef = useRef<MediaStream | null>(null);
  const isCameraActiveRef = useRef<boolean>(true);

  // Sincronizar el ref con el state
  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  // Función para detener completamente la cámara
  const stopCamera = useCallback(() => {
    // Detener todas las tracks del stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    // Limpiar video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
  }, []);

  // Función para convertir Blob a File
  const blobToFile = (blob: Blob, fileName: string): File => {
    return new File([blob], fileName, { type: blob.type });
  };

  // Función para tomar una foto y obtenerla como File
  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setError("No se puede acceder a la cámara");
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Configurar el canvas con las dimensiones del video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar el frame actual del video en el canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convertir canvas a Blob (formato JPEG)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Crear nombre de archivo con timestamp
              const fileName = `photo_${Date.now()}.jpg`;

              // Convertir Blob a File
              const imageFile = blobToFile(blob, fileName);

              // Guardar el archivo
              setImage(imageFile);

              // Crear URL para previsualización
              const previewUrl = URL.createObjectURL(blob);
              setImagePreview(previewUrl);

              // Limpiar URL anterior cuando se tome otra foto
              return () => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
              };
            } else {
              setError("Error al procesar la imagen");
            }
          },
          "image/jpeg",
          1.0,
        );
      }
    } else {
      setError("La cámara no está lista para tomar la foto");
    }
  }, []);

  //   // Función para obtener la imagen como Blob
  //   const getImageAsBlob = useCallback((): Blob | null => {
  //     const canvas = canvasRef.current;
  //     if (!canvas) return null;

  //     return new Promise((resolve) => {
  //       canvas.toBlob(
  //         (blob) => {
  //           resolve(blob);
  //         },
  //         "image/jpeg",
  //         1.0,
  //       );
  //     }) as unknown as Blob;
  //   }, []);

  // Reiniciar la cámara (tomar otra foto)
  const restartCamera = useCallback(() => {
    // Limpiar la URL de previsualización
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImage(null);
    setImagePreview(null);
    setError(null);
    setIsCameraActive(true);
  }, [imagePreview]);

  // Effect PRINCIPAL - inicializar la cámara
  useEffect(() => {
    if (!isCameraActive) {
      stopCamera();
      return;
    }

    const initializeCamera = async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        setError(null);
        setIsLoading(true);

        // Verificar disponibilidad de cámara
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("La cámara no está disponible en este dispositivo");
        }

        // Configuración de la cámara
        const constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        // Intentar con facingMode, si falla intentar sin especificar
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (facingError) {
          console.log(
            "Intentando cámara trasera falló, probando cámara por defecto",
          );
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        streamRef.current = stream;
        video.srcObject = stream;

        // Manejar eventos de video
        video.onloadedmetadata = () => {
          video.play().catch((playError) => {
            console.error("Error al reproducir video:", playError);
            setError("No se puede reproducir el video de la cámara");
          });
        };

        video.onplaying = () => {
          setIsLoading(false);
        };

        video.onerror = () => {
          setError("Error en el elemento de video");
          setIsLoading(false);
        };
      } catch (err) {
        console.error("Camera initialization error:", err);
        let errorMessage = "No se pudo acceder a la cámara: ";

        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            errorMessage +=
              "Permisos denegados. Por favor permite el acceso a la cámara.";
          } else if (err.name === "NotFoundError") {
            errorMessage += "No se encontró cámara en el dispositivo.";
          } else if (err.name === "NotSupportedError") {
            errorMessage += "Navegador no compatible con cámara.";
          } else if (err.name === "NotReadableError") {
            errorMessage += "La cámara está siendo usada por otra aplicación.";
          } else {
            errorMessage += err.message;
          }
        } else {
          errorMessage += "Error desconocido.";
        }

        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initializeCamera();

    return () => {
      stopCamera();
    };
  }, [isCameraActive, stopCamera]);

  // Limpiar URLs de objeto cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Efecto adicional para detener cámara cuando el componente se desmonta
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Cámara de Fotos</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading && isCameraActive && (
        <div className="flex justify-center items-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Cargando cámara...</span>
        </div>
      )}

      <div className="relative">
        <div className="relative">
          <video
            ref={videoRef}
            style={{
              display: imagePreview ? "none" : "block",
              width: "100%",
              height: "auto",
              objectFit: "cover",
            }}
            className="w-full max-w-md mx-auto border-2 border-gray-300 rounded-lg"
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Foto tomada"
              className="w-full max-w-md mx-auto border-2 border-green-500 rounded-lg"
              style={{ width: "100%", height: "auto" }}
            />
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        {imagePreview && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white text-center">
              <p className="mb-2">✅ Foto tomada</p>
              <button
                onClick={restartCamera}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Tomar otra foto
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        {!imagePreview && isCameraActive && (
          <button
            onClick={takePhoto}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-semibold"
            disabled={isLoading}
          >
            📸 Tomar Foto
          </button>
        )}

        {!isCameraActive && (
          <button
            onClick={restartCamera}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Iniciar cámara
          </button>
        )}
      </div>

      {image && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Información de la foto:</h3>
          <div className="text-sm text-gray-600">
            <p>
              <strong>Nombre:</strong> {image.name}
            </p>
            <p>
              <strong>Tipo:</strong> {image.type}
            </p>
            <p>
              <strong>Tamaño:</strong> {(image.size / 1024).toFixed(2)} KB
            </p>
            <p>
              <strong>Última modificación:</strong>{" "}
              {new Date(image.lastModified).toLocaleString()}
            </p>
          </div>

          {/* Ejemplo de cómo enviar el archivo a un servidor */}
          <button
            onClick={() => {
              addImage(image);
            }}
            className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Subir foto (ejemplo)
          </button>
        </div>
      )}

      <div className="mt-4 text-center text-sm text-gray-500">
        Estado:{" "}
        {isCameraActive && !imagePreview
          ? "🟢 Cámara activa"
          : imagePreview
            ? "📷 Foto lista"
            : "🔴 Cámara detenida"}
      </div>
    </div>
  );
}

export default TakePhoto;
