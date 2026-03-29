import { useWorkshops } from '../workshop-repository';
import WorkshopCard from '../components/workshop-card';

export default function WorkshopList() {
  const { data: workshops, isLoading, error } = useWorkshops();

  if (isLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading workshops...</div>;
  if (error) return <div className="bg-red-100 text-gdg-red p-3 rounded-lg mb-4">Failed to load workshops.</div>;

  return (
    <div>
      <div className="text-center mb-10">
        <div className="flex justify-center gap-1.5 mb-4">
          <span className="w-3 h-3 rounded-full bg-gdg-blue" />
          <span className="w-3 h-3 rounded-full bg-gdg-red" />
          <span className="w-3 h-3 rounded-full bg-gdg-yellow" />
          <span className="w-3 h-3 rounded-full bg-gdg-green" />
        </div>
        <h1 className="text-4xl font-bold text-gdg-dark">Build with AI</h1>
        <p className="text-lg text-gdg-gray max-w-xl mx-auto mt-3">
          Workshop series by GDG Kolachi. Choose a workshop and register to join.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workshops?.map(workshop => (
          <WorkshopCard key={workshop.id} workshop={workshop} />
        ))}
      </div>
      {workshops?.length === 0 && (
        <div className="text-center py-16 text-gdg-gray">
          No workshops available yet. Check back soon!
        </div>
      )}
    </div>
  );
}
