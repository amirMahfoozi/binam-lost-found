import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import { X } from "lucide-react";
import L from "leaflet";

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

// This is just a fallback center; we will auto-fit to boundary once loaded.
const FALLBACK_CENTER: [number, number] = [35.7036, 51.3517];

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

export function MapModal({ open, onClose }: MapModalProps) {
  const [campusGeoJson, setCampusGeoJson] = useState<any>(null);

  useEffect(() => {
    if (!open) return;

    // Load from public/ (no TS import hassle)
    fetch("/sharif-campus.geojson")
      .then((r) => r.json())
      .then((j) => setCampusGeoJson(j))
      .catch(() => setCampusGeoJson(null));
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

            {/* Draw boundary */}
            {campusGeoJson && (
              <>
                <GeoJSON data={campusGeoJson} style={boundaryStyle as any} />
                <FitToGeoJson data={campusGeoJson} />
              </>
            )}

            <Marker position={FALLBACK_CENTER}>
              <Popup>{UNI_NAME}</Popup>
            </Marker>
          </MapContainer>

          {/* Legend */}
          <div className="absolute right-4 top-4 z-[999] rounded-lg bg-white/90 p-3 text-xs shadow">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm border-2 border-red-600 bg-red-200/60" />
              <span>حدود دانشگاه</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
