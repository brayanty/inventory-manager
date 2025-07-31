import React from "react";

interface DropDownProps {
  items: string[];
  select?: string;
  title?: string;
  onSelect: (item: string) => void;
}

export const DropDown: React.FC<DropDownProps> = ({
  items,
  select,
  title = "Seleccionar",
  onSelect,
}) => {
  return (
    <div className="relative dropdown dropdown-end dropdown-center">
      <div tabIndex={0} role="button" className="btn w-32 m-1">
        {select || title}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-50 min-w-32 max-w-60 p-2 shadow-sm"
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
