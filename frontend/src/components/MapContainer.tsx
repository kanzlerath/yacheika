/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plus, Minus } from "lucide-react";
import { MapStyle, Venue } from "../types";

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
  mapStyle: MapStyle;
  userCoords: { lat: number; lng: number } | null;
  pendingCoords: { lat: number; lng: number } | null;
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
const SELECTED_VENUE_SOURCE_ID = "selected-venue";
const SELECTED_VENUE_HALO_LAYER_ID = "selected-venue-halo";
const SELECTED_VENUE_POINT_LAYER_ID = "selected-venue-point";
const SELECTED_VENUE_RING_LAYER_ID = "selected-venue-ring";

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

const getVectorStyleUrl = (styleName: MapStyle) =>
  styleName === "light"
    ? "https://tiles.openfreemap.org/styles/liberty"
    : "https://tiles.openfreemap.org/styles/dark";

const getRasterFallbackStyle = (styleName: MapStyle) => {
  const tileSet = styleName === "light" ? "light_all" : "dark_all";

  return {
    version: 8,
    sources: {
      "cartodb-raster": {
        type: "raster",
        tiles: [`https://basemaps.cartocdn.com/${tileSet}/{z}/{x}/{y}@2x.png`],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: "osm-raster-layer",
        type: "raster",
        source: "cartodb-raster",
        minzoom: 0,
        maxzoom: 20,
        paint: {
          "raster-opacity": styleName === "light" ? 0.98 : 0.96,
        },
      },
    ],
  };
};

const isPoiLayer = (layer: any) => {
  const id = String(layer.id || "").toLowerCase();
  const sourceLayer = String(layer["source-layer"] || "").toLowerCase();
  const metadataClass = String(layer.metadata?.["mapbox:group"] || layer.metadata?.class || "").toLowerCase();
  const textField = JSON.stringify(layer.layout?.["text-field"] || "").toLowerCase();

  if (sourceLayer === "poi" || sourceLayer === "pois") return true;
  if (id.includes("poi") || id.includes("amenity") || id.includes("shop") || id.includes("business")) return true;
  if (metadataClass.includes("poi") || metadataClass.includes("amenity") || metadataClass.includes("shop")) return true;

  // Keep road/place/park labels, but remove common venue/business icon label layers.
  return layer.type === "symbol" && /\b(name|name:|brand|operator)\b/.test(textField) && (
    id.includes("food") ||
    id.includes("drink") ||
    id.includes("restaurant") ||
    id.includes("cafe") ||
    id.includes("bar") ||
    id.includes("bank") ||
    id.includes("hotel") ||
    id.includes("store")
  );
};

const sanitizeLayer = (layer: any) => {
  const paint = layer.paint
    ? Object.fromEntries(Object.entries(layer.paint).filter(([key]) => !key.endsWith("-pattern")))
    : layer.paint;
  const layout = layer.layout
    ? Object.fromEntries(Object.entries(layer.layout).filter(([key]) => !key.endsWith("-pattern")))
    : layer.layout;

  return {
    ...layer,
    ...(paint ? { paint } : {}),
    ...(layout ? { layout } : {}),
  };
};

const stripPoiLayers = (style: any) => ({
  ...style,
  layers: Array.isArray(style.layers)
    ? style.layers.filter((layer: any) => !isPoiLayer(layer)).map(sanitizeLayer)
    : [],
});

const loadFilteredVectorStyle = async (styleName: MapStyle) => {
  const response = await fetch(getVectorStyleUrl(styleName), { cache: "force-cache" });
  if (!response.ok) throw new Error(`Map style failed: ${response.status}`);
  const style = await response.json();
  return stripPoiLayers(style);
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
  features: venues
    .filter((venue) => venue.id !== selectedVenue?.id)
    .map((venue) => ({
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
        selected: false,
      },
    })),
});

