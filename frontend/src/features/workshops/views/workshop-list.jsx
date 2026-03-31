import { useWorkshops } from '../workshop-repository';
import WorkshopCard from '../components/workshop-card';
import BrandLogo from '../../../shared/components/BrandLogo';
import { BRAND_NAME, BRAND_SERIES } from '../../../shared/constants/branding';

export default function WorkshopList() {
  const { data: workshops, isLoading, error } = useWorkshops();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading workshops…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-card border-rose-200/80 bg-rose-50/50 px-5 py-4 text-sm font-medium text-rose-800">
        Failed to load workshops.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-12 text-center sm:mb-14">
        <BrandLogo className="mx-auto mb-6 h-24 w-auto max-w-[280px] sm:h-28 sm:max-w-[320px]" />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{BRAND_SERIES}</h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
          Workshop series by {BRAND_NAME}. Browse sessions and register for the one that fits you.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workshops?.map(workshop => (
          <WorkshopCard key={workshop.id} workshop={workshop} />
        ))}
      </div>
      {workshops?.length === 0 && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          No workshops available yet. Check back soon.
        </div>
      )}
    </div>
  );
}
