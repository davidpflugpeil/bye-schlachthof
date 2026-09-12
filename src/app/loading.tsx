/** Lightweight skeleton so navigation never shows a blank screen. */
export default function Loading() {
  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10" role="status" aria-label="Inhalte werden geladen">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-6">
        <div className="space-y-4">
          <div className="skeleton h-[22rem] rounded-2xl sm:h-[24rem]" />
          <div className="skeleton h-12 rounded-lg" />
        </div>
        <div className="space-y-4">
          <div className="skeleton hidden h-56 rounded-xl lg:block" />
          <div className="skeleton h-24 rounded-lg" />
          <div className="skeleton h-24 rounded-lg" />
          <div className="skeleton h-24 rounded-lg" />
        </div>
      </div>
      <span className="sr-only">Inhalte werden geladen …</span>
    </div>
  );
}
