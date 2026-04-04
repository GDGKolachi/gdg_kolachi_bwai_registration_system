function parseMapLocation(value) {
  if (!value) return null;

  const coordMatch = value.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const q = `${coordMatch[1]},${coordMatch[2]}`;
    return {
      embedUrl: `https://maps.google.com/maps?q=${q}&z=15&output=embed`,
      linkUrl: `https://www.google.com/maps?q=${q}`,
    };
  }

  if (value.includes('google.com/maps') || value.includes('goo.gl/maps')) {
    const encoded = encodeURIComponent(value);
    return {
      embedUrl: `https://maps.google.com/maps?q=${encoded}&output=embed`,
      linkUrl: value,
    };
  }

  // Treat as address/place name
  const encoded = encodeURIComponent(value);
  return {
    embedUrl: `https://maps.google.com/maps?q=${encoded}&z=15&output=embed`,
    linkUrl: `https://www.google.com/maps/search/${encoded}`,
  };
}

export default function MapEmbed({ mapLocation }) {
  const parsed = parseMapLocation(mapLocation);
  if (!parsed) return null;

  return (
    <div className="mt-6">
      <div className="ui-label mb-2">Location</div>
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <iframe
          src={parsed.embedUrl}
          className="h-56 w-full sm:h-64"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Workshop location"
        />
      </div>
      <a
        href={parsed.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gdg-blue hover:underline"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
        View on Google Maps
      </a>
    </div>
  );
}
