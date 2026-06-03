/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Grid } from "lucide-react";
import AdminRoute from "./components/AdminRoute";
import AuthPromptModal from "./components/AuthPromptModal";
import DiscoveryPanel from "./components/DiscoveryPanel";
import MapContainer from "./components/MapContainer";
import SettingsModal from "./components/SettingsModal";
import VenueCard from "./components/VenueCard";
import { Collection, MapStyle, Reaction, TelegramAuthSession, Venue, VenueEvent } from "./types";
import { logAnalyticsEvent } from "./utils/analytics";
import { appEase, softTransition } from "./utils/motionPresets";
import {
  clearTelegramAuth,
  getAuthHeaders,
  readStoredTelegramAuth,
  refreshTelegramSession,
  storeTelegramAuth,
} from "./utils/telegramAuth";

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function App() {
  const [auth, setAuth] = useState<TelegramAuthSession | null>(() => readStoredTelegramAuth());
  const [venues, setVenues] = useState<Venue[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [filters, setFilters] = useState({
    category: "",
    tag: "",
    openNow: false,
    hasEventToday: false,
    search: "",
  });
  const [userReactions, setUserReactions] = useState<Reaction[]>([]);
  const [mapStyle, setMapStyle] = useState<MapStyle>(() => {
    const val = localStorage.getItem("yacheyka.mapStyle");
    return val === "dark" || val === "light" ? val : "dark";
  });
  const [nearbySort, setNearbySort] = useState<boolean>(() => {
    return localStorage.getItem("yacheyka.nearbySort") === "true";
  });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuthPromptModal, setShowAuthPromptModal] = useState(false);
  const [authPromptActionText, setAuthPromptActionText] = useState("");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const currentUser = auth?.user ?? null;
  const authToken = auth?.token;

  const handleMapStyleChange = (style: MapStyle) => {
    setMapStyle(style);
    localStorage.setItem("yacheyka.mapStyle", style);
  };

  const handleNearbySortChange = (val: boolean) => {
    setNearbySort(val);
    localStorage.setItem("yacheyka.nearbySort", String(val));
  };

  const handleLogout = () => {
    clearTelegramAuth();
    setAuth(null);
    setSelectedVenue(null);
    setUserReactions([]);
  };

  const fetchAllData = async (session = auth) => {
    try {
      const authHeaders = session ? getAuthHeaders(session.token) : {};
      const [vRes, cRes, eRes, rRes] = await Promise.all([
        fetch("/api/venues"),
        fetch("/api/collections"),
        fetch("/api/events"),
        session ? fetch("/api/users/me/reactions", { headers: authHeaders }) : Promise.resolve(null),
      ]);

      if ([vRes, cRes, eRes].some((res) => !res.ok) || (rRes && !rRes.ok)) {
        if (rRes?.status === 401) handleLogout();
        throw new Error("Backend returned an error while loading app data.");
      }

      const [vData, cData, eData, rData] = await Promise.all([
        vRes.json(),
        cRes.json(),
        eRes.json(),
        rRes ? rRes.json() : Promise.resolve([]),
      ]);

      setVenues(vData);
      setCollections(cData);
      setEvents(eData);
      setUserReactions(rData);
    } catch (error) {
      console.error("Failed to load backend datastores:", error);
    }
  };

  useEffect(() => {
    if (!nearbySort) {
      setUserCoords(null);
      return;
    }

    let watchId: number;
    const onSuccess = (pos: GeolocationPosition) => {
      setUserCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    };
    const onError = (err: GeolocationPositionError) => {
      console.warn("Geolocation watch error:", err);
      setNearbySort(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true });
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, { enableHighAccuracy: true });
    } else {
      setNearbySort(false);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [nearbySort]);

  const sortedVenues = useMemo(() => {
    if (!nearbySort || !userCoords) return venues;
    return [...venues].sort((a, b) => {
      const distA = calculateDistance(userCoords.lat, userCoords.lng, a.latitude, a.longitude);
      const distB = calculateDistance(userCoords.lat, userCoords.lng, b.latitude, b.longitude);
      return distA - distB;
    });
  }, [venues, nearbySort, userCoords]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get("auth");
    const authError = urlParams.get("auth_error");

    if (authError) {
      alert("Ошибка авторизации через Telegram");
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      handleLogout();
      fetchAllData(null);
      return;
    }

    if (authStatus === "success") {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      refreshTelegramSession()
        .then((freshAuth) => {
          storeTelegramAuth(freshAuth);
          setAuth(freshAuth);
        })
        .catch(() => handleLogout());
      return;
    }

    const storedAuth = readStoredTelegramAuth();
    if (!storedAuth) {
      fetchAllData(null);
      return;
    }

    refreshTelegramSession(storedAuth.token)
      .then((freshAuth) => {
        storeTelegramAuth(freshAuth);
        setAuth(freshAuth);
      })
      .catch(() => handleLogout());
  }, []);

  useEffect(() => {
    fetchAllData(auth);
  }, [auth?.token]);

  const handleReactVenue = async (
    venueId: string,
    type: "like" | "not_my_place" | "vibe_tag",
    vibeTag?: string,
  ) => {
    if (!authToken) {
      setAuthPromptActionText(
        type === "like"
          ? "чтобы рекомендовать заведения"
          : type === "not_my_place"
            ? "чтобы помечать заведение как «Не моё место»"
            : `чтобы оценить вайб дня «${vibeTag}»`,
      );
      setShowAuthPromptModal(true);
      return;
    }

    const previousVenues = venues;
    const previousSelectedVenue = selectedVenue;
    const previousReactions = userReactions;
    const reactionMatches = (reaction: Reaction) =>
      reaction.venueId === venueId && reaction.type === type && (type !== "vibe_tag" || reaction.vibeTag === vibeTag);
    const alreadyReacted = userReactions.some(reactionMatches);

    const optimisticVenueUpdate = (venue: Venue): Venue => {
      if (venue.id !== venueId) return venue;
      if (type === "like") {
        return { ...venue, likesCount: Math.max(0, venue.likesCount + (alreadyReacted ? -1 : 1)) };
      }
      if (type === "not_my_place") {
        return { ...venue, notMyPlaceCount: Math.max(0, venue.notMyPlaceCount + (alreadyReacted ? -1 : 1)) };
      }
      if (!vibeTag) return venue;
      const nextRatings = { ...(venue.vibeRatings || {}) };
      nextRatings[vibeTag] = Math.max(0, (nextRatings[vibeTag] || 0) + (alreadyReacted ? -1 : 1));
      if (nextRatings[vibeTag] === 0) delete nextRatings[vibeTag];
      return { ...venue, vibeRatings: nextRatings };
    };

    const nextReactions = alreadyReacted
      ? userReactions.filter((reaction) => !reactionMatches(reaction))
      : [
          ...userReactions,
          {
            id: `optimistic-${venueId}-${type}-${vibeTag || "main"}`,
            userId: currentUser?.id || "me",
            venueId,
            type,
            vibeTag,
            createdAt: new Date().toISOString(),
          },
        ];

    setUserReactions(nextReactions);
    setVenues((prev) => prev.map(optimisticVenueUpdate));
    setSelectedVenue((prev) => (prev ? optimisticVenueUpdate(prev) : prev));

    try {
      const res = await fetch(`/api/venues/${venueId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(authToken),
        },
        body: JSON.stringify({ type, vibeTag }),
      });

      if (res.ok) {
        const { venue, added, removed } = await res.json();
        setVenues((prev) => prev.map((v) => (v.id === venue.id ? venue : v)));
        if (selectedVenue?.id === venue.id) setSelectedVenue(venue);

        void logAnalyticsEvent({
          eventType: type === "like" ? "like" : "reaction",
          venueId,
          metadata: {
            action: removed ? "remove_reaction" : added ? "add_reaction" : "toggle_reaction",
            reactionType: type,
            vibeTag,
          },
          authToken,
        });
      } else {
        throw new Error("Reaction request failed");
      }
    } catch (e) {
      setVenues(previousVenues);
      setSelectedVenue(previousSelectedVenue);
      setUserReactions(previousReactions);
      console.error("Reaction registering critical failure:", e);
    }
  };

  const handleVenueSelected = (venue: Venue) => {
    setSelectedVenue(venue);
    setMobileView("map");

    logAnalyticsEvent({
      eventType: "open_venue",
      venueId: venue.id,
      metadata: { action: "view_card", name: venue.name },
      authToken,
    });
  };

  if (window.location.pathname === "/admin") {
    return <AdminRoute mapStyle={mapStyle} />;
  }

  return (
    <div
      id="application-root"
      data-theme={mapStyle}
      className="absolute inset-0 w-full flex flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: "var(--app-bg)" }}
    >
      <header
        className="app-header absolute top-0 left-0 right-0 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 z-40 pointer-events-none"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          height: "calc(4.5rem + env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <img
            src={mapStyle === "light" ? "/logo-black.svg" : "/logo-white.svg"}
            className="w-7.5 h-7.5 object-contain"
            alt="скоуп logo"
          />
          <span className="font-display font-bold tracking-[0.15em] text-lg lowercase select-none" style={{ color: "var(--app-text)" }}>
            скоуп
          </span>
        </div>

        <div className="flex items-center gap-2.5 pointer-events-auto">
          {auth ? (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="app-control-button flex items-center gap-2 border rounded-xl px-3 py-1.5 transition text-xs font-display select-none cursor-pointer"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.firstName}
                  className="w-4.5 h-4.5 rounded-full border border-neutral-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-4.5 h-4.5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-300">
                  {currentUser?.firstName?.slice(0, 1) || "T"}
                </div>
              )}
              <span className="hidden sm:inline font-medium">@{currentUser?.username}</span>
              <span className="sm:hidden font-medium">{currentUser?.firstName}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="app-control-button flex items-center border rounded-xl px-3.5 py-1.5 transition text-xs font-display font-semibold cursor-pointer select-none"
            >
              <span>Войти / Настройки</span>
            </button>
          )}
        </div>
      </header>

      <main className="w-full flex-1 h-0 min-h-0 flex flex-col md:grid md:grid-cols-12 relative overflow-hidden">
        <motion.section
          layout
          transition={{ duration: 0.28, ease: appEase }}
          className={`app-sidebar h-full md:col-span-4 lg:col-span-3.5 border-r md:block absolute md:relative inset-0 z-30 transition-transform duration-300 ${
            mobileView === "list" ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <DiscoveryPanel
            venues={sortedVenues}
            collections={collections}
            selectedVenue={selectedVenue}
            onSelectVenue={handleVenueSelected}
            filters={filters}
            setFilters={setFilters}
            eventsList={events}
            setMobileView={setMobileView}
          />
        </motion.section>

        <section className="relative w-full h-full flex-1 md:col-span-8 lg:col-span-8.5 overflow-hidden block">
          <MapContainer
            venues={sortedVenues}
            selectedVenue={selectedVenue}
            onSelectVenue={handleVenueSelected}
            adminMode={false}
            onCoordsSelect={() => undefined}
            filters={filters}
            mapStyle={mapStyle}
            userCoords={userCoords}
            pendingCoords={null}
          />

          <AnimatePresence>
            {!selectedVenue && mobileView === "map" && (
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 z-25 md:hidden"
                style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={softTransition}
              >
                <button
                  onClick={() => setMobileView("list")}
                  className="flex items-center justify-center w-12 h-12 border rounded-full shadow-xl backdrop-blur-md cursor-pointer transition duration-150"
                  style={{
                    backgroundColor: "var(--app-panel)",
                    borderColor: "var(--app-border-strong)",
                    color: "var(--app-text)",
                  }}
                  aria-label="Открыть подборки"
                >
                  <Grid className="w-5 h-5" style={{ color: "var(--app-accent)" }} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedVenue && (
              <VenueCard
                key={selectedVenue.id}
                venue={selectedVenue}
                authToken={authToken}
                userReactions={userReactions}
                vEvents={events.filter((e) => e.venueId === selectedVenue.id)}
                onReact={handleReactVenue}
                onClose={() => setSelectedVenue(null)}
              />
            )}
          </AnimatePresence>
        </section>
      </main>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        auth={auth}
        onLogout={handleLogout}
        mapStyle={mapStyle}
        onChangeMapStyle={handleMapStyleChange}
        nearbySort={nearbySort}
        onChangeNearbySort={handleNearbySortChange}
      />

      <AuthPromptModal
        isOpen={showAuthPromptModal}
        onClose={() => setShowAuthPromptModal(false)}
        actionText={authPromptActionText}
      />
    </div>
  );
}
