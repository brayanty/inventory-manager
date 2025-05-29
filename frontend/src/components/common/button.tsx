import React from "react";

const Button = ({
  id,
  className,
  onClick,
  children,
}: {
  id?: string;
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  return (
    <button
      key={id}
      onClick={onClick}
      type="button"
      className={`px-1 py-1 max-h-max rounded flex justify-center gap-2 items-center mx-auto shadow-xl  backdrop-blur-md lg:font-semibold isolation-auto border-black before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-emerald-500  before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-400 relative z-10 overflow-hidden font-semibold text-amber-50 group transition duration-300 ease-in-out} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
