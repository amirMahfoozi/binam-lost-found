import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import { X } from "lucide-react";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { loadItems, loadTags, TagDto, API_BASE } from "../lib/api";

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

type MapItem = {
  id: number;
  title: string;
  description: string;
  type: string;
  latitude: number | string;
  longitude: number | string;
  createdAt?: string;
  imageUrls?: string | null;
  tagIds: number[];
};

const UNI_NAME = "دانشگاه صنعتی شریف";
const FALLBACK_CENTER: [number, number] = [35.7036, 51.3517];

function toAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function makePinIcon(color: string) {
  const svg = `
    <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" d="M12 2c-3.314 0-6 2.686-6 6 0 4.5 6 14 6 14s6-9.5 6-14c0-3.314-2.686-6-6-6zm0 8.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

const LOST_ICON = makePinIcon("#ef4444");
const FOUND_ICON = makePinIcon("#22c55e");

function normalizeType(t: string) {
  const s = (t || "").toLowerCase();
  if (s === "lost") return "lost";
  if (s === "found") return "found";
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
      if (p.distanceTo(startPoint) > maxMovePx) clear();
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

  const [tagById, setTagById] = useState<Record<number, TagDto>>({});

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

    Promise.all([loadItems(), loadTags()])
      .then(([itemsRes, tags]) => {
        setItems(Array.isArray(itemsRes.items) ? (itemsRes.items as any) : []);
        const map: Record<number, TagDto> = {};
        tags.forEach((t) => (map[t.tid] = t));
        setTagById(map);
      })
      .catch((e: any) => setPinsError(e?.message || "Failed to load map items"))
      .finally(() => setLoadingPins(false));
  }, [open]);

  const boundaryStyle = useMemo(
    () => ({ color: "red", weight: 3, fillColor: "red", fillOpacity: 0.12 }),
    []
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Campus Map</h2>
            <p className="text-sm text-gray-600">{UNI_NAME}</p>
            {loadingPins && <p className="text-xs text-gray-500">Loading pins…</p>}
            {pinsError && <p className="text-xs text-red-600">{pinsError}</p>}
          </div>

          <button onClick={onClose} className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="h-[70vh] relative">
          <MapContainer center={FALLBACK_CENTER} zoom={16} scrollWheelZoom className="h-full w-full">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <HoldToAddItem
              onHold={(lat, lng) => {
                onClose();
                navigate(`/add-item?lat=${lat}&lng=${lng}`);
              }}
            />

            {campusGeoJson && (
              <>
                <GeoJSON data={campusGeoJson} style={boundaryStyle as any} />
                <FitToGeoJson data={campusGeoJson} />
              </>
            )}

            {items
              .map((it) => ({ ...it, lat: Number(it.latitude), lng: Number(it.longitude) }))
              .filter((it) => Number.isFinite(it.lat) && Number.isFinite(it.lng))
              .map((it) => {
                const t = normalizeType(it.type);
                const icon = t === "found" ? FOUND_ICON : LOST_ICON;
                const imgSrc = toAbsoluteUrl(it.imageUrls);

                return (
                  <Marker key={it.id} position={[it.lat, it.lng]} icon={icon}>
                    <Popup>
                      <div className="min-w-[180px]">
                        <div className="text-sm font-semibold">{it.title}</div>
                        <div className="text-xs text-gray-600">
                          {t === "found" ? "FOUND" : "LOST"}
                          {it.createdAt ? ` • ${new Date(it.createdAt).toLocaleString()}` : ""}
                        </div>

                        {imgSrc ? (
                          <img src={imgSrc} alt={it.title} className="mt-2 h-24 w-full rounded-md object-cover" />
                        ) : null}

                        <div className="mt-2">
                          <button className="text-blue-600 text-sm underline" onClick={() => navigate(`/items/${it.id}`)}>
                            View details
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
