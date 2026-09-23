function iso(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new TypeError("Inside Fibre public availability requires ISO time");
  }
  return value;
}

export function publicInsideFibreAvailability(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Inside Fibre availability must be an object");
  }
  const startAt = iso(value.startAt);
  const endAt = iso(value.endAt);
  if (Date.parse(endAt) <= Date.parse(startAt)) {
    throw new TypeError("Inside Fibre availability must end after it starts");
  }
  return Object.freeze({ startAt, endAt });
}
