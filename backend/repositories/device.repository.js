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

export async function insertDeviceUpdate(
  client,
  setQuery,
  keys,
  values,
  deviceID,
) {
  const queryDevice = `UPDATE device SET ${setQuery} WHERE id = $${keys.length + 1} RETURNING *`;

  const { rows, rowCount } = await client.query(queryDevice, [
    ...values,
    deviceID,
  ]);

  return { rows, rowCount };
}

export async function getDeviceByID(client, deviceID) {
  const { rows } = await client.query(
    "SELECT * FROM device WHERE id = $1 AND deleted_at IS NULL",
    [deviceID],
  );
  return { device: rows[0] };
}

export async function updateDeviceStatusPay(client, deviceID, outputStatus) {
  const { rows, rowCount } = await client.query(
    `
    UPDATE device SET output_status = $2, exit_date = NOW(), warrant_limit = NOW() + INTERVAL '30 days' WHERE id = $1 RETURNING *
    `,
    [deviceID, outputStatus],
  );
  return { rows, rowCount };
}

export async function updateDeviceStatusNoPay(client, deviceID, outputStatus) {
  const { rows, rowCount } = await client.query(
    `
    UPDATE device SET output_status = $2, exit_date = NOW() WHERE id = $1 RETURNING *
    `,
    [deviceID, outputStatus],
  );
  return { rows, rowCount };
}
