export const TableTitleHead = ({ itemsTitle }: { itemsTitle: string[] }) =>
  itemsTitle.map((title) => (
    <th className="px-4 py-2 cursor-pointer whitespace-nowrap" key={title}>
      {title}
    </th>
  ));
