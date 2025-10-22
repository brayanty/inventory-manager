import { useRef, useEffect, useState, useCallback } from "react";
import jsQR from "jsqr";
import { getDeviceById } from "../services/devices";
import { TechnicalServiceEntry } from "../types/technicalService";

interface ReadQRProps {
  deviceSearchQR: (device: TechnicalServiceEntry) => void;
}

function ReadQR({ deviceSearchQR }: ReadQRProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  // Refs para mantener las variables entre renders
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(true);

  // Sincronizar el ref con el state
  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  // Función para detener completamente la cámara
  const stopCamera = useCallback(() => {
    // 1. Cancelar animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    // 2. Detener todas las tracks del stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    // 3. Limpiar video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
  }, []);

  // Effect para buscar dispositivo cuando se escanea un QR
  useEffect(() => {
    if (!scannedData) return;

    const fetchDevice = async () => {
      try {
        setIsLoading(true);
        const device = await getDeviceById(scannedData);
        if (device) {
          // DETENER EL ESCANEO ANTES de llamar a la función
          setIsScanning(false);
          deviceSearchQR(device);
        } else {
          setError("Dispositivo no encontrado");
        }
      } catch (err) {
        console.error("Error fetching device:", err);
        setError("Error al buscar el dispositivo");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevice();
  }, [scannedData, deviceSearchQR]);

  // Effect PRINCIPAL - se ejecuta solo cuando isScanning cambia
  // Reemplaza tu useEffect principal con esta versión mejorada
  useEffect(() => {
    if (!isScanning) {
      stopCamera();
      return;
    }

    const initializeScanner = async () => {
      const video = videoRef.current;
      const canvasElement = canvasRef.current;

      if (!video || !canvasElement) return;

      try {
        setError(null);
        setIsLoading(true);

        // 1. Verificar disponibilidad de cámara
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("La cámara no está disponible en este dispositivo");
        }

        // 2. Obtener stream con mejores opciones de compatibilidad
        const constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        // 3. Intentar con facingMode, si falla intentar sin especificar
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (facingError) {
          console.log(
            "Intentando cámara trasera falló, probando cámara por defecto"
          );
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        streamRef.current = stream;
        video.srcObject = stream;

        // 4. Manejar eventos de video
        video.onloadedmetadata = () => {
          video.play().catch((playError) => {
            console.error("Error al reproducir video:", playError);
            setError("No se puede reproducir el video de la cámara");
          });
        };

        video.onplaying = () => {
          setIsLoading(false);
          startScanningLoop();
        };

        video.onerror = () => {
          setError("Error en el elemento de video");
          setIsLoading(false);
        };
      } catch (err) {
        console.error("Camera initialization error:", err);
        let errorMessage = "No se pudo acceder a la cámara: ";

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

        setError(errorMessage);
        setIsLoading(false);
      }
    };

    const startScanningLoop = () => {
      const video = videoRef.current;
      const canvasElement = canvasRef.current;
      const canvas = canvasElement?.getContext("2d");

      if (!video || !canvasElement || !canvas) return;

      const tick = () => {
        if (!isScanningRef.current || !streamRef.current) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvasElement.height = video.videoHeight;
          canvasElement.width = video.videoWidth;

          canvas.drawImage(
            video,
            0,
            0,
            canvasElement.width,
            canvasElement.height
          );

          const imageData = canvas.getImageData(
            0,
            0,
            canvasElement.width,
            canvasElement.height
          );
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code?.data && code.data !== scannedData) {
            setScannedData(code.data);
            return; // Detener el loop cuando se encuentra un código
          }
        }

        if (isScanningRef.current) {
          animationFrameIdRef.current = requestAnimationFrame(tick);
        }
      };

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    initializeScanner();

    return () => {
      stopCamera();
    };
  }, [isScanning, stopCamera]);

  const restartScanning = () => {
    setScannedData(null);
    setError(null);
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  // Efecto adicional para detener cámara cuando el componente se desmonta
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Escáner de Código QR
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading && isScanning && (
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
              display: "none",
              width: "100%",
              height: "auto",
              objectFit: "cover",
            }}
          />
          <canvas
            ref={canvasRef}
            className={`w-full max-w-md mx-auto border-2 ${
              scannedData ? "border-green-500" : "border-gray-300"
            } rounded-lg ${!isScanning ? "opacity-50" : ""}`}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "60vh",
            }}
          />
        </div>

        {!isScanning && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white text-center">
              <p className="mb-2">✅ Dispositivo encontrado</p>
              <button
                onClick={restartScanning}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Escanear otro
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        {scannedData ? (
          <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded-lg">
            <strong>Datos escaneados:</strong>
            <div className="mt-2 break-all font-mono text-sm">
              {scannedData}
            </div>
            {isLoading && (
              <div className="mt-2 text-blue-600">
                🔍 Buscando dispositivo...
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">
            {isScanning
              ? "Acerca un código QR para escanear"
              : "Cámara detenida"}
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        {isScanning ? (
          <button
            onClick={stopScanning}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Detener cámara
          </button>
        ) : (
          <button
            onClick={restartScanning}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Iniciar escaneo
          </button>
        )}
      </div>

      <div className="mt-4 text-center text-sm text-gray-500">
        Estado: {isScanning ? "🟢 Escaneando" : "🔴 Detenido"}
      </div>
    </div>
  );
}

export default ReadQR;
