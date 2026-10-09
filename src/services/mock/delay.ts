/** Small artificial latency so mock services behave like a network (0 in tests). */
export function mockDelay(ms = 150): Promise<void> {
  if (import.meta.env.MODE === 'test') return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
