export const TableTitleHead = ({ itemsTitle }: { itemsTitle: string[] }) =>
  itemsTitle.map((title) => <th key={title}>{title}</th>);
