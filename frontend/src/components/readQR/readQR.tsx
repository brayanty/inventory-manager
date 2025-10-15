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
    console.log("🔴 Deteniendo cámara...");

    // 1. Cancelar animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    // 2. Detener todas las tracks del stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("🛑 Deteniendo track:", track.kind);
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
  useEffect(() => {
    console.log("🔄 useEffect principal, isScanning:", isScanning);

    // Si NO estamos escaneando, detener todo
    if (!isScanning) {
      stopCamera();
      return;
    }

    // Si estamos escaneando, iniciar la cámara
    const initializeScanner = async () => {
      const video = videoRef.current;
      const canvasElement = canvasRef.current;

      if (!video || !canvasElement) return;

      const canvas = canvasElement.getContext("2d");
      if (!canvas) return;

      try {
        setError(null);
        setIsLoading(true);

        // Obtener stream de cámara
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        streamRef.current = stream;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");

        await video.play();
        setIsLoading(false);

        // Función para dibujar líneas
        const drawLine = (
          begin: { x: number; y: number },
          end: { x: number; y: number },
          color: string
        ) => {
          canvas.beginPath();
          canvas.moveTo(begin.x, begin.y);
          canvas.lineTo(end.x, end.y);
          canvas.lineWidth = 4;
          canvas.strokeStyle = color;
          canvas.stroke();
        };

        // Función principal de escaneo
        const tick = () => {
          // Verificar si todavía estamos escaneando
          if (!isScanningRef.current) {
            console.log("⏹️ Tick detenido porque isScanning es false");
            return;
          }

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
            const code = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              {
                inversionAttempts: "dontInvert",
              }
            );

            if (code) {
              // Dibujar marco alrededor del QR
              drawLine(
                code.location.topLeftCorner,
                code.location.topRightCorner,
                "#FF3B58"
              );
              drawLine(
                code.location.topRightCorner,
                code.location.bottomRightCorner,
                "#FF3B58"
              );
              drawLine(
                code.location.bottomRightCorner,
                code.location.bottomLeftCorner,
                "#FF3B58"
              );
              drawLine(
                code.location.bottomLeftCorner,
                code.location.topLeftCorner,
                "#FF3B58"
              );

              if (code.data && code.data !== scannedData) {
                console.log("✅ QR detectado:", code.data);
                setScannedData(code.data);
                // NO llamar a requestAnimationFrame aquí
                return;
              }
            }
          }

          // Continuar el loop solo si seguimos escaneando
          if (isScanningRef.current) {
            animationFrameIdRef.current = requestAnimationFrame(tick);
          }
        };

        // Iniciar el loop de escaneo
        animationFrameIdRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error("Camera error:", err);
        setError("No se pudo acceder a la cámara: " + (err as Error).message);
        setIsLoading(false);
      }
    };

    initializeScanner();

    // Cleanup function - se ejecuta cuando el componente se desmonta o cuando isScanning cambia
    return () => {
      console.log("🧹 Ejecutando cleanup");
      if (!isScanning) {
        stopCamera();
      }
    };
  }, [isScanning, stopCamera]); // Solo dependemos de isScanning y stopCamera

  const restartScanning = () => {
    console.log("🔄 Reiniciando escaneo");
    setScannedData(null);
    setError(null);
    setIsScanning(true);
  };

  const stopScanning = () => {
    console.log("⏹️ Deteniendo escaneo manualmente");
    setIsScanning(false);
  };

  // Efecto adicional para detener cámara cuando el componente se desmonta
  useEffect(() => {
    return () => {
      console.log("🗑️ Componente desmontándose - limpiando todo");
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
        <video ref={videoRef} style={{ display: "none" }} />
        <canvas
          ref={canvasRef}
          className={`w-full max-w-md mx-auto border-2 ${
            scannedData ? "border-green-500" : "border-gray-300"
          } rounded-lg ${!isScanning ? "opacity-50" : ""}`}
        />

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
