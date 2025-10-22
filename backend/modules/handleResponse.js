export function handleSuccess(
  req,
  res,
  data,
  message = "Success",
  status = 200
) {
  return res.status(status).json({
    success: true,
    status: status,
    message: message,
    data: data,
    timestamp: new Date().toISOString(),
  });
}

export function handleError(
  req,
  res,
  message = "Error interno",
  status = 500,
  details = null
) {
  const response = {
    success: false,
    status: status,
    message: message,
    timestamp: new Date().toISOString(),
  };

  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }

  return res.status(status).json(response);
}
