export const TableTitleHead = ({ itemsTitle }: { itemsTitle: string[] }) => (
  <>
    {itemsTitle.map((title) => (
      <th
        key={title}
        scope="col"
        className="px-4 py-2 cursor-pointer whitespace-nowrap font-semibold"
      >
        {title}
      </th>
    ))}
  </>
);

interface TableItemBodyProps {
  itemsBody: {
    id: string;
    title: string;
    items: string[];
  }[];
}

export const TableItemBody = ({ itemsBody }: TableItemBodyProps) => (
  <>
    {itemsBody.map((body) => (
      <tr
        key={body.id}
        className="border-b dark:border-gray-700 border-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
      >
        <th
          scope="row"
          className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap"
        >
          {body.title}
        </th>

        {body.items.map((item, index) => (
          <td
            key={`${body.id}-item-${index}`}
            className="px-4 py-3 whitespace-nowrap"
          >
            {item}
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const TableMain = ({
  itemsTitle,
  itemsBody,
}: {
  itemsTitle: string[];
  itemsBody: {
    id: string;
    title: string;
    items: string[];
  }[];
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-max text-sm text-left text-gray-700 dark:text-gray-300 border border-zinc-400 border-collapse table-auto">
        <thead className="sticky top-0 z-10 bg-gray-300 dark:bg-[rgb(62,67,80)] text-gray-800 dark:text-gray-200 text-xs uppercase">
          <tr>
            <TableTitleHead itemsTitle={itemsTitle} />
          </tr>
        </thead>

        <tbody>
          <TableItemBody itemsBody={itemsBody} />
        </tbody>
      </table>
    </div>
  );
};
