import { useState } from 'react';
import { useEvents } from '../event-repository';
import EventCard from '../components/event-card';
import BrandLogo from '../../../shared/components/BrandLogo';
import { BRAND_NAME, BRAND_SERIES } from '../../../shared/constants/branding';

const ALL = '__all__';

export default function EventList() {
  const { data: events, isLoading, error } = useEvents();
  const [typeFilter, setTypeFilter] = useState(ALL);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading events…
        </div>
      </div>
    );
  }

  if (error && !events) {
    return (
      <div className="ui-card border-rose-200/80 bg-rose-50/50 px-5 py-4 text-sm font-medium text-rose-800">
        Failed to load events. Please refresh the page to try again.
      </div>
    );
  }

  const typeChips = Array.from(
    new Map(
      (events || [])
        .filter(e => e.eventTypeSlug)
        .map(e => [e.eventTypeSlug, e.eventTypeName || e.eventTypeSlug]),
    ).entries(),
  );

  const visible = typeFilter === ALL
    ? events
    : (events || []).filter(e => e.eventTypeSlug === typeFilter);

  return (
    <div>
      <div className="mb-12 text-center sm:mb-14">
        <BrandLogo className="mx-auto mb-6 h-24 w-auto max-w-[280px] sm:h-28 sm:max-w-[320px]" />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{BRAND_SERIES}</h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
          An event series by {BRAND_NAME}. Browse the sessions and register for the one that suits you best.
        </p>
      </div>

      {typeChips.length > 1 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              typeFilter === ALL
                ? 'bg-gdg-blue text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => setTypeFilter(ALL)}
          >
            All
          </button>
          {typeChips.map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                typeFilter === slug
                  ? 'bg-gdg-blue text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setTypeFilter(slug)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visible?.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {visible?.length === 0 && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          No events available yet. Check back soon.
        </div>
      )}
    </div>
  );
}
