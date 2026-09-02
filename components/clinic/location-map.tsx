"use client";

// Leaflet map for picking / showing a referral source's location. Leaflet reads
// `window` while its module is evaluated, so it is imported lazily inside an
// effect instead of at the top of the file — the stylesheet is a plain CSS
// import, which the bundler handles without running any code on the server.
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Where the map opens when nothing has been picked yet. */
const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 11;
const PICKED_ZOOM = 15;

// Leaflet's default marker points at image files that bundlers rewrite, so the
// pin is drawn as inline HTML instead — no asset resolution involved.
const MARKER_HTML = `
  <span style="
    display:block;width:22px;height:22px;margin:-11px 0 0 -11px;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:#dc2626;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);
  "></span>`;

interface LocationMapProps {
  value: LatLng | null;
  /** Omit to render a read-only map (clicking does nothing). */
  onChange?: (v: LatLng | null) => void;
  className?: string;
  height?: number;
}

export function LocationMap({ value, onChange, className, height = 280 }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Leaflet is loaded once and kept here so the value-sync effect below can
  // create a marker for a value that arrives after the map is already built.
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const readOnly = !onChange;

  // onChange is read through a ref: the click handler is registered once, and
  // re-registering it on every parent render would leak listeners.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: value ? [value.latitude, value.longitude] : DEFAULT_CENTER,
        zoom: value ? PICKED_ZOOM : DEFAULT_ZOOM,
        // A map inside a scrolling dialog should not swallow the wheel.
        scrollWheelZoom: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      map.on("click", (e: LeafletMouseEvent) => {
        onChangeRef.current?.({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      });

      mapRef.current = map;
      setReady(true);
      // The container is often still sizing (dialog opening animation) when the
      // map is built, which leaves the tiles clipped until it is told to remeasure.
      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Built once — the marker and view follow `value` in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync with the value, whichever side changed it.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !ready) return;

    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const pos: [number, number] = [value.latitude, value.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      markerRef.current = L.marker(pos, {
        icon: L.divIcon({ html: MARKER_HTML, className: "", iconSize: [0, 0] }),
      }).addTo(map);
    }
    map.setView(pos, Math.max(map.getZoom(), PICKED_ZOOM));
  }, [value, ready]);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  /**
   * Looking the address up by name, rather than asking the device where it is.
   * Device geolocation needs a secure context, which plain HTTP is not — this
   * path has no such requirement, so it is the one that works on the server as
   * it stands. Nominatim is OpenStreetMap's own geocoder, same source as the
   * tiles already on screen.
   */
  const searchAddress = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "ar" } });
      if (!res.ok) throw new Error(String(res.status));
      const results = (await res.json()) as { lat: string; lon: string }[];
      if (!results.length) {
        toast.error("لم يُعثر على هذا العنوان — جرّب صياغة أوضح أو انقر على الخريطة.");
        return;
      }
      onChangeRef.current?.({
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon),
      });
    } catch {
      toast.error("تعذّر البحث عن العنوان — تحقّق من الاتصال أو انقر على الخريطة.");
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    // Browsers hand out geolocation only in a secure context — HTTPS, or
    // localhost during development. Served over plain HTTP the API is simply
    // absent, and failing silently here made the button look broken.
    if (!window.isSecureContext || !navigator.geolocation) {
      toast.error("تحديد الموقع يتطلب اتصالاً آمناً (HTTPS). افتح النظام عبر https أو حدّد الموقع بالنقر على الخريطة.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChangeRef.current?.({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "تم رفض إذن الموقع — فعّله من إعدادات المتصفح لهذا الموقع."
            : err.code === err.TIMEOUT
            ? "انتهت مهلة تحديد الموقع — حاول مجدداً أو انقر على الخريطة."
            : "تعذّر تحديد الموقع — انقر على الخريطة لتحديده يدوياً.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* `isolate` is load-bearing: Leaflet gives its panes and controls z-index
          values up to 1000, and without a stacking context here they paint over
          anything layered above the map — dialogs, popovers and the like sit at
          z-50. Isolating keeps those values inside this box. */}
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchAddress(); } }}
            placeholder="ابحث عن العنوان — مثال: حلب، شارع النيل"
            className="h-8 text-sm"
          />
          <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={searchAddress} disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            بحث
          </Button>
        </div>
      )}

      <div className="relative isolate overflow-hidden rounded-lg border" style={{ height }}>
        <div ref={containerRef} className="h-full w-full" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {value
            ? `${value.latitude.toFixed(6)}، ${value.longitude.toFixed(6)}`
            : readOnly
              ? "لا يوجد موقع محدد"
              : "انقر على الخريطة لتحديد الموقع"}
        </p>
        {!readOnly && (
          <div className="flex flex-wrap gap-1.5 ms-auto">
            <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
              onClick={useMyLocation} disabled={locating}>
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
              موقعي الحالي
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
                onClick={() => onChange?.(null)}>
                <X className="h-3.5 w-3.5" />
                إزالة
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
