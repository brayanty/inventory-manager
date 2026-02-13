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
