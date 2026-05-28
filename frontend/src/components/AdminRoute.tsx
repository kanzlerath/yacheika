import { useEffect, useState } from "react";
import { LogOut, Map, ShieldCheck } from "lucide-react";
import AdminPanel from "./AdminPanel";
import MapContainer from "./MapContainer";
import { AnalyticsEvent, Venue, VenueEvent } from "../types";

interface AdminUser {
  id: string;
  email: string;
  role: "owner" | "editor" | "moderator" | "analyst";
  status: "active" | "disabled";
}

interface AdminRouteProps {
  mapStyle: "dark" | "light" | "voyager";
}

export default function AdminRoute({ mapStyle }: AdminRouteProps) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
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
    const [vRes, eRes, aRes] = await Promise.all([
      fetch("/api/venues"),
      fetch("/api/events"),
      fetch("/api/analytics"),
    ]);

    if ([vRes, eRes, aRes].some((res) => !res.ok)) {
      throw new Error("Admin data loading failed");
    }

    const [vData, eData, aData] = await Promise.all([vRes.json(), eRes.json(), aRes.json()]);
    setVenues(vData);
    setEvents(eData);
    setAnalytics(aData);
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
        }
      })
      .finally(() => setIsCheckingSession(false));
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
    if (res.ok) refreshAdminData();
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

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center text-neutral-400 text-sm">
        Проверка доступа...
      </div>
    );
  }

  if (!admin) {
    return <AdminLoginForm error={loginError} onSubmit={handleLogin} />;
  }

  return (
    <div className="absolute inset-0 w-full bg-[#070707] flex flex-col overflow-hidden">
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
          className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-semibold text-neutral-300 hover:border-neutral-700 hover:text-white transition"
        >
          <LogOut className="w-3.5 h-3.5" />
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
  const [email, setEmail] = useState("luzhkoff00@gmail.com");
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
