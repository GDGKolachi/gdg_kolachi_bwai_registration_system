import { Link } from 'react-router-dom';
import { getStatusLabel, isRegistrationOpen } from '../workshop-service';
import CapacityBadge from './capacity-badge';

const badgeColors = {
  open: 'bg-green-100 text-gdg-green',
  closed: 'bg-red-100 text-gdg-red',
  upcoming: 'bg-blue-100 text-gdg-blue',
  completed: 'bg-gray-100 text-gdg-gray',
};

export default function WorkshopCard({ workshop }) {
  const canRegister = isRegistrationOpen(workshop);

  return (
    <div className="bg-white rounded-xl p-6 border border-gdg-border hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">{workshop.title}</h3>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeColors[workshop.status] || ''}`}>
          {getStatusLabel(workshop.status)}
        </span>
      </div>
      <p className="text-gdg-gray text-sm flex-1">
        {workshop.description?.substring(0, 150)}
        {workshop.description?.length > 150 ? '...' : ''}
      </p>
      <div className="text-sm text-gdg-gray flex gap-4">
        <span>{workshop.date}</span>
        <span>{workshop.time}</span>
        <span>{workshop.venue}</span>
      </div>
      <CapacityBadge workshop={workshop} />
      <div className="flex gap-2 mt-1">
        <Link to={`/workshops/${workshop.id}`} className="inline-flex items-center justify-center px-4 py-1.5 border-2 border-gdg-border rounded-lg text-sm font-semibold text-gdg-gray hover:border-gdg-blue hover:text-gdg-blue no-underline">
          Details
        </Link>
        {canRegister && (
          <Link to={`/register/${workshop.id}`} className="inline-flex items-center justify-center px-4 py-1.5 bg-gdg-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-600 no-underline">
            Register
          </Link>
        )}
      </div>
    </div>
  );
}
