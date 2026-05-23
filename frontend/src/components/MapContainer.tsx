/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Venue, VenueEvent } from "../types";
import { filterVenuesForDiscovery } from "../utils/venueFilters";

interface MapContainerProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  adminMode: boolean;
  onCoordsSelect?: (lat: number, lng: number) => void;
  eventsList?: VenueEvent[];
  filters: {
    category: string;
    tag: string;
    openNow: boolean;
    hasEventToday: boolean;
    search: string;
  };
}

const NSK_CENTER: [number, number] = [82.9204, 55.0302]; // [lng, lat]

export default function MapContainer({
  venues,
  selectedVenue,
  onSelectVenue,
  adminMode,
  onCoordsSelect,
  eventsList = [],
  filters,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // CartoDB Dark Matter Raster Tile style configuration (sleek, high-contrast, beautiful black)
    const mapStyle = {
      version: 8,
      sources: {
        "cartodb-dark": {
          type: "raster",
          tiles: [
            "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
          ],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
        }
      },
      layers: [
        {
          id: "cartodb-dark-layer",
          type: "raster",
          source: "cartodb-dark",
          minzoom: 0,
          maxzoom: 20
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle as any,
      center: NSK_CENTER,
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapRef.current = map;

    // Handle map clicks in Admin Mode for coordinates positioning
    map.on("click", (e) => {
      if (onCoordsSelect) {
        onCoordsSelect(e.lngLat.lat, e.lngLat.lng);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

    const filtered = filterVenuesForDiscovery(venues, filters, {
      adminMode,
      events: eventsList,
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
      tooltip.className = "absolute -top-9 px-2.5 py-1 bg-neutral-950/90 text-[11px] font-display font-medium text-white border border-neutral-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 flex items-center gap-1.5 shadow-xl";
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
  }, [venues, selectedVenue, filters, adminMode, eventsList]);

  return (
    <div id="map-root" className="w-full h-full relative overflow-hidden bg-neutral-950">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      
      {/* Dynamic zoom controller feedback or instructions */}
      <div className="absolute top-20 right-4 bg-neutral-950/80 border border-neutral-900 px-2.5 py-1.5 rounded-md text-[10px] text-neutral-400 font-mono pointer-events-none z-10 hidden sm:block">
        NSK NAVIGATOR: 55.03° N, 82.92° E
      </div>

      {adminMode && (
        <div className="absolute top-4 left-4 right-16 bg-rose-950/90 border border-rose-800 text-rose-200 px-3 py-2 rounded-lg text-xs z-10 flex items-center gap-2 backdrop-blur-md animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>Режим Админа: Кликните по карте для изменения координат заведения</span>
        </div>
      )}
    </div>
  );
}
