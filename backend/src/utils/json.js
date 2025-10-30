function convertBigInt(value) {
  if (typeof value === "bigint") {
    const num = Number(value);
    return Number.isSafeInteger(num) ? num : value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(convertBigInt);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([k, v]) => [k, convertBigInt(v)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function jsonResponse(res, payload, status = 200) {
  const data = convertBigInt(payload);
  return res.status(status).json(data);
}

module.exports = { convertBigInt, jsonResponse };
