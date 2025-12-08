export const Card = ({ title, detail }: { title: string; detail: string }) => {
  if (!title || !detail) return null;
  return (
    <div className="relative flex w-80 flex-col rounded-xl dark:border-amber-50 dark:bg-gray-600 bg-white bg-clip-border dark:text-white text-gray-700 shadow-md">
      <div className="p-6">
        <h5 className="mb-2 block font-sans text-xl font-semibold leading-snug tracking-normal text-blue-gray-900 antialiased">
          {title}
        </h5>
        <p className="block font-sans text-base font-light leading-relaxed text-inherit antialiased">
          {detail}
        </p>
      </div>
    </div>
  );
};
