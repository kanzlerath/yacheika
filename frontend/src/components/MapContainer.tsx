/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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
}

const NSK_CENTER: [number, number] = [82.9204, 55.0302]; // [lng, lat]
const VENUES_SOURCE_ID = "venues";
const CLUSTERS_LAYER_ID = "venue-clusters";
const CLUSTER_COUNT_LAYER_ID = "venue-cluster-count";
const VENUE_HALOS_LAYER_ID = "venue-halos";
const VENUE_HIT_LAYER_ID = "venue-hit-area";
const VENUE_POINTS_LAYER_ID = "venue-points";
const VENUE_SELECTED_LAYER_ID = "venue-selected-ring";
const VENUE_LABELS_LAYER_ID = "venue-labels";

type VenueFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    id: string;
    name: string;
    category: string;
    accent: string;
    selected: boolean;
  }
>;

const EMPTY_VENUE_COLLECTION: VenueFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const getFilteredVenues = (
  venues: Venue[],
  filters: MapContainerProps["filters"],
  adminMode: boolean,
) => {
  return venues.filter((venue) => {
    if (venue.status !== "published" && !adminMode) return false;
    if (filters.category && venue.category !== filters.category) return false;
    if (filters.tag && !venue.tags.includes(filters.tag)) return false;
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchesName = venue.name.toLowerCase().includes(query);
      const matchesDesc = venue.shortDescription.toLowerCase().includes(query);
      const matchesTags = venue.tags.some((tag) => tag.toLowerCase().includes(query));
      if (!matchesName && !matchesDesc && !matchesTags) return false;
    }
    return true;
  });
};

const toVenueFeatureCollection = (
  venues: Venue[],
  selectedVenue: Venue | null,
): VenueFeatureCollection => ({
  type: "FeatureCollection",
  features: venues.map((venue) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [venue.longitude, venue.latitude],
    },
    properties: {
      id: venue.id,
      name: venue.name,
      category: venue.category,
      accent: venue.premiumConfig?.customColors?.accent || "#71717a",
      selected: selectedVenue?.id === venue.id,
    },
  })),
});

const ensureVenueLayers = (map: maplibregl.Map) => {
  if (!map.getSource(VENUES_SOURCE_ID)) {
    map.addSource(VENUES_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_VENUE_COLLECTION,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 58,
    });
  }

  if (!map.getLayer(CLUSTERS_LAYER_ID)) {
    map.addLayer({
      id: CLUSTERS_LAYER_ID,
      type: "circle",
      source: VENUES_SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "rgba(244, 63, 94, 0.26)",
          4,
          "rgba(245, 158, 11, 0.30)",
          8,
          "rgba(168, 85, 247, 0.34)",
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          18,
          4,
          23,
          8,
          29,
        ],
        "circle-stroke-color": "rgba(255, 255, 255, 0.72)",
        "circle-stroke-width": 1,
        "circle-blur": 0.08,
      },
    });
  }

  if (!map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: "symbol",
      source: VENUES_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-size": 11,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0, 0, 0, 0.55)",
        "text-halo-width": 1,
      },
    });
  }

  if (!map.getLayer(VENUE_HALOS_LAYER_ID)) {
    map.addLayer({
      id: VENUE_HALOS_LAYER_ID,
      type: "circle",
      source: VENUES_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 12,
      paint: {
        "circle-color": ["get", "accent"],
        "circle-radius": [
          "case",
          ["boolean", ["get", "selected"], false],
          18,
          9,
        ],
        "circle-opacity": [
          "case",
          ["boolean", ["get", "selected"], false],
          0.22,
          0.10,
        ],
        "circle-blur": 0.35,
      },
    });
  }

  if (!map.getLayer(VENUE_HIT_LAYER_ID)) {
    map.addLayer({
      id: VENUE_HIT_LAYER_ID,
      type: "circle",
      source: VENUES_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 12,
      paint: {
        "circle-color": "#ffffff",
        "circle-radius": 18,
        "circle-opacity": 0.01,
      },
    });
  }

  if (!map.getLayer(VENUE_POINTS_LAYER_ID)) {
    map.addLayer({
      id: VENUE_POINTS_LAYER_ID,
      type: "circle",
      source: VENUES_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 12,
      paint: {
        "circle-color": ["get", "accent"],
        "circle-radius": [
          "case",
          ["boolean", ["get", "selected"], false],
          7,
          5,
        ],
        "circle-stroke-color": [
          "case",
          ["boolean", ["get", "selected"], false],
          "#ffffff",
          "rgba(3, 3, 3, 0.95)",
        ],
        "circle-stroke-width": [
          "case",
          ["boolean", ["get", "selected"], false],
          2,
          1,
        ],
      },
    });
  }

  if (!map.getLayer(VENUE_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: VENUE_SELECTED_LAYER_ID,
      type: "circle",
      source: VENUES_SOURCE_ID,
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "selected"], true]],
      minzoom: 12,
      paint: {
        "circle-color": "rgba(255, 255, 255, 0)",
        "circle-radius": 12,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  if (!map.getLayer(VENUE_LABELS_LAYER_ID)) {
    map.addLayer({
      id: VENUE_LABELS_LAYER_ID,
      type: "symbol",
      source: VENUES_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 14,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-size": 11,
        "text-offset": [0, 1.35],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#f4f4f5",
        "text-halo-color": "rgba(3, 3, 3, 0.88)",
        "text-halo-width": 1.4,
      },
    });
  }
};

