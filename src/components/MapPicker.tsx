import { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPicker.css';

const DEFAULT_CENTER: L.LatLngTuple = [43.238949, 76.945465];
const DEFAULT_ZOOM = 13;

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface MapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (latitude: number, longitude: number) => void;
  height?: number;
}

/** Карта на чистом Leaflet (без react-leaflet) — клик и перетаскивание метки */
export default function MapPicker({ latitude, longitude, onChange, height = 280 }: MapPickerProps) {
  const hasInitial = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
  const [position, setPosition] = useState<L.LatLngTuple>(
    hasInitial ? [latitude!, longitude!] : DEFAULT_CENTER
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (hasInitial && (position[0] !== latitude || position[1] !== longitude)) {
      setPosition([latitude!, longitude!]);
    }
  }, [latitude, longitude, hasInitial]);

  useEffect(() => {
    if (!hasInitial) {
      onChange(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: position,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker(position, { icon: markerIcon, draggable: true }).addTo(map);
    markerRef.current = marker;
    marker.bindPopup('Перетащите метку или кликните по карте');

    marker.on('dragend', () => {
      const latLng = marker.getLatLng();
      const newPos: L.LatLngTuple = [latLng.lat, latLng.lng];
      setPosition(newPos);
      onChange(latLng.lat, latLng.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const newPos: L.LatLngTuple = [lat, lng];
      marker.setLatLng(newPos);
      setPosition(newPos);
      onChange(lat, lng);
    });

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng(position);
    map.setView(position, map.getZoom());
  }, [position]);

  return (
    <div className="map-picker" style={{ height }}>
      <div
        ref={containerRef}
        className="map-picker-container"
        style={{ height: '100%', width: '100%', borderRadius: 8 }}
      />
      <p className="map-picker-hint">
        Поставьте метку на карте (перетащите или кликните) — это геолокация клуба.
      </p>
    </div>
  );
}
