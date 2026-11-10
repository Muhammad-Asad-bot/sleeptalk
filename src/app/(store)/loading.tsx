/**
 * Shown instantly while a store page loads, so clicks respond straight away instead of the
 * old page sitting frozen until the server replies. Header and footer stay in place (layout).
 */
export default function StoreLoading() {
  return (
    <div className="container-site pt-6 md:pt-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-3 w-40" />
      <div className="skeleton mt-8 h-12 w-2/3 max-w-md md:h-14" />
      <div className="skeleton mt-4 h-4 w-1/2 max-w-sm" />
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5]" />
            <div className="skeleton mt-3 h-4 w-2/3" />
            <div className="skeleton mt-2 h-3 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
