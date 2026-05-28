/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plus, Minus } from "lucide-react";
import { Venue } from "../types";

interface MapContainerProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  adminMode: boolean;
  onCoordsSelect?: (lat: number, lng: number) => void;
  filters: {
    category: string;
    tag: string;
    openNow: boolean;
    hasEventToday: boolean;
    search: string;
  };
  mapStyle: "dark" | "light" | "voyager";
  userCoords: { lat: number; lng: number } | null;
  pendingCoords: { lat: number; lng: number } | null;
}

const NSK_CENTER: [number, number] = [82.9204, 55.0302]; // [lng, lat]

const getMapStyleObject = (styleName: "dark" | "light" | "voyager") => {
  const url =
    styleName === "light"
      ? "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"
      : styleName === "voyager"
      ? "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"
      : "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png";

  return {
    version: 8,
    sources: {
      "cartodb-raster": {
        type: "raster",
        tiles: [url],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
      }
    },
    layers: [
      {
        id: "cartodb-raster-layer",
        type: "raster",
        source: "cartodb-raster",
        minzoom: 0,
        maxzoom: 20
      }
    ]
  };
};

export default function MapContainer({
  venues,
  selectedVenue,
  onSelectVenue,
  adminMode,
  onCoordsSelect,
  filters,
  mapStyle,
  userCoords,
  pendingCoords,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pendingMarkerRef = useRef<maplibregl.Marker | null>(null);
  const prevUserCoordsRef = useRef<string | null>(null);
  const prevMapStyleRef = useRef(mapStyle);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyleObject(mapStyle) as any,
      center: NSK_CENTER,
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      attributionControl: false,
    });

    mapRef.current = map;

    // Handle map clicks in Admin Mode for coordinates positioning
    map.on("click", (e) => {
      if (onCoordsSelect) {
        onCoordsSelect(e.lngLat.lat, e.lngLat.lng);
      }
    });

    // Resize observer to handle dynamic size changes of the container
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Map Style dynamically
  useEffect(() => {
    if (!mapRef.current) return;
    if (prevMapStyleRef.current === mapStyle) return;
    mapRef.current.setStyle(getMapStyleObject(mapStyle) as any);
    prevMapStyleRef.current = mapStyle;
  }, [mapStyle]);

  // Update user GPS location marker and center
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (!userCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      prevUserCoordsRef.current = null;
      return;
    }

    const coordsKey = `${userCoords.lat},${userCoords.lng}`;

    if (!userMarkerRef.current) {
      // Create user location dot elements
      const el = document.createElement("div");
      el.className = "relative flex justify-center items-center w-8 h-8";

      const pulse = document.createElement("div");
      pulse.className = "absolute rounded-full w-8 h-8 bg-sky-500/20";
      el.appendChild(pulse);

      const dot = document.createElement("div");
      dot.className = "absolute rounded-full w-3.5 h-3.5 bg-sky-500 border-2 border-white shadow-lg";
      el.appendChild(dot);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([userCoords.lng, userCoords.lat])
        .addTo(map);

      userMarkerRef.current = marker;

      // Center map on first geolocation match
      if (prevUserCoordsRef.current !== coordsKey) {
        map.flyTo({
          center: [userCoords.lng, userCoords.lat],
          zoom: 14,
          essential: true,
          duration: 1000,
        });
      }
    } else {
      userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]);
    }

    prevUserCoordsRef.current = coordsKey;
  }, [userCoords]);

  // Update admin coordinate selection marker
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (!adminMode || !pendingCoords) {
      if (pendingMarkerRef.current) {
        pendingMarkerRef.current.remove();
        pendingMarkerRef.current = null;
      }
      return;
    }

    if (!pendingMarkerRef.current) {
      // Create custom HTML element for target marker
      const el = document.createElement("div");
      el.className = "relative flex justify-center items-center w-8 h-8 pointer-events-none";

      const pulse = document.createElement("div");
      pulse.className = "absolute rounded-full w-6 h-6 bg-rose-500/15 border border-rose-500/70";
      el.appendChild(pulse);

      const dot = document.createElement("div");
      dot.className = "absolute rounded-full w-3.5 h-3.5 bg-rose-500 border-2 border-white shadow-xl";
      el.appendChild(dot);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pendingCoords.lng, pendingCoords.lat])
        .addTo(map);

      pendingMarkerRef.current = marker;

      // Fly map to coordinates the first time they are set
      map.flyTo({
        center: [pendingCoords.lng, pendingCoords.lat],
        zoom: 15,
        essential: true,
      });
    } else {
      pendingMarkerRef.current.setLngLat([pendingCoords.lng, pendingCoords.lat]);
    }
  }, [adminMode, pendingCoords]);

  // Update Coords Selection on adminMode changes or callback updates
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      if (adminMode && onCoordsSelect) {
        onCoordsSelect(e.lngLat.lat, e.lngLat.lng);
      }
    };

    map.off("click", clickHandler);
    if (adminMode) {
      map.on("click", clickHandler);
    }
  }, [adminMode, onCoordsSelect]);

  // Center/Fly to Selected Venue
  useEffect(() => {
    if (!mapRef.current || !selectedVenue) return;
    
    mapRef.current.flyTo({
      center: [selectedVenue.longitude, selectedVenue.latitude],
      zoom: 15,
      essential: true,
      duration: 1200,
    });
  }, [selectedVenue]);

  // Build/Re-build interactive custom Markers reactively
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    Object.keys(markersRef.current).forEach((key) => {
      markersRef.current[key].remove();
    });
    markersRef.current = {};

    // Filter venues on current selection for immediate Map syncing
    const filtered = venues.filter((venue) => {
      if (venue.status !== "published" && !adminMode) return false;
      if (filters.category && venue.category !== filters.category) return false;
      if (filters.tag && !venue.tags.includes(filters.tag)) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesName = venue.name.toLowerCase().includes(query);
        const matchesDesc = venue.shortDescription.toLowerCase().includes(query);
        const matchesTags = venue.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }
      return true;
    });

    // Populate markers
    filtered.forEach((venue) => {
      const isSelected = selectedVenue?.id === venue.id;
      const isPremium = venue.premiumConfig?.premiumActive;
      const themeColor = venue.premiumConfig?.customColors?.accent || "#e11d48"; // Default rose

      // 1. Create elegant custom circular HTML marker element
      const markerEl = document.createElement("div");
      markerEl.id = `marker-${venue.id}`;
      markerEl.className = "relative flex justify-center items-center cursor-pointer group";

      if (isSelected) {
        // Selected state: larger dot with a high-contrast elegant halo
        const outerHalo = document.createElement("div");
        outerHalo.className = "absolute rounded-full w-8 h-8 opacity-25 transition-all duration-300";
        outerHalo.style.backgroundColor = themeColor;
        markerEl.appendChild(outerHalo);

        const innerRing = document.createElement("div");
        innerRing.className = "absolute rounded-full w-5 h-5 border-2 border-white z-10 scale-110";
        innerRing.style.backgroundColor = themeColor;
        markerEl.appendChild(innerRing);

        const centerCore = document.createElement("div");
        centerCore.className = "absolute rounded-full w-2 h-2 bg-white z-20";
        markerEl.appendChild(centerCore);
      } else if (isPremium) {
        // Premium state: beautiful, static premium accent color dot with a subtle matching aura
        const outerHalo = document.createElement("div");
        outerHalo.className = "absolute rounded-full w-5 h-5 opacity-10 transition-all duration-300 group-hover:opacity-20";
        outerHalo.style.backgroundColor = themeColor;
        markerEl.appendChild(outerHalo);

        const coreDot = document.createElement("div");
        coreDot.className = "rounded-full border border-neutral-900 transition-all duration-300 z-10 w-3 h-3 group-hover:scale-110";
        coreDot.style.backgroundColor = themeColor;
        markerEl.appendChild(coreDot);
      } else {
        // Regular state: clean slate/gray dot, completely silent
        const coreDot = document.createElement("div");
        coreDot.className = "rounded-full border border-neutral-950 transition-all duration-300 z-10 w-2.5 h-2.5 bg-neutral-600 group-hover:bg-neutral-400 group-hover:scale-110";
        markerEl.appendChild(coreDot);
      }

      // Tiny atmospheric label popping on hovered markup
      const tooltip = document.createElement("div");
      tooltip.className = "absolute -top-9 px-2.5 py-1 bg-neutral-950/90 text-[11px] font-display font-medium text-white border border-neutral-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-25 flex items-center gap-1.5 shadow-xl";
      tooltip.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${themeColor}"></span>
        ${venue.name}
      `;
      markerEl.appendChild(tooltip);

      // Marker click binder
      markerEl.addEventListener("click", (eo) => {
        eo.stopPropagation();
        onSelectVenue(venue);
      });

      // Attach marker to MapLibre Map
      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([venue.longitude, venue.latitude])
        .addTo(map);

      markersRef.current[venue.id] = marker;
    });
  }, [venues, selectedVenue, filters, adminMode]);

  return (
    <div id="map-root" className="w-full h-full relative overflow-hidden bg-neutral-950">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      
      {/* Custom glassmorphic zoom controls */}
      <div className="absolute top-28 right-4 sm:right-6 z-15 flex flex-col gap-1 bg-zinc-950/85 border border-zinc-800/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900/60 active:scale-95 transition-all cursor-pointer"
          title="Приблизить"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900/60 active:scale-95 transition-all cursor-pointer"
          title="Отдалить"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic zoom controller feedback or instructions */}
      <div 
        className="absolute bg-neutral-950/80 border border-neutral-900 px-2.5 py-1.5 rounded-md text-[10px] text-neutral-400 font-mono pointer-events-none z-10 hidden sm:block"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))", left: "1.5rem" }}
      >
        NSK NAVIGATOR: 55.03° N, 82.92° E
      </div>

      {adminMode && (
        <div className="absolute top-4 left-4 right-16 bg-rose-950/90 border border-rose-800 text-rose-200 px-3 py-2 rounded-lg text-xs z-10 flex items-center gap-2 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>Режим Админа: Кликните по карте для изменения координат заведения</span>
        </div>
      )}
    </div>
  );
}
