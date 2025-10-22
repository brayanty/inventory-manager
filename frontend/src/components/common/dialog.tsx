import React from "react";

function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  overlayClickCloses = true,
  width = "max-w-md max-h-md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  overlayClickCloses?: boolean;
  width?: string;
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && overlayClickCloses) {
      onClose();
    }
  };

  return (
    <div
      className="p-4 fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div
        className={`p-2 bg-white rounded-lg shadow-lg relative w-full ${width}`}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold"
          >
            &times;
          </button>
        )}
        {title && (
          <h2 className="text-xl text-center text-black font-semibold mb-4">
            {title}
          </h2>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
