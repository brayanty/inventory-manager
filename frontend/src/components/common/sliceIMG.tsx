import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

export function SliceIMG({ images }: { images: string[] }) {
  return (
    <div className="rounded-lg shadow-lg overflow-hidden shadow-gray-300 ">
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth p-6 max-h-80 w-full ">
        {images && images.length > 0 ? (
          images.map((img, index) => (
            <div
              key={index}
              className="shrink-0 min-w-[60%] md:min-w-[40%] lg:min-w-[35%] snap-center flex items-center justify-center rounded-xl bg-gray-500 shadow-lg border border-gray-300"
            >
              <Zoom>
                <img
                  src={img}
                  alt={`Dispositivo ${index + 1}`}
                  className="max-h-72 max-w-full w-auto object-contain rounded-lg"
                />
              </Zoom>
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
