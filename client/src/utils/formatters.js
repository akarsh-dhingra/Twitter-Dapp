export function shortenAddress(address, start = 6, end = 4) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatTimestamp(value) {
  if (!value) {
    return "Unknown date";
  }

  const numericValue = Number(value);
  const timestamp = numericValue > 1_000_000_000_000 ? numericValue : numericValue * 1000;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}
