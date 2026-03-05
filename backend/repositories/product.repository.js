export async function getValidProducts(client, products) {
  if (!products.length) {
    return { rows: [], rowCount: 0 };
  }

  const ids = products.map((p) => p.id);
  const quantities = products.map((p) => p.quantity);

  const { rows, rowCount } = await client.query(
    `
    SELECT p.id, p.name, p.price
    FROM product p
    JOIN UNNEST($1::int[], $2::int[]) AS u(id, quantity)
      ON p.id = u.id
    WHERE p.stock >= u.quantity;
    `,
    [ids, quantities]
  );

  return { rows, rowCount };
}

export async function decrementStock(client, products) {
  const ids = products.map((p) => p.id);
  const quantities = products.map((p) => p.quantity);

  const { rows } = await client.query(
    `
    UPDATE product p
    SET stock = p.stock - u.quantity
    FROM UNNEST($1::int[], $2::int[]) AS u(id, quantity)
    WHERE p.id = u.id
      AND p.stock >= u.quantity
    RETURNING p.id, p.stock;
    `,
    [ids, quantities],
  );

  return rows;
}

export async function registerSale(client, productSale) {
  const saleRecords = productSale.map((item) => {
    return {
      quantity: item.quantity,
      price: item.price,
      category: item.category,
      product_id: item.id,
    };
  });

  await client.query(
    `INSERT INTO soldProduct (client_name, sales, price,category, product_id,sold_at)
       SELECT client_name, quantity, price, category, product_id, NOW()
       FROM jsonb_to_recordset($1::jsonb) AS t(client_name varchar(250), quantity int, price numeric(10,2), category varchar(100), product_id int)`,
    [JSON.stringify(saleRecords)],
  );
}