export default function MapContainer({
  venues,
  selectedVenue,
  onSelectVenue,
  adminMode,
  onCoordsSelect,
  filters,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const venueByIdRef = useRef<Map<string, Venue>>(new Map());

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

    map.on("load", () => {
      ensureVenueLayers(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map interactions on adminMode changes or callback updates
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const adminClickHandler = (e: maplibregl.MapMouseEvent) => {
      if (adminMode && onCoordsSelect) {
        onCoordsSelect(e.lngLat.lat, e.lngLat.lng);
      }
    };

    map.off("click", adminClickHandler);
    if (adminMode) {
      map.on("click", adminClickHandler);
    }

    const clusterClickHandler = async (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map.getSource(VENUES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source || clusterId === undefined) return;

      const zoom = await source.getClusterExpansionZoom(clusterId);
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      map.easeTo({
        center: coordinates,
        zoom,
        duration: 700,
      });
    };

    const venueClickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const venueId = feature?.properties?.id;
      if (!venueId) return;

      const venue = venueByIdRef.current.get(venueId);
      if (venue) {
        onSelectVenue(venue);
      }
    };

    const pointerEnterHandler = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const pointerLeaveHandler = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", CLUSTERS_LAYER_ID, clusterClickHandler);
    map.on("click", VENUE_HIT_LAYER_ID, venueClickHandler);
    map.on("mouseenter", CLUSTERS_LAYER_ID, pointerEnterHandler);
    map.on("mouseleave", CLUSTERS_LAYER_ID, pointerLeaveHandler);
    map.on("mouseenter", VENUE_HIT_LAYER_ID, pointerEnterHandler);
    map.on("mouseleave", VENUE_HIT_LAYER_ID, pointerLeaveHandler);

    return () => {
      map.off("click", adminClickHandler);
      map.off("click", CLUSTERS_LAYER_ID, clusterClickHandler);
      map.off("click", VENUE_HIT_LAYER_ID, venueClickHandler);
      map.off("mouseenter", CLUSTERS_LAYER_ID, pointerEnterHandler);
      map.off("mouseleave", CLUSTERS_LAYER_ID, pointerLeaveHandler);
      map.off("mouseenter", VENUE_HIT_LAYER_ID, pointerEnterHandler);
      map.off("mouseleave", VENUE_HIT_LAYER_ID, pointerLeaveHandler);
    };
  }, [adminMode, onCoordsSelect, onSelectVenue]);

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

  // Feed filtered venue data into MapLibre clustering reactively
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const filtered = getFilteredVenues(venues, filters, adminMode);
    venueByIdRef.current = new Map(filtered.map((venue) => [venue.id, venue]));

    const updateSource = () => {
      ensureVenueLayers(map);
      const source = map.getSource(VENUES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      source?.setData(toVenueFeatureCollection(filtered, selectedVenue));
    };

    if (map.isStyleLoaded()) {
      updateSource();
    } else {
      map.once("load", updateSource);
    }
  }, [venues, selectedVenue, filters, adminMode]);

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
