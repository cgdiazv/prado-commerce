export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "ON_BACKORDER";

export function parseStockStatus(value: unknown): StockStatus {
  if (value === "OUT_OF_STOCK" || value === "ON_BACKORDER") {
    return value;
  }

  return "IN_STOCK";
}

export function isStockUnavailable(
  stockStatus: StockStatus,
  inventory: number | undefined,
  requestedQuantity = 1,
): boolean {
  return stockStatus === "OUT_OF_STOCK" ||
    (stockStatus === "IN_STOCK" && (inventory ?? 0) < requestedQuantity);
}
