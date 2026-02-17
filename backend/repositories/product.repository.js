export async function getValidProducts(client, ids) {
  const { rows } = await client.query(
    `
    SELECT id, name, price
    FROM product
    WHERE id = ANY($1)
    AND stock > 0
    `,
    [ids],
  );

  return rows;
}

export async function decrementStock(client, ids) {
  const { rows } = await client.query(
    `
    UPDATE product
    SET stock = stock - 1
    WHERE id = ANY($1)
    AND stock > 0 
    `,
    [ids],
  );
  return rows;
}

export async function registerSale(client, productSale) {
    const saleRecords = productSale.map((item) => {
      const dbP = dbProducts.find((p) => p.id === item.id);
      return {
        stock: item.stock,
        price: dbP.price,
        category: dbP.category,
        product_id: item.id,
      };
    });

    await client.query(
      `INSERT INTO soldProduct (client_name, sales, price,category, product_id,sold_at)
       SELECT client_name, stock, price, category, product_id, NOW()
       FROM jsonb_to_recordset($1::jsonb) AS t(client_name varchar(250), stock int, price numeric(10,2), category varchar(100), product_id int)`,
      [JSON.stringify(saleRecords)],
    );
}
