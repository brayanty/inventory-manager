export default function Paginator({
  selectPage,
  onPageChange,
}: {
  selectPage: number;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
}) {
  const handlePrev = () => {
    if (selectPage > 1) onPageChange(selectPage - 1);
  };

  const handleNext = () => {
    if (selectPage < 1) onPageChange(selectPage + 1);
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={handlePrev}
        disabled={selectPage === 1}
        className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 disabled:opacity-50"
      >
        ⬅
      </button>

      <div className="p-2 px-4 rounded text-white font-semibold bg-gray-200 dark:bg-gray-700 dark:text-white">
        {selectPage}
      </div>

      <button
        onClick={handleNext}
        className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 disabled:opacity-50"
      >
        ➡
      </button>
    </div>
  );
}
