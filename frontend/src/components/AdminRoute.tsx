import { useEffect, useState } from "react";
import { Map, ShieldCheck } from "lucide-react";
import AdminPanel from "./AdminPanel";
import MapContainer from "./MapContainer";
import { AdminDashboard, AdminTelegramUser, AnalyticsEvent, MapStyle, Venue, VenueEvent, VenueSuggestion } from "../types";

interface AdminUser {
  id: string;
  email: string;
  role: "owner" | "editor" | "moderator" | "analyst";
  status: "active" | "disabled";
}

interface AdminRouteProps {
  mapStyle: MapStyle;
}

export default function AdminRoute({ mapStyle }: AdminRouteProps) {
  const [admin, setAdmin] = useState<AdminUser | null | undefined>(undefined);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminTelegramUser[]>([]);
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [adminMobileShowMap, setAdminMobileShowMap] = useState(false);
  const [filters] = useState({
    category: "",
    tag: "",
    openNow: false,
    hasEventToday: false,
    search: "",
  });

  const fetchAdminData = async () => {
    const [vRes, eRes, aRes, dRes, uRes, sRes] = await Promise.all([
      fetch("/api/venues"),
      fetch("/api/events"),
      fetch("/api/analytics"),
      fetch("/api/admin/dashboard"),
      fetch("/api/admin/users"),
      fetch("/api/admin/venue-suggestions"),
    ]);

    if ([vRes, eRes, aRes, dRes, uRes, sRes].some((res) => !res.ok)) {
      throw new Error("Admin data loading failed");
    }

    const [vData, eData, aData, dData, uData, sData] = await Promise.all([
      vRes.json(),
      eRes.json(),
      aRes.json(),
      dRes.json(),
      uRes.json(),
      sRes.json(),
    ]);
    setVenues(vData);
    setEvents(eData);
    setAnalytics(aData);
    setDashboard(dData);
    setUsers(uData);
    setSuggestions(sData);
  };

  useEffect(() => {
    fetch("/api/admin/me")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.admin) {
          setAdmin(data.admin);
          fetchAdminData().catch((error) => console.error("Failed to load admin data:", error));
        } else {
          setAdmin(null);
        }
      })
      .finally(() => undefined);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setLoginError("Неверная почта или пароль");
      return;
    }

    const data = await res.json();
    setAdmin(data.admin);
    await fetchAdminData();
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setAdmin(null);
    setSelectedVenue(null);
    setPendingCoords(null);
    setAnalytics([]);
    setDashboard(null);
    setUsers([]);
    setSuggestions([]);
  };

  const refreshAdminData = () => {
    fetchAdminData().catch((error) => console.error("Failed to refresh admin data:", error));
  };

  const handleSaveVenue = async (venueForm: any) => {
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venueForm),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Не удалось сохранить заведение");
    }
    const saved = await res.json();
    setSelectedVenue(saved);
    refreshAdminData();
  };

  const handleDeleteVenue = async (id: string) => {
    const res = await fetch(`/api/venues/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedVenue(null);
      refreshAdminData();
    }
  };

  const handleSaveEvent = async (eventForm: any) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventForm),
    });
    if (res.ok) refreshAdminData();
  };

  const handleDeleteEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) refreshAdminData();
  };

  const handleMapCoordsClick = (lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
  };

  if (admin === undefined) {
    return <div className="min-h-screen bg-[#070707]" />;
  }

  if (!admin) {
    return <AdminLoginForm error={loginError} onSubmit={handleLogin} />;
  }

  return (
    <div
      data-theme={mapStyle}
      className="absolute inset-0 w-full flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--app-bg)" }}
    >
      <header className="h-16 shrink-0 border-b border-neutral-900 bg-[#090909] flex items-center justify-between px-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-neutral-100">
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-display font-semibold tracking-wide">скоуп / админка</span>
          </div>
          <div className="text-[11px] text-neutral-500 truncate">{admin.email} · {admin.role}</div>
        </div>
        <button
          onClick={handleLogout}
          className="app-text-button"
        >
          Выйти
        </button>
      </header>

      <main className="w-full flex-1 h-0 min-h-0 flex flex-col xl:grid xl:grid-cols-12 relative overflow-hidden bg-[#070709]">
        <section
          className={`col-span-12 xl:col-span-8 h-full overflow-y-auto p-4 md:p-6 border-r border-neutral-900/50 ${adminMobileShowMap ? "hidden xl:block" : "block"}`}
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <AdminPanel
            venues={venues}
            events={events}
            analytics={analytics}
            dashboard={dashboard}
            users={users}
            suggestions={suggestions}
            selectedVenue={selectedVenue}
            onSelectVenue={setSelectedVenue}
            onSaveVenue={handleSaveVenue}
            onDeleteVenue={handleDeleteVenue}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
            pendingCoords={pendingCoords}
            setPendingCoords={setPendingCoords}
            onToggleMobileMap={setAdminMobileShowMap}
          />
        </section>

        <section className={`col-span-12 xl:col-span-4 h-full relative border-l border-neutral-900/30 ${adminMobileShowMap ? "block" : "hidden xl:block"}`}>
          <div className="absolute top-5 left-5 right-5 bg-neutral-950/95 border border-neutral-900 px-4 py-3 rounded-xl z-10 shadow-2xl hidden xl:block">
            <div className="font-semibold text-xs text-neutral-100 flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-rose-500" />
              Карта координат
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              Выберите заведение слева и нажмите в любой точке карты, чтобы добавить координаты в форму.
            </p>
          </div>

          {adminMobileShowMap && (
            <div className="absolute left-4 right-4 bottom-4 z-20 rounded-xl border border-neutral-800 bg-neutral-950/95 p-3 shadow-2xl xl:hidden">
              <div className="text-xs font-semibold text-neutral-100">
                {pendingCoords ? "Точка выбрана" : "Нажмите по карте, чтобы выбрать точку"}
              </div>
              {pendingCoords && (
                <div className="mt-1 font-mono text-[10px] text-neutral-500">
                  {pendingCoords.lat.toFixed(6)}, {pendingCoords.lng.toFixed(6)}
                </div>
              )}
              <button
                type="button"
                onClick={() => setAdminMobileShowMap(false)}
                className="mt-3 w-full rounded-lg border border-neutral-800 bg-white px-3 py-2 text-xs font-semibold text-black"
              >
                Вернуться к форме
              </button>
            </div>
          )}

          <MapContainer
            venues={venues}
            selectedVenue={selectedVenue}
            onSelectVenue={setSelectedVenue}
            adminMode={true}
            onCoordsSelect={handleMapCoordsClick}
            filters={filters}
            mapStyle={mapStyle}
            userCoords={null}
            pendingCoords={pendingCoords}
          />
        </section>
      </main>
    </div>
  );
}

function AdminLoginForm({
  error,
  onSubmit,
}: {
  error: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center px-4">
      <form
        className="w-full max-w-sm border border-neutral-850 bg-[#0d0d0f] p-6 shadow-2xl"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);
          try {
            await onSubmit(email, password);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="space-y-1 mb-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 font-semibold">Скоуп</div>
          <h1 className="text-xl font-display font-semibold text-white">Вход в админку</h1>
        </div>

        <label className="block space-y-2 mb-4">
          <span className="text-xs font-semibold text-neutral-400">Почта</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="username"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600"
          />
        </label>

        <label className="block space-y-2 mb-4">
          <span className="text-xs font-semibold text-neutral-400">Пароль</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600"
          />
        </label>

        {error && <div className="mb-4 text-xs text-rose-400">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Проверка..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
