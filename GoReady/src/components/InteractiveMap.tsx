import React from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Coordinate, ItineraryDay } from '../types';

const TYPE_ICON: Record<Coordinate['type'], string> = {
  airport: '✈️',
  hotel: '🏨',
  attraction: '📍',
  restaurant: '🍽️',
  stop: '🚩',
};

const buildIcon = (type: Coordinate['type'], active: boolean) =>
  L.divIcon({
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:${active ? 36 : 30}px;height:${active ? 36 : 30}px;
      border-radius:9999px;
      background:${active ? '#548dd7' : '#ffffff'};
      border:2px solid ${active ? '#87EDFF' : '#548dd7'};
      box-shadow:0 4px 10px rgba(84,141,215,0.35);
      font-size:${active ? '16px' : '13px'};
    ">${TYPE_ICON[type]}</div>`,
    className: '',
    iconSize: [active ? 36 : 30, active ? 36 : 30],
    iconAnchor: [active ? 18 : 15, active ? 18 : 15],
  });

const FitBounds: React.FC<{ points: Coordinate[] }> = ({ points }) => {
  const map = useMap();
  React.useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
};

interface InteractiveMapProps {
  route: Coordinate[];
  itinerary: ItineraryDay[];
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ route, itinerary }) => {
  const [selectedDay, setSelectedDay] = React.useState<number | 'all'>('all');

  const dayStops = React.useMemo(() => {
    if (selectedDay === 'all') return route;
    const day = itinerary.find((d) => d.day === selectedDay);
    if (!day) return route;
    const stops = day.activities.map((a) => a.location).filter((c): c is Coordinate => !!c);
    return stops.length > 0 ? stops : route;
  }, [selectedDay, route, itinerary]);

  const center: [number, number] = route.length ? [route[0].lat, route[0].lng] : [16.0, 106.0];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50 p-2.5">
        <button
          onClick={() => setSelectedDay('all')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            selectedDay === 'all' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Toàn bộ lộ trình
        </button>
        {itinerary.map((d) => (
          <button
            key={d.day}
            onClick={() => setSelectedDay(d.day)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selectedDay === d.day ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Ngày {d.day}
          </button>
        ))}
      </div>
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: '360px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={dayStops} />
        <Polyline
          positions={dayStops.map((s) => [s.lat, s.lng])}
          pathOptions={{ color: '#548dd7', weight: 4, opacity: 0.85, dashArray: selectedDay === 'all' ? undefined : '6 6' }}
        />
        <Polyline positions={dayStops.map((s) => [s.lat, s.lng])} pathOptions={{ color: '#87EDFF', weight: 1.5, opacity: 0.9 }} />
        {dayStops.map((stop, i) => (
          <Marker key={`${stop.name}-${i}`} position={[stop.lat, stop.lng]} icon={buildIcon(stop.type, i === 0 || i === dayStops.length - 1)}>
            <Popup>
              <div className="text-xs font-semibold">{stop.name}</div>
              <div className="text-[10px] capitalize text-slate-500">{stop.type}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;
