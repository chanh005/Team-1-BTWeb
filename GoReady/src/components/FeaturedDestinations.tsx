import React from 'react';
import type { Tour } from '../types';

interface FeaturedDestinationsProps {
  tours: Tour[];
  onSelectDestination: (destination: string) => void;
}

const FEATURED_DESTINATION_NAMES = [
  'Phú Quốc',
  'Đà Nẵng - Hội An',
  'Sa Pa',
  'Hà Giang Loop',
  'Nha Trang',
  'Đà Lạt',
  'Quy Nhơn',
  'Tokyo',
];

const FeaturedDestinations: React.FC<FeaturedDestinationsProps> = ({ tours, onSelectDestination }) => {
  const destinations = React.useMemo(
    () =>
      FEATURED_DESTINATION_NAMES.map((name) => {
        const matches = tours.filter((t) => t.destination === name);
        return { name, count: matches.length, image: matches[0]?.coverImage };
      }).filter((d) => d.image),
    [tours]
  );

  if (destinations.length === 0) return null;

  return (
    <section id="featured-destinations" className="container-px mx-auto py-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-slate-900">Điểm đến nổi bật</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {destinations.map((d) => (
          <button
            key={d.name}
            onClick={() => onSelectDestination(d.name)}
            className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-soft transition hover:-translate-y-1 hover:shadow-card"
          >
            <div className="relative h-32 overflow-hidden sm:h-40">
              <img
                src={d.image}
                alt={d.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-3 right-3 font-heading text-sm font-bold text-white sm:text-base">{d.name}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs font-medium text-slate-500">{d.count} tour</span>
              <span className="text-xs font-semibold text-primary-700 group-hover:underline">Khám phá →</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default FeaturedDestinations;
