// Enhanced version with better state management
import { useRef, useEffect, useState } from "react";
import jsQR from "jsqr";
import { getDeviceById } from "../services/devices";

function ReadQR() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [qrData, setQrData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!qrData) return;
    const getDevice = async () => {
      const response = await getDeviceById(qrData);

      const data = await JSON.parse(response);
      console.log(data);
    };
    getDevice();
  }, [qrData]);

  useEffect(() => {
    const video = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvas = canvasElement.getContext("2d");

    let animationFrameId;

    function drawLine(begin, end, color) {
      canvas.beginPath();
      canvas.moveTo(begin.x, begin.y);
      canvas.lineTo(end.x, end.y);
      canvas.lineWidth = 4;
      canvas.strokeStyle = color;
      canvas.stroke();
    }

    function tick() {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        setIsLoading(false);

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
          inversionAttempts: "dontInvert",
        });
        if (code) {
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
          setQrData(code.data);
          if (code.data) {
            return;
          }
        } else {
          setQrData(null);
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(function (stream) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.play();
        animationFrameId = requestAnimationFrame(tick);
      })
      .catch(function (err) {
        setError("Unable to access camera: " + err.message);
        setIsLoading(false);
      });

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (video.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="">
      <h1 className="text-2xl font-bold mb-4">QR Code Scanner</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isLoading && <div className="mb-4">⌛ Loading video...</div>}

      <video ref={videoRef} style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        className={`w-full h-full border-2 ${
          qrData ? "border-green-500" : "border-gray-300"
        } rounded-lg`}
      />

      <div className="mt-4">
        {qrData ? (
          <div className="bg-green-100 p-4 rounded-lg">
            <strong>Scanned Data:</strong>
            <div className="mt-2 break-all">{qrData}</div>
          </div>
        ) : (
          <div className="text-gray-500">No QR code detected</div>
        )}
      </div>
    </div>
  );
}

export default ReadQR;
