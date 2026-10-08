import type { CartLine, OrderItem, Product } from '@/types';

/** Snapshots cart lines into order items (names/prices as seen at checkout). */
export function buildOrderItems(lines: CartLine[], products: Product[]): OrderItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    ...(line.selectedOptions ? { selectedOptions: line.selectedOptions } : {}),
    name: byId.get(line.productId)?.name ?? line.productId,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));
}
