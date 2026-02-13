export async function insertDevice(client, data) {
  const {
    client_name,
    device,
    model,
    imei,
    number_phone,
    price,
    price_pay,
    detail,
    faults,
  } = data;
  const { rows } = await client.query(
    `
    INSERT INTO device
    (client_name, device, model, imei, number_phone, price, detail, faults, price_pay)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      client_name,
      device,
      model,
      imei,
      number_phone,
      price,
      detail,
      JSON.stringify(faults),
      price_pay,
    ],
  );

  return rows[0];
}

export async function insertHistoryTicket(
  client,
  deviceId,
  products,
  totalPrice,
) {
  await client.query(
    `
    INSERT INTO historyTicket (device_id, spare_parts, total_price)
    VALUES ($1,$2,$3)
    `,
    [
      deviceId,
      JSON.stringify(
        products.map((p) => ({
          id: p.id,
          price: p.price,
        })),
      ),
      totalPrice,
    ],
  );
}
