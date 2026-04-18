export function createGenerateMessageProgressOptions<TLocation>(location: TLocation, providerName: string) {
  return {
    location,
    title: `Generating commit message with ${providerName}`,
    cancellable: true as const
  };
}
