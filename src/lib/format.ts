export function formatCurrency(amount: number) {
  return `${amount.toLocaleString("en-US")} جنيه`;
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
