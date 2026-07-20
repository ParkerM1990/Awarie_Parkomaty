export function formatDatePL(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "pl-PL",
    {
      timeZone: "Europe/Warsaw",
    }
  );
}