import { useParams, Link } from 'react-router-dom';
import { useWorkshopById } from '../workshop-repository';
import { isRegistrationOpen, isWorkshopFull, getStatusLabel } from '../workshop-service';
import CapacityBadge from '../components/capacity-badge';

const badgeColors = {
  open: 'bg-green-100 text-gdg-green',
  closed: 'bg-red-100 text-gdg-red',
  upcoming: 'bg-blue-100 text-gdg-blue',
  completed: 'bg-gray-100 text-gdg-gray',
};

export default function WorkshopDetail() {
  const { id } = useParams();
  const { data: workshop, isLoading, error } = useWorkshopById(id);

  if (isLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading workshop...</div>;
  if (error) return <div className="bg-red-100 text-gdg-red p-3 rounded-lg">Workshop not found.</div>;
  if (!workshop) return null;

  const canRegister = isRegistrationOpen(workshop);
  const full = isWorkshopFull(workshop);

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="text-sm text-gdg-gray mb-4 inline-block hover:text-gdg-blue">
        &larr; Back to Workshops
      </Link>
      <div className="bg-white rounded-xl p-6 border border-gdg-border mt-2">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold">{workshop.title}</h1>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeColors[workshop.status] || ''}`}>
            {getStatusLabel(workshop.status)}
          </span>
        </div>

        <p className="text-gdg-gray leading-relaxed mb-6">{workshop.description}</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-xs text-gdg-gray mb-1">Date</div>
            <div className="font-medium">{workshop.date}</div>
          </div>
          <div>
            <div className="text-xs text-gdg-gray mb-1">Time</div>
            <div className="font-medium">{workshop.time}</div>
          </div>
          <div>
            <div className="text-xs text-gdg-gray mb-1">Venue</div>
            <div className="font-medium">{workshop.venue}</div>
          </div>
          <div>
            <div className="text-xs text-gdg-gray mb-1">Capacity</div>
            <CapacityBadge workshop={workshop} />
          </div>
        </div>

        {canRegister && (
          <Link to={`/register/${workshop.id}`} className="block w-full text-center py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 no-underline">
            Register for this Workshop
          </Link>
        )}
        {full && workshop.status === 'open' && (
          <div className="text-center p-4 bg-red-100 rounded-lg text-gdg-red font-medium">
            This workshop is at full capacity
          </div>
        )}
        {workshop.status === 'closed' && (
          <div className="text-center p-4 bg-gdg-light-gray rounded-lg text-gdg-gray font-medium">
            Registration is closed
          </div>
        )}
      </div>
    </div>
  );
}
