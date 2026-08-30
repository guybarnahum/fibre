export const CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS = 25;

export function ageYearsAt(birthDate, at) {
  if (birthDate === null || birthDate === undefined) return null;
  if (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new TypeError("birthDate must use YYYY-MM-DD");
  }
  if (typeof at !== "string" || !Number.isFinite(Date.parse(at))) {
    throw new TypeError("age timestamp must be an ISO timestamp");
  }
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const date = new Date(at);
  let age = date.getUTCFullYear() - birthYear;
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age < 0 ? null : age;
}
