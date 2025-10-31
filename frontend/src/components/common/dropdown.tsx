import React from "react";

interface DropDownProps {
  className?: string;
  items: string[];
  select?: string;
  title?: string;
  onSelect: (item: string) => void;
}

export const DropDown: React.FC<DropDownProps> = ({
  className = "bg-base-100 text-base-content",
  items,
  select,
  title = "Seleccionar",
  onSelect,
}) => {
  return (
    <div className="relative dropdown dropdown-end dropdown-center">
      <div tabIndex={0} role="button" className="btn w-20 max-w-fit m-1">
        {select || title}
      </div>
      <ul
        tabIndex={0}
        className={`${className} dropdown-content menu rounded-box z-50 min-w-20 max-w-40 p-2 shadow-sm`}
      >
        {items.map((item) => {
          return (
            <li key={item}>
              <a
                onClick={() => {
                  onSelect(item);
                }}
                className="cursor-pointer"
              >
                {item}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
