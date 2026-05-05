import { X } from "lucide-react";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

export function SliceIMG({
  images,
  removeImage,
}: {
  images: string[] | File[];
  removeImage: (name: string) => void;
}) {
  return (
    <div className="rounded-lg shadow-lg overflow-hidden shadow-gray-300 h-full w-full">
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth p-6">
        {images && images.length > 0 ? (
          images.map((img, index) => (
            <div
              key={index}
              className="relative shrink-0 snap-center flex items-center justify-center rounded-xl bg-gray-500 shadow-lg border border-gray-300 h-full w-full"
            >
              <Zoom>
                <img
                  src={img instanceof File ? URL.createObjectURL(img) : img}
                  alt={`Dispositivo ${index + 1}`}
                  className="max-h-72 object-cover rounded-lg"
                />
              </Zoom>
              {typeof img !== "string" && (
                <span>
                  <X
                    width={40}
                    height={40}
                    onClick={() => removeImage(img.name)}
                    className="absolute right-3 top-2 z-50 border-2 border-white p-1 bg-red-500 text-white rounded-full"
                  />
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="w-full min-h-64 flex items-center justify-center text-gray-300">
            No hay imágenes disponibles.
          </div>
        )}
      </div>
    </div>
  );
}
