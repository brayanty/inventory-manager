import React from "react";

export default function Paginator({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
}) {
  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 disabled:opacity-50"
      >
        ⬅
      </button>

      {[...Array(totalPages)].map((_, i) => {
        const page = i + 1;
        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded ${
              isActive
                ? "bg-blue-500 text-white font-semibold"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white"
            }`}
          >
            {page}
          </button>
        );
      })}

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 disabled:opacity-50"
      >
        ➡
      </button>
    </div>
  );
}
