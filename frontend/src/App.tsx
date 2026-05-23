/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Map,
  Compass,
  Layers,
  Activity,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Heart,
  Calendar,
  Settings,
  Grid
} from "lucide-react";
import MapContainer from "./components/MapContainer";
import DiscoveryPanel from "./components/DiscoveryPanel";
import VenueCard from "./components/VenueCard";
import AdminPanel from "./components/AdminPanel";
import TelegramLoginGate from "./components/TelegramLoginGate";
import { Venue, Collection, VenueEvent, AnalyticsEvent, TelegramAuthSession, Reaction } from "./types";
import { logAnalyticsEvent } from "./utils/analytics";
import {
  clearTelegramAuth,
  getAuthHeaders,
  readStoredTelegramAuth,
  refreshTelegramSession,
  storeTelegramAuth,
} from "./utils/telegramAuth";

export default function App() {
  const [auth, setAuth] = useState<TelegramAuthSession | null>(() => readStoredTelegramAuth());
  const [venues, setVenues] = useState<Venue[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [filters, setFilters] = useState({
    category: "",
    tag: "",
    openNow: false,
    hasEventToday: false,
    search: ""
  });

  const currentUser = auth?.user ?? null;
  const authToken = auth?.token;
  const isAdmin = Boolean(auth?.isAdmin);
  const [userReactions, setUserReactions] = useState<Reaction[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Admin and manual geocoding selector controls
  const [adminMode, setAdminMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Layout View Switcher for responsive mobile sizing (map vs sidebar items)
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const handleAuthenticated = (nextAuth: TelegramAuthSession) => {
    storeTelegramAuth(nextAuth);
    setAuth(nextAuth);
    setShowUserDropdown(false);
  };

  const handleLogout = () => {
    clearTelegramAuth();
    setAuth(null);
    setAdminMode(false);
    setShowUserDropdown(false);
    setSelectedVenue(null);
    setUserReactions([]);
  };

  // Load all live datastores after Telegram auth is verified
  const fetchAllData = async (session = auth) => {
    if (!session) return;

    try {
      const authHeaders = getAuthHeaders(session.token);
      const [vRes, cRes, eRes, rRes, aRes] = await Promise.all([
        fetch("/api/venues"),
        fetch("/api/collections"),
        fetch("/api/events"),
        fetch("/api/users/me/reactions", { headers: authHeaders }),
        session.isAdmin ? fetch("/api/analytics", { headers: authHeaders }) : Promise.resolve(null),
      ]);

      if ([vRes, cRes, eRes, rRes].some((res) => !res.ok) || (aRes && !aRes.ok)) {
        if (rRes.status === 401 || aRes?.status === 401) {
          handleLogout();
        }
        throw new Error("Backend returned an error while loading app data.");
      }

      const [vData, cData, eData, rData, aData] = await Promise.all([
        vRes.json(),
        cRes.json(),
        eRes.json(),
        rRes.json(),
        aRes ? aRes.json() : Promise.resolve([]),
      ]);

      setVenues(vData);
      setCollections(cData);
      setEvents(eData);
      setUserReactions(rData);
      setAnalytics(aData);
    } catch (error) {
      console.error("Failed to load backend datastores:", error);
    }
  };

  // Validate persisted Telegram session once on app mount.
  useEffect(() => {
    const storedAuth = readStoredTelegramAuth();
    if (!storedAuth) return;

    refreshTelegramSession(storedAuth.token)
      .then((freshAuth) => {
        storeTelegramAuth(freshAuth);
        setAuth(freshAuth);
      })
      .catch(() => {
        handleLogout();
      });
  }, []);

  useEffect(() => {
    if (!auth) return;
    fetchAllData(auth);
  }, [auth?.token]);

  useEffect(() => {
    if (!isAdmin && adminMode) {
      setAdminMode(false);
      setPendingCoords(null);
    }
  }, [adminMode, isAdmin]);

  // Reactions toggle triggers
  const handleReactVenue = async (
    venueId: string,
    type: "like" | "not_my_place" | "vibe_tag",
    vibeTag?: string
  ) => {
    if (!currentUser || !authToken) return;

    try {
      const res = await fetch(`/api/venues/${venueId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(authToken),
        },
        body: JSON.stringify({
          type,
          vibeTag
        })
      });

      if (res.ok) {
        // Soft refresh local layouts
        const { venue, added, removed } = await res.json();
        
        // Update local state directly for speedy immediate UX feedback loops!
        setVenues((prev) => prev.map((v) => (v.id === venue.id ? venue : v)));
        if (selectedVenue?.id === venue.id) {
          setSelectedVenue(venue);
        }

        await logAnalyticsEvent({
          eventType: type === "like" ? "like" : "reaction",
          venueId,
          metadata: {
            action: removed ? "remove_reaction" : added ? "add_reaction" : "toggle_reaction",
            reactionType: type,
            vibeTag,
          },
          authToken,
        });

        // Re-load complete logs
        fetchAllData(auth);
      }
    } catch (e) {
      console.error("Reaction registering critical failure:", e);
    }
  };

  // CRUD API: Venues Admin Saves
  const handleSaveVenue = async (venueForm: any) => {
    if (!isAdmin || !authToken) return;

    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(authToken),
        },
        body: JSON.stringify(venueForm)
      });
      if (res.ok) {
        fetchAllData(auth);
      }
    } catch (err) {
      console.error("Failed saving venue:", err);
    }
  };

  // CRUD API: Venue Admin Deletions
  const handleDeleteVenue = async (id: string) => {
    if (!isAdmin || !authToken) return;

    try {
      const res = await fetch(`/api/venues/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(authToken),
      });
      if (res.ok) {
        setSelectedVenue(null);
        fetchAllData(auth);
      }
    } catch (err) {
      console.error("Failed deleting venue:", err);
    }
  };

  // CRUD API: Venue Event Additions
  const handleSaveEvent = async (eventForm: any) => {
    if (!isAdmin || !authToken) return;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(authToken),
        },
        body: JSON.stringify(eventForm)
      });
      if (res.ok) {
        fetchAllData(auth);
      }
    } catch (err) {
      console.error("Failed compiling event:", err);
    }
  };

  // CRUD API: Venue Event Deletions
  const handleDeleteEvent = async (id: string) => {
    if (!isAdmin || !authToken) return;

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(authToken),
      });
      if (res.ok) {
        fetchAllData(auth);
      }
    } catch (err) {
      console.error("Failed deleting event:", err);
    }
  };

  // Handle map selection coordinates adjustment clicker
  const handleMapCoordsClick = (lat: number, lng: number) => {
    if (adminMode) {
      setPendingCoords({ lat, lng });
    }
  };

  const handleVenueSelected = (venue: Venue) => {
    setSelectedVenue(venue);
    // Auto shift on mobile to map view so they see the coordinates flying!
    setMobileView("map");
    
    logAnalyticsEvent({
        eventType: "open_venue",
        venueId: venue.id,
        metadata: { action: "view_card", name: venue.name },
        authToken,
    }).then(() => {
      // Refresh logs for feed counters
      if (isAdmin && authToken) {
        fetch("/api/analytics", { headers: getAuthHeaders(authToken) })
          .then(r => r.json())
          .then(data => setAnalytics(data));
      }
    });
  };

  if (!auth) {
    return <TelegramLoginGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div id="application-root" className="h-screen h-[100dvh] w-screen bg-[#030303] flex flex-col overflow-hidden relative">
      
      {/* 1. Global Glass Header Panel */}
      <header 
        className="w-full flex-shrink-0 bg-neutral-950/90 border-b border-neutral-900/80 flex items-center justify-between px-4 sm:px-6 z-40 backdrop-blur-md"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          height: "calc(4rem + env(safe-area-inset-top, 0px))"
        }}
      >
        
        {/* Logo label space typography */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-display font-black tracking-[0.25em] text-sm text-white uppercase select-none">
            ЯЧЕЙКА
          </span>
        </div>

        {/* Central Auth Switcher Block */}
        <div className="flex items-center gap-2.5">
          
          {/* Telegram authenticated user badge */}
          <div className="relative select-none" id="telegram-auth-widget">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-xl px-3 py-1.5 transition text-xs font-display text-neutral-300"
            >
              {currentUser?.avatarUrl && (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.firstName}
                  className="w-4 h-4 rounded-full border border-neutral-800"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="hidden sm:inline font-medium">@{currentUser?.username}</span>
              <span className="sm:hidden font-medium">{currentUser?.firstName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
            </button>

            <AnimatePresence>
              {showUserDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-11 w-56 bg-neutral-950 border border-neutral-900 rounded-xl p-3 space-y-3 shadow-2xl z-50"
                >
                  <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider pb-1.5 border-b border-neutral-900">
                    Telegram аккаунт
                  </div>
                  
                  <div className="p-2 rounded-lg bg-neutral-900/70 border border-neutral-850 flex items-center gap-2.5">
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.firstName}
                        className="w-8 h-8 rounded-full border border-neutral-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-[11px] font-bold text-neutral-300">
                        {currentUser?.firstName?.slice(0, 1) || "T"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-neutral-100 leading-none truncate">
                        {currentUser?.firstName} {currentUser?.lastName || ""}
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">
                        @{currentUser?.username} · ID {currentUser?.telegramId}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-neutral-500 leading-snug">
                    Роль: {isAdmin ? "администратор" : "пользователь"}
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-200 transition"
                  >
                    Выйти
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin panel toggle */}
          {isAdmin && (
            <button
              onClick={() => {
                setAdminMode(!adminMode);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-display font-semibold transition ${
                adminMode
                  ? "bg-rose-950/30 text-rose-200 border-rose-900/80"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Админка CRUD</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Workspace Layout Routing */}
      {!adminMode ? (
        /* Standard Explorer Discovery Viewport */
        <main className="w-full flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 relative overflow-hidden">
          
          {/* Left Discovery Sidebar - occupies 4-cols on desktop */}
          <section
            className={`h-full md:col-span-4 lg:col-span-3.5 border-r border-neutral-900/60 bg-black/95 md:block absolute md:relative inset-0 z-10 transition-transform duration-300 ${
              mobileView === "list" ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
          >
            <DiscoveryPanel
              venues={venues}
              collections={collections}
              selectedVenue={selectedVenue}
              onSelectVenue={handleVenueSelected}
              filters={filters}
              setFilters={setFilters}
              eventsList={events}
              setMobileView={setMobileView}
            />
          </section>

          {/* Right Map Canvas Content View - occupies 8-cols on desktop */}
          <section className="h-full md:col-span-8 lg:col-span-8.5 relative overflow-hidden block">
            
            <MapContainer
              venues={venues}
              selectedVenue={selectedVenue}
              onSelectVenue={handleVenueSelected}
              adminMode={false}
              onCoordsSelect={handleMapCoordsClick}
              eventsList={events}
              filters={filters}
            />

            {/* Float trigger in the bottom center of the map */}
            {!selectedVenue && mobileView === "map" && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 z-25 md:hidden"
                style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
              >
                <button
                  onClick={() => setMobileView("list")}
                  className="flex items-center gap-2 bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700 px-5 py-2.5 rounded-xl text-xs font-display font-semibold text-white shadow-xl backdrop-blur-md cursor-pointer transition duration-150"
                >
                  <Grid className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <span>Открыть подборки</span>
                </button>
              </div>
            )}

            {/* Sliding interactive VenueCard Bottom Sheet */}
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
      ) : (
        /* Dedicated Separated Administration Workspace Viewport */
        <main className="w-full flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 relative overflow-hidden bg-[#070709] animate-fadeIn">
          
          {/* Left Column - Full Admin Panel CRUD view (scrollable containing edit forms) */}
          <section
            className="col-span-12 xl:col-span-8 h-full overflow-y-auto p-4 md:p-6 border-r border-neutral-900/50"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            
            {/* Top Info Bar inside control panel space */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-neutral-900 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <h2 className="text-xs sm:text-sm font-display font-bold uppercase tracking-widest text-white">Панель Управления Ячейки (Новосибирск)</h2>
              </div>
              <button
                onClick={() => {
                  setAdminMode(false);
                  setPendingCoords(null);
                }}
                className="self-start sm:self-auto flex items-center gap-1 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 py-1.5 px-4 text-xs font-semibold rounded-xl text-neutral-200 transition"
              >
                ← Вернуться на карту
              </button>
            </div>

            <AdminPanel
              venues={venues}
              events={events}
              analytics={analytics}
              authToken={authToken}
              selectedVenue={selectedVenue}
              onSelectVenue={setSelectedVenue}
              onSaveVenue={handleSaveVenue}
              onDeleteVenue={handleDeleteVenue}
              onSaveEvent={handleSaveEvent}
              onDeleteEvent={handleDeleteEvent}
              pendingCoords={pendingCoords}
              setPendingCoords={setPendingCoords}
            />

          </section>

          {/* Right Column - Framed interactive Map container for pin geocoding */}
          <section className="hidden xl:block xl:col-span-4 h-full relative border-l border-neutral-900/30">
            
            {/* Helper floating info card */}
            <div className="absolute top-5 left-5 right-5 bg-neutral-950/95 border border-neutral-900 px-4 py-3 rounded-xl z-10 shadow-2xl">
              <div className="font-semibold text-xs text-neutral-100 flex items-center gap-1.5">
                <Map className="w-3.5 h-3.5 text-rose-500" />
                Карта разметки координат
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                Выберите заведение слева и нажмите в любой точке карты, чтобы добавить новые координаты в форму редактирования.
              </p>
            </div>

            <MapContainer
              venues={venues}
              selectedVenue={selectedVenue}
              onSelectVenue={setSelectedVenue}
              adminMode={true}
              onCoordsSelect={handleMapCoordsClick}
              eventsList={events}
              filters={filters}
            />

          </section>

        </main>
      )}
    </div>
  );
}
