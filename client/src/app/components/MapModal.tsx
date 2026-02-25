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
  description?: string;
  type: string;
  latitude: number | string;
  longitude: number | string;
  createdAt?: string;
  imageUrls?: string[] | string | null;
  tagIds: number[];
};

const UNI_NAME = "دانشگاه صنعتی شریف";
const FALLBACK_CENTER: [number, number] = [35.7036, 51.3517];

// Switch between grid summary vs individual pins
const GRID_MODE_ZOOM = 16; // zoom < 16 => grid, zoom >= 16 => individual pins
const GRID_ROWS = 4;
const GRID_COLS = 4;

function toAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function firstImageUrl(imageUrls?: string[] | string | null) {
  if (!imageUrls) return null;
  if (Array.isArray(imageUrls)) return imageUrls[0] ?? null;
  return imageUrls;
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

// Track map zoom to switch between grid and detailed pins
function TrackZoom({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoom(map.getZoom());
    handler();
    map.on("zoomend", handler);
    return () => {
      map.off("zoomend", handler);
    };
  }, [map, onZoom]);
  return null;
}

// Optional: long press to add item
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

type GridCell = {
  key: string;
  centerLat: number;
  centerLng: number;
  lost: number;
  found: number;
};

function buildGrid(
  items: Array<{ lat: number; lng: number; type: string }>,
  bounds: L.LatLngBounds,
  rows = 2,
  cols = 2
) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const latStep = (ne.lat - sw.lat) / rows;
  const lngStep = (ne.lng - sw.lng) / cols;

  const cells = new Map<string, GridCell>();

  for (const it of items) {
    const r = Math.min(rows - 1, Math.max(0, Math.floor((it.lat - sw.lat) / latStep)));
    const c = Math.min(cols - 1, Math.max(0, Math.floor((it.lng - sw.lng) / lngStep)));

    const key = `${r}-${c}`;
    if (!cells.has(key)) {
      const centerLat = sw.lat + (r + 0.5) * latStep;
      const centerLng = sw.lng + (c + 0.5) * lngStep;
      cells.set(key, { key, centerLat, centerLng, lost: 0, found: 0 });
    }

    const cell = cells.get(key)!;
    const t = normalizeType(it.type);
    if (t === "found") cell.found += 1;
    else cell.lost += 1;
  }

  return Array.from(cells.values());
}

