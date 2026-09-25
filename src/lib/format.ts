export function formatCad(amount: number) {
  const formatted = new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `$${formatted} CAD`;
}

export function formatHourly(amount: number) {
  const formatted = new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `$${formatted} CAD/hr`;
}

export function formatBudget(min: number, max: number) {
  const money = (amount: number) =>
    `$${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(amount)}`;
  if (min === max) return `${money(min)} CAD`;
  return `${money(min)}–${money(max)} CAD`;
}
