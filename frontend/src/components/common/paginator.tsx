import usePageStore from "@/components/store/page";

export default function Paginator() {
  const { page, setPage, totalPages } = usePageStore();
  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNext = () => {
    if (page === totalPages) return;
    if (!(page < 1)) setPage(page + 1);
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={handlePrev}
        disabled={page === 1}
        className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 disabled:opacity-50"
      >
        ⬅
      </button>

      <div className="p-2 px-4 rounded text-white font-semibold bg-gray-200 dark:bg-gray-700 dark:text-white">
        {page}
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
