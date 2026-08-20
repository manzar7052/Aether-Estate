export function PropertyCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-brand-line/80 bg-brand-cream/60 animate-pulse">
      <div className="aspect-4/3 w-full bg-brand-sand/80" />
      <div className="flex flex-1 flex-col p-5 space-y-3">
        <div className="h-3 w-1/3 rounded-xs bg-brand-sand" />
        <div className="h-5 w-3/4 rounded-xs bg-brand-sand" />
        <div className="h-3 w-1/2 rounded-xs bg-brand-sand" />
        <div className="mt-4 flex gap-4 border-t border-brand-line/60 pt-3">
          <div className="h-3 w-12 rounded-xs bg-brand-sand" />
          <div className="h-3 w-12 rounded-xs bg-brand-sand" />
          <div className="h-3 w-16 rounded-xs bg-brand-sand" />
        </div>
        <div className="mt-4 h-9 w-full rounded-xs bg-brand-sand" />
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PropertyDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 animate-pulse space-y-8">
      <div className="h-4 w-48 rounded-xs bg-brand-sand" />
      <div className="aspect-16/9 w-full rounded-sm bg-brand-sand" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-8 w-2/3 rounded-xs bg-brand-sand" />
          <div className="h-4 w-1/3 rounded-xs bg-brand-sand" />
          <div className="h-24 w-full rounded-xs bg-brand-sand" />
        </div>
        <div className="h-64 rounded-sm bg-brand-sand" />
      </div>
    </div>
  );
}
