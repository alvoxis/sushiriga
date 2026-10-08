import type { Cents } from './money';

export const TIP_PRESETS: readonly Cents[] = [100, 200, 300, 500, 1000, 1500, 2000];

export type TipSelection =
  { kind: 'none' } | { kind: 'preset'; amount: Cents } | { kind: 'custom'; amount: Cents };

export interface Tip {
  id: string;
  orderId: string;
  amount: Cents;
  createdAt: string;
}
