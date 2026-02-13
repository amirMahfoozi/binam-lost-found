import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import { X } from "lucide-react";
import L from "leaflet";
import { Link } from "react-router-dom";
import { loadMapItems, MapItem } from "../lib/api";
import { useNavigate } from "react-router-dom";
// Fix Leaflet marker icons (Vite/React builds often need this)
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow,
});

type MapModalProps = {
  open: boolean;
  onClose: () => void;
};

const UNI_NAME = "دانشگاه صنعتی شریف";
const FALLBACK_CENTER: [number, number] = [35.7036, 51.3517];

const API_BASE = "http://localhost:4000";

function toAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
// --- Colored marker icons (DivIcon with SVG) ---
function makePinIcon(color: string) {
  const svg = `
    <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" d="M12 2c-3.314 0-6 2.686-6 6 0 4.5 6 14 6 14s6-9.5 6-14c0-3.314-2.686-6-6-6zm0 8.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "", // important: prevents default leaflet styles
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

const LOST_ICON = makePinIcon("#ef4444");  // red
const FOUND_ICON = makePinIcon("#22c55e"); // green

function normalizeType(t: string) {
  const s = (t || "").toLowerCase();
  if (s === "lost") return "lost";
  if (s === "found") return "found";
  // in case backend returns "LOST"/"FOUND"
  if (t === "LOST") return "lost";
  if (t === "FOUND") return "found";
  return s;
}

function FitToGeoJson({ data }: { data: any }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [data, map]);
  return null;
}

function HoldToAddItem({
  onHold,
  holdMs = 5000,
  maxMovePx = 8,
}: {
  onHold: (lat: number, lng: number) => void;
  holdMs?: number;
  maxMovePx?: number;
}) {
  const map = useMap();

  useEffect(() => {
    let timer: number | null = null;
    let startPoint: L.Point | null = null;
    let startLatLng: L.LatLng | null = null;

    const clear = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      startPoint = null;
      startLatLng = null;
    };

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      // ignore right click
      if ((e.originalEvent as MouseEvent).button !== 0) return;

      startPoint = map.latLngToContainerPoint(e.latlng);
      startLatLng = e.latlng;

      timer = window.setTimeout(() => {
        if (!startLatLng) return;
        onHold(startLatLng.lat, startLatLng.lng);
        clear();
      }, holdMs);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!timer || !startPoint) return;
      const p = map.latLngToContainerPoint(e.latlng);
      const dist = p.distanceTo(startPoint);
      if (dist > maxMovePx) clear(); // user is dragging / moving too much
    };

    const onMouseUp = () => clear();
    const onDragStart = () => clear();
    const onZoomStart = () => clear();

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    map.on("dragstart", onDragStart);
    map.on("zoomstart", onZoomStart);

    return () => {
      clear();
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.off("dragstart", onDragStart);
      map.off("zoomstart", onZoomStart);
    };
  }, [map, onHold, holdMs, maxMovePx]);

  return null;
}


export function MapModal({ open, onClose }: MapModalProps) {
  const [campusGeoJson, setCampusGeoJson] = useState<any>(null);
  const [items, setItems] = useState<MapItem[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [pinsError, setPinsError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    fetch("/sharif-campus.geojson")
      .then((r) => r.json())
      .then((j) => setCampusGeoJson(j))
      .catch(() => setCampusGeoJson(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoadingPins(true);
    setPinsError(null);

    loadMapItems()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e: any) => setPinsError(e?.message || "Failed to load map items"))
      .finally(() => setLoadingPins(false));
  }, [open]);

  const boundaryStyle = useMemo(
    () => ({
      color: "red",
      weight: 3,
      fillColor: "red",
      fillOpacity: 0.12,
    }),
    []
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Campus Map</h2>
            <p className="text-sm text-gray-600">{UNI_NAME}</p>
            {loadingPins && <p className="text-xs text-gray-500">Loading pins…</p>}
            {pinsError && <p className="text-xs text-red-600">{pinsError}</p>}
          </div>

          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="h-[70vh] relative">
          <MapContainer center={FALLBACK_CENTER} zoom={16} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HoldToAddItem
  onHold={(lat, lng) => {
    // close modal and go to add-item with prefilled coords
    onClose();
    navigate(`/add-item?lat=${lat}&lng=${lng}`);
  }}
/>

            {/* Draw boundary */}
            {campusGeoJson && (
              <>
                <GeoJSON data={campusGeoJson} style={boundaryStyle as any} />
                <FitToGeoJson data={campusGeoJson} />
              </>
            )}

            {/* Pins */}
           {/* Pins */}
{items
  .map((it) => ({
    ...it,
    lat: Number(it.latitude),
    lng: Number(it.longitude),
  }))
  .filter((it) => Number.isFinite(it.lat) && Number.isFinite(it.lng))
  .map((it) => {
    const t = normalizeType(it.type);
    const icon = t === "found" ? FOUND_ICON : LOST_ICON;
    const imgSrc = toAbsoluteUrl(it.imageUrl);

    return (
      <Marker
        key={it.id}
        position={[it.lat, it.lng]}
        icon={icon}
      >
<Popup>
  <div className="min-w-[180px]">
    <div className="text-sm font-semibold">{it.title}</div>
    <div className="text-xs text-gray-600">
      {t === "found" ? "FOUND" : "LOST"}
      {it.createdAt ? ` • ${new Date(it.createdAt).toLocaleString()}` : ""}
    </div>

    {imgSrc ? (
      <img
        src={imgSrc}
        alt={it.title}
        className="mt-2 h-24 w-full rounded-md object-cover"
      />
    ) : null}

    <div className="mt-2">
      <button
        className="text-blue-600 text-sm underline"
        onClick={() => navigate(`/items/${it.id}`)}
      >
        View details
      </button>
    </div>
  </div>
</Popup>

      </Marker>
    );
  })}

          </MapContainer>

          {/* Legend */}
          <div className="absolute right-4 top-4 z-[999] rounded-lg bg-white/90 p-3 text-xs shadow space-y-2">
            <div className="font-semibold text-gray-800">Legend</div>

            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm border-2 border-red-600 bg-red-200/60" />
              <span>حدود دانشگاه</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              <span>Lost</span>
            </div>
            <div className="text-[11px] text-gray-600">
  Hold click on map (5s) to add an item here
          </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              <span>Found</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
