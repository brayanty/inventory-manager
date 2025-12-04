const tags = {
  "1": "h1",
  "2": "h2",
  "3": "h3",
  "4": "h4",
  "5": "h5",
  "6": "h6",
} as const;

export function Title({
  claseName,
  title,
  type,
  fontType,
  size,
}: {
  title: string;
  type: keyof typeof tags;
  fontType:
    | "normal"
    | "bold"
    | "light"
    | "thin"
    | "medium"
    | "semibold"
    | "extrabold"
    | "black";
  size: "text-xl" | "text-lg" | "text-md" | "text-sm" | "text-xs";
  claseName?: string;
}) {
  const Tag = tags[type];

  return <Tag className={`${claseName} font-${fontType} ${size}`}>{title}</Tag>;
}