function makeClusterIcon(lost: number, found: number) {
  const total = lost + found;

  const html = `
    <div style="
      width: 44px;
      height: 44px;
      border-radius: 9999px;
      background: white;
      border: 2px solid #2563eb;
      box-shadow: 0 6px 18px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      line-height: 1;
      font-weight: 700;
    ">
      <div>${total}</div>
      <div style="font-size: 10px; font-weight: 600; margin-top: 2px;">
        <span style="color:#ef4444">${lost}</span> /
        <span style="color:#22c55e">${found}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -18],
  });
}

// ✅ Only recenter automatically once when location is obtained (or fallback is set)
function RecenterOnPickOnce({
  pickPos,
  enabled,
}: {
  pickPos: [number, number];
  enabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    map.setView(pickPos, map.getZoom(), { animate: true });
  }, [map, pickPos, enabled]);
  return null;
}

export function MapModal({ open, onClose }: MapModalProps) {
  const navigate = useNavigate();

  const [campusGeoJson, setCampusGeoJson] = useState<any>(null);

  const [items, setItems] = useState<MapItem[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [pinsError, setPinsError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pickPos, setPickPos] = useState<[number, number]>(FALLBACK_CENTER);

  // ✅ show message if location cannot be determined
  const [geoError, setGeoError] = useState<string | null>(null);

  // ✅ recenter map only once when we set initial pickPos
  const [shouldRecenter, setShouldRecenter] = useState(false);

  // search
  const [search, setSearch] = useState("");

  // tags
  const [tags, setTags] = useState<TagDto[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [appliedTagIds, setAppliedTagIds] = useState<number[]>([]);

  // zoom tracking
  const [zoom, setZoom] = useState(16);

  useEffect(() => {
    if (!open) return;

    fetch("/sharif-campus.geojson")
      .then((r) => r.json())
      .then((j) => setCampusGeoJson(j))
      .catch(() => setCampusGeoJson(null));
  }, [open]);

  // ✅ Set picker to user's location if possible; otherwise show error and keep fallback
  useEffect(() => {
    if (!open) return;

    setGeoError(null);
    setShouldRecenter(false);

    // start with fallback immediately
    setPickPos(FALLBACK_CENTER);
    setShouldRecenter(true);

    if (!navigator.geolocation) {
      setGeoError("Unable to find your location (geolocation not supported).");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPickPos([lat, lng]);
        setShouldRecenter(true);
      },
      (err) => {
        // keep fallback
        setGeoError("Unable to find your location.");
        console.log("GEO ERROR:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  }, [open]);

  useEffect(() => {
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  // Load items/tags whenever map opens OR filters/search change
  useEffect(() => {
    if (!open) return;

    setLoadingPins(true);
    setPinsError(null);

    Promise.all([
      loadItems({
        page: 1,
        limit: 500,
        searchText: search.trim() || undefined,
        tagIds: appliedTagIds.length ? appliedTagIds.join(",") : undefined,
        tagMode: "any",
      }),
      loadTags(),
    ])
      .then(([itemsRes, tagsRes]) => {
        setItems(Array.isArray(itemsRes.items) ? (itemsRes.items as any) : []);
        setTags(Array.isArray(tagsRes) ? tagsRes : []);
      })
      .catch((e: any) => setPinsError(e?.message || "Failed to load map items"))
      .finally(() => setLoadingPins(false));
  }, [open, search, appliedTagIds]);

  const boundaryStyle = useMemo(
    () => ({ color: "red", weight: 3, fillColor: "red", fillOpacity: 0.12 }),
    []
  );

  const campusBounds = useMemo(() => {
    if (!campusGeoJson) return null;
    const layer = L.geoJSON(campusGeoJson);
    const b = layer.getBounds();
    return b.isValid() ? b : null;
  }, [campusGeoJson]);

  // local filtering (keeps UI responsive even if backend is used)
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((it) => {
      const passTag =
        appliedTagIds.length === 0 ||
        (Array.isArray(it.tagIds) && it.tagIds.some((tid) => appliedTagIds.includes(tid)));

      if (!passTag) return false;
      if (!q) return true;

      const title = (it.title ?? "").toLowerCase();
      const desc = (it.description ?? "").toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [items, appliedTagIds, search]);

  const normalizedPins = useMemo(() => {
    return filteredItems
      .map((it) => ({
        ...it,
        lat: Number(it.latitude),
        lng: Number(it.longitude),
      }))
      .filter((it) => Number.isFinite(it.lat) && Number.isFinite(it.lng));
  }, [filteredItems]);

  const gridCells = useMemo(() => {
    if (!campusBounds) return [];
    return buildGrid(
      normalizedPins.map((p) => ({ lat: p.lat, lng: p.lng, type: p.type })),
      campusBounds,
      GRID_ROWS,
      GRID_COLS
    );
  }, [normalizedPins, campusBounds]);

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
            {geoError && <p className="text-xs text-amber-600">{geoError}</p>}
            {!isOnline && <p className="text-xs text-amber-600">Offline mode: showing cached map</p>}
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

            <TrackZoom onZoom={setZoom} />
            <RecenterOnPickOnce pickPos={pickPos} enabled={shouldRecenter} />

            {/* boundary */}
            {campusGeoJson && (
              <>
                <GeoJSON data={campusGeoJson} style={boundaryStyle as any} />
                <FitToGeoJson data={campusGeoJson} />
              </>
            )}

            {/* picker pin */}
            <Marker
              position={pickPos}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as any;
                  const ll = m.getLatLng();
                  setPickPos([ll.lat, ll.lng]);
                },
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Selected location</div>
                  <div className="text-xs text-gray-600">
                    {pickPos[0].toFixed(6)}, {pickPos[1].toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Drag this pin to choose where to add an item.
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* hold to add */}
            <HoldToAddItem
              onHold={(lat, lng) => {
                onClose();
                navigate(`/add-item?lat=${lat}&lng=${lng}`);
              }}
            />

            {/* GRID MODE (zoomed out) */}
            {zoom < GRID_MODE_ZOOM ? (
              gridCells.map((cell) => {
                const icon = makeClusterIcon(cell.lost, cell.found);
                return (
                  <Marker key={cell.key} position={[cell.centerLat, cell.centerLng]} icon={icon}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">Area summary</div>
                        <div className="mt-1">
                          <span className="text-red-600 font-semibold">Lost:</span> {cell.lost}
                        </div>
                        <div>
                          <span className="text-green-600 font-semibold">Found:</span> {cell.found}
                        </div>
                        <div className="text-xs text-gray-600 mt-2">Zoom in to see individual items.</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })
            ) : (
              /* DETAILED MODE (zoomed in) */
              normalizedPins.map((it) => {
                const t = normalizeType(it.type);
                const icon = t === "found" ? FOUND_ICON : LOST_ICON;

                const img = firstImageUrl(it.imageUrls);
                const imgSrc = toAbsoluteUrl(img);

                return (
                  <Marker key={it.id} position={[it.lat, it.lng]} icon={icon}>
                    <Popup>
                      <div className="min-w-[190px]">
                        <div className="text-sm font-semibold">{it.title}</div>
                        <div className="text-xs text-gray-600">
                          {t === "found" ? "FOUND" : "LOST"}
                          {it.createdAt ? ` • ${new Date(it.createdAt).toLocaleString()}` : ""}
                        </div>

                        <div className="mt-1 text-xs">
                          <span className="font-semibold">Category:</span>{" "}
                          {(it.tagIds || [])
                            .map((tid) => tags.find((x) => x.tid === tid)?.tagname)
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>

                        {it.description ? (
                          <div className="mt-1 text-xs text-gray-700 line-clamp-3">{it.description}</div>
                        ) : null}

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
                            onClick={() => {
                              onClose();
                              navigate(`/items/${it.id}`);
                            }}
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })
            )}
          </MapContainer>

          {/* Filter button */}
          <div className="absolute left-4 top-20 z-[1200]">
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
              onClick={() => setFilterOpen((s) => !s)}
            >
              Filter by tag
              {appliedTagIds.length > 0 ? ` (${appliedTagIds.length})` : ""}
            </button>
          </div>

          {/* Search bar */}
          <div className="absolute left-4 top-32 z-[1200] w-[260px]">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or description…"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="mt-1 text-xs text-gray-600 bg-white/80 inline-block rounded px-2 py-1 shadow">
              Showing {filteredItems.length} item(s)
            </div>
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div className="absolute right-4 top-20 z-[1200] w-60 rounded-xl bg-white p-3 shadow">
              <div className="text-sm font-semibold mb-2">Tags</div>

              <div className="space-y-2 max-h-56 overflow-auto">
                {tags.map((t) => {
                  const checked = selectedTagIds.includes(t.tid);
                  return (
                    <label key={t.tid} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedTagIds((prev) =>
                            prev.includes(t.tid) ? prev.filter((x) => x !== t.tid) : [...prev, t.tid]
                          );
                        }}
                      />
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={t.color ? { backgroundColor: t.color } : undefined}
                      />
                      <span>{t.tagname}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700"
                  onClick={() => {
                    setAppliedTagIds(selectedTagIds);
                    setFilterOpen(false);
                  }}
                >
                  Apply
                </button>

                <button
                  className="flex-1 rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
                  onClick={() => {
                    setSelectedTagIds([]);
                    setAppliedTagIds([]);
                    setFilterOpen(false);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Add item button */}
          <div className="absolute bottom-4 right-4 z-[1200]">
            <button
              className="rounded-xl bg-blue-600 px-4 py-3 text-white shadow-lg hover:bg-blue-700"
              onClick={() => {
                const [lat, lng] = pickPos;
                onClose();
                navigate(`/add-item?lat=${lat}&lng=${lng}`);
              }}
            >
              Add item at this location
            </button>
          </div>

          {/* Legend */}
          <div className="absolute right-4 top-4 z-[1190] rounded-lg bg-white/90 p-3 text-xs shadow space-y-2">
            <div className="font-semibold text-gray-800">Legend</div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              <span>Lost</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              <span>Found</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-600 bg-white" />
              <span>Grid summary (zoom out)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}