const toSelectedVenueFeatureCollection = (venue: Venue | null): VenueFeatureCollection => ({
  type: "FeatureCollection",
  features: venue
    ? [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [venue.longitude, venue.latitude],
          },
          properties: {
            id: venue.id,
            name: venue.name,
            category: venue.category,
            accent: venue.premiumConfig?.customColors?.accent || "#d2a56b",
            selected: true,
          },
        },
      ]
    : [],
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
          "rgba(210, 165, 107, 0.30)",
          4,
          "rgba(147, 169, 216, 0.34)",
          8,
          "rgba(244, 245, 247, 0.36)",
        ],
        "circle-radius": ["step", ["get", "point_count"], 18, 4, 23, 8, 29],
        "circle-stroke-color": "rgba(255, 255, 255, 0.68)",
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
        "text-font": ["Noto Sans Regular"],
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
        "circle-radius": ["case", ["boolean", ["get", "selected"], false], 18, 9],
        "circle-opacity": ["case", ["boolean", ["get", "selected"], false], 0.22, 0.1],
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
        "circle-radius": ["case", ["boolean", ["get", "selected"], false], 7, 5],
        "circle-stroke-color": [
          "case",
          ["boolean", ["get", "selected"], false],
          "#ffffff",
          "rgba(3, 3, 3, 0.95)",
        ],
        "circle-stroke-width": ["case", ["boolean", ["get", "selected"], false], 2, 1],
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
        "text-font": ["Noto Sans Regular"],
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

  if (!map.getSource(SELECTED_VENUE_SOURCE_ID)) {
    map.addSource(SELECTED_VENUE_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_VENUE_COLLECTION,
    });
  }

  if (!map.getLayer(SELECTED_VENUE_HALO_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_VENUE_HALO_LAYER_ID,
      type: "circle",
      source: SELECTED_VENUE_SOURCE_ID,
      paint: {
        "circle-color": ["get", "accent"],
        "circle-radius": 22,
        "circle-opacity": 0.24,
        "circle-blur": 0.35,
      },
    });
  }

  if (!map.getLayer(SELECTED_VENUE_POINT_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_VENUE_POINT_LAYER_ID,
      type: "circle",
      source: SELECTED_VENUE_SOURCE_ID,
      paint: {
        "circle-color": ["get", "accent"],
        "circle-radius": 8,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }

  if (!map.getLayer(SELECTED_VENUE_RING_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_VENUE_RING_LAYER_ID,
      type: "circle",
      source: SELECTED_VENUE_SOURCE_ID,
      paint: {
        "circle-color": "rgba(255, 255, 255, 0)",
        "circle-radius": 14,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
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
  mapStyle,
  userCoords,
  pendingCoords,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const venueByIdRef = useRef<Map<string, Venue>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pendingMarkerRef = useRef<maplibregl.Marker | null>(null);
  const prevUserCoordsRef = useRef<string | null>(null);
  const prevMapStyleRef = useRef(mapStyle);
  const venueSourceDataRef = useRef({
    venues: EMPTY_VENUE_COLLECTION,
    selected: EMPTY_VENUE_COLLECTION,
  });

  const syncVenueSources = (map: maplibregl.Map) => {
    ensureVenueLayers(map);
    const venuesSource = map.getSource(VENUES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    const selectedSource = map.getSource(SELECTED_VENUE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    venuesSource?.setData(venueSourceDataRef.current.venues);
    selectedSource?.setData(venueSourceDataRef.current.selected);
  };

  const addTransparentImage = (map: maplibregl.Map, imageId: string) => {
    if (map.hasImage(imageId)) return;
    map.addImage(imageId, {
      width: 1,
      height: 1,
      data: new Uint8Array([0, 0, 0, 0]),
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getRasterFallbackStyle(mapStyle) as any,
      center: NSK_CENTER,
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      attributionControl: false,
    });

    mapRef.current = map;
    const missingImageHandler = (event: any) => {
      addTransparentImage(map, event.id);
    };
    map.on("styleimagemissing", missingImageHandler);

    map.on("load", () => {
      ensureVenueLayers(map);
    });

    let cancelled = false;
    loadFilteredVectorStyle(mapStyle)
      .then((style) => {
        if (cancelled || !mapRef.current) return;
        mapRef.current.setStyle(style as any);
        mapRef.current.once("styledata", () => {
          if (mapRef.current) syncVenueSources(mapRef.current);
        });
      })
      .catch((error) => {
        console.warn("Vector map style unavailable, using raster fallback:", error);
      });

    // Resize observer to handle dynamic size changes of the container
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      cancelled = true;
      map.off("styleimagemissing", missingImageHandler);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Map Style dynamically
  useEffect(() => {
    if (!mapRef.current) return;
    if (prevMapStyleRef.current === mapStyle) return;
    let cancelled = false;
    const map = mapRef.current;
    map.setStyle(getRasterFallbackStyle(mapStyle) as any);
    map.once("styledata", () => {
      if (mapRef.current) syncVenueSources(mapRef.current);
    });

    loadFilteredVectorStyle(mapStyle)
      .then((style) => {
        if (cancelled || !mapRef.current) return;
        mapRef.current.setStyle(style as any);
        mapRef.current.once("styledata", () => {
          if (mapRef.current) syncVenueSources(mapRef.current);
        });
      })
      .catch((error) => {
        console.warn("Vector map style unavailable, using raster fallback:", error);
      });

    prevMapStyleRef.current = mapStyle;
    return () => {
      cancelled = true;
    };
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
    let layerHandlersBound = false;

    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      if (adminMode && onCoordsSelect) {
        onCoordsSelect(e.lngLat.lat, e.lngLat.lng);
      }
    };

    if (adminMode) {
      map.on("click", clickHandler);
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
        zoom: Math.max(map.getZoom() + 0.6, zoom),
        duration: 700,
      });
    };

    const venueClickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const venueId = feature?.properties?.id;
      if (!venueId) return;

      const venue = venueByIdRef.current.get(String(venueId));
      if (venue) onSelectVenue(venue);
    };

    const pointerEnterHandler = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const pointerLeaveHandler = () => {
      map.getCanvas().style.cursor = "";
    };

    const bindLayerHandlers = () => {
      ensureVenueLayers(map);
      if (!map.getLayer(CLUSTERS_LAYER_ID) || !map.getLayer(VENUE_HIT_LAYER_ID) || layerHandlersBound) return;
      map.on("click", CLUSTERS_LAYER_ID, clusterClickHandler);
      map.on("click", VENUE_HIT_LAYER_ID, venueClickHandler);
      map.on("mouseenter", CLUSTERS_LAYER_ID, pointerEnterHandler);
      map.on("mouseleave", CLUSTERS_LAYER_ID, pointerLeaveHandler);
      map.on("mouseenter", VENUE_HIT_LAYER_ID, pointerEnterHandler);
      map.on("mouseleave", VENUE_HIT_LAYER_ID, pointerLeaveHandler);
      layerHandlersBound = true;
    };

    if (map.isStyleLoaded()) {
      bindLayerHandlers();
    } else {
      map.once("load", bindLayerHandlers);
    }

    return () => {
      map.off("click", clickHandler);
      map.off("load", bindLayerHandlers);
      if (layerHandlersBound) {
        map.off("click", CLUSTERS_LAYER_ID, clusterClickHandler);
        map.off("click", VENUE_HIT_LAYER_ID, venueClickHandler);
        map.off("mouseenter", CLUSTERS_LAYER_ID, pointerEnterHandler);
        map.off("mouseleave", CLUSTERS_LAYER_ID, pointerLeaveHandler);
        map.off("mouseenter", VENUE_HIT_LAYER_ID, pointerEnterHandler);
        map.off("mouseleave", VENUE_HIT_LAYER_ID, pointerLeaveHandler);
      }
    };
  }, [adminMode, onCoordsSelect, onSelectVenue]);

  // Center/Fly to Selected Venue
  useEffect(() => {
    if (!mapRef.current || !selectedVenue) return;
    const currentZoom = mapRef.current.getZoom();
    
    mapRef.current.flyTo({
      center: [selectedVenue.longitude, selectedVenue.latitude],
      zoom: Math.max(currentZoom, 15.4),
      essential: true,
      duration: 760,
    });
  }, [selectedVenue]);

  // Feed filtered venue data into MapLibre clustering reactively
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const filtered = getFilteredVenues(venues, filters, adminMode);
    venueByIdRef.current = new Map(filtered.map((venue) => [venue.id, venue]));
    venueSourceDataRef.current = {
      venues: toVenueFeatureCollection(filtered, selectedVenue),
      selected: toSelectedVenueFeatureCollection(selectedVenue),
    };

    const updateSource = () => {
      syncVenueSources(map);
    };

    if (map.isStyleLoaded()) {
      updateSource();
    } else {
      map.once("styledata", updateSource);
    }
  }, [venues, selectedVenue, filters, adminMode, mapStyle]);

  return (
    <div id="map-root" className="w-full h-full relative overflow-hidden bg-neutral-950">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      
      {/* Custom glassmorphic zoom controls */}
      <div className="map-zoom-controls absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 z-15 flex flex-col gap-1 border rounded-xl p-1 shadow-2xl backdrop-blur-md">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          title="Приблизить"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 transition-all cursor-pointer"
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
