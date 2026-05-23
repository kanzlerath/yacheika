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
import { Venue, Collection, VenueEvent, AnalyticsEvent, TelegramUser, Reaction } from "./types";
import { logAnalyticsEvent } from "./utils/analytics";

const MOCK_TELEGRAM_USERS: TelegramUser[] = [
  {
    id: "tg-dmitry",
    telegramId: "12345678",
    username: "nsk_bar_hunter",
    firstName: "Дмитрий",
    lastName: "Гордеев",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
    createdAt: new Date().toISOString()
  },
  {
    id: "tg-dasha",
    telegramId: "87654321",
    username: "dasha_vibe",
    firstName: "Дарья",
    lastName: "Смирнова",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    createdAt: new Date().toISOString()
  },
  {
    id: "tg-mikhail",
    telegramId: "99887766",
    username: "mikhail_tech",
    firstName: "Михаил",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150",
    createdAt: new Date().toISOString()
  }
];

export default function App() {
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

  // Telegram Mock Auth system
  const [currentUser, setCurrentUser] = useState<TelegramUser | null>(MOCK_TELEGRAM_USERS[0]);
  const [userReactions, setUserReactions] = useState<Reaction[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Admin and manual geocoding selector controls
  const [adminMode, setAdminMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Layout View Switcher for responsive mobile sizing (map vs sidebar items)
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  // Load all live datastores on initialization
  const fetchAllData = async (userIdStr?: string) => {
    try {
      const vRes = await fetch("/api/venues");
      const vData = await vRes.json();
      setVenues(vData);

      const cRes = await fetch("/api/collections");
      const cData = await cRes.json();
      setCollections(cData);

      const eRes = await fetch("/api/events");
      const eData = await eRes.json();
      setEvents(eData);

      const aRes = await fetch("/api/analytics");
      const aData = await aRes.json();
      setAnalytics(aData);

      const activeUid = userIdStr || currentUser?.id;
      if (activeUid) {
        const rRes = await fetch(`/api/users/${activeUid}/reactions`);
        const rData = await rRes.json();
        setUserReactions(rData);
      }
    } catch (error) {
      console.error("Failed to load backend datastores:", error);
    }
  };

  // Run core mounts once safely
  useEffect(() => {
    fetchAllData();
  }, []);

  // Update reactions lists whenever users shift
  const handleSwitchUser = (user: TelegramUser) => {
    setCurrentUser(user);
    setShowUserDropdown(false);
    fetchAllData(user.id);
  };

  // Reactions toggle triggers
  const handleReactVenue = async (
    venueId: string,
    type: "like" | "not_my_place" | "vibe_tag",
    vibeTag?: string
  ) => {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/venues/${venueId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
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
          userId: currentUser.telegramId,
          metadata: {
            action: removed ? "remove_reaction" : added ? "add_reaction" : "toggle_reaction",
            reactionType: type,
            vibeTag,
          },
        });

        // Re-load complete logs
        fetchAllData();
      }
    } catch (e) {
      console.error("Reaction registering critical failure:", e);
    }
  };

  // CRUD API: Venues Admin Saves
  const handleSaveVenue = async (venueForm: any) => {
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(venueForm)
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed saving venue:", err);
    }
  };

  // CRUD API: Venue Admin Deletions
  const handleDeleteVenue = async (id: string) => {
    try {
      const res = await fetch(`/api/venues/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSelectedVenue(null);
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed deleting venue:", err);
    }
  };

  // CRUD API: Venue Event Additions
  const handleSaveEvent = async (eventForm: any) => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm)
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed compiling event:", err);
    }
  };

  // CRUD API: Venue Event Deletions
  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchAllData();
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
        userId: currentUser?.telegramId,
        metadata: { action: "view_card", name: venue.name }
    }).then(() => {
      // Refresh logs for feed counters
      fetch("/api/analytics")
        .then(r => r.json())
        .then(data => setAnalytics(data));
    });
  };

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
          
          {/* Telegram simulation user badge popup selector */}
          <div className="relative select-none" id="simulated-auth-widget">
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
                    Симулятор Telegram-аккаунта
                  </div>
                  
                  <div className="space-y-1">
                    {MOCK_TELEGRAM_USERS.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSwitchUser(user)}
                        className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 text-xs transition ${
                          currentUser?.id === user.id
                            ? "bg-rose-950/30 text-rose-200 border border-rose-900/30"
                            : "hover:bg-neutral-900 text-neutral-400"
                        }`}
                      >
                        <img
                          src={user.avatarUrl}
                          alt={user.firstName}
                          className="w-5 h-5 rounded-full border border-neutral-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="truncate">
                          <div className="font-semibold text-neutral-100 leading-none">
                            {user.firstName} {user.lastName || ""}
                          </div>
                          <span className="text-[10px] text-neutral-500">@{user.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="text-[9px] text-neutral-500 italic leading-snug">
                    Переключайте профили для тестирования раздельных лайков заведений и атмосферных оценок.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin panel toggle */}
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
                  currentUser={currentUser}
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
