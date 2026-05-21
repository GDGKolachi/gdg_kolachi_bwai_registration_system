function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  'bg-gdg-blue text-white',
  'bg-gdg-red text-white',
  'bg-gdg-green text-white',
  'bg-gdg-yellow text-slate-900',
];

export default function SpeakersList({ speakers }) {
  if (!speakers?.length) return null;

  return (
    <div className="mt-8 border-t border-slate-100 pt-8">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Speakers & Facilitators
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {speakers.map((speaker, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            {speaker.photo_url ? (
              <img
                src={speaker.photo_url}
                alt={speaker.name}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white"
              />
            ) : (
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColors[i % avatarColors.length]}`}
              >
                {getInitials(speaker.name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{speaker.name}</div>
              <div className="text-xs text-slate-500 truncate">{speaker.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
