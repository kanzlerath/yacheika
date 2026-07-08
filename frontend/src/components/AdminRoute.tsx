import { useEffect, useState } from "react";
import { Map, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AdminPanel from "./AdminPanel";
import MapContainer from "./MapContainer";
import { AdminDashboard, AdminTelegramUser, AnalyticsEvent, MapStyle, Venue, VenueAudit, VenueEvent, VenueSuggestion } from "../types";

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
  const [selectedVenueAudit, setSelectedVenueAudit] = useState<VenueAudit | null>(null);
  const [selectedVenueAuditLoading, setSelectedVenueAuditLoading] = useState(false);
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
      fetch("/api/venues/admin/all"),
      fetch("/api/events/admin/all"),
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
    setSelectedVenueAudit(null);
    setPendingCoords(null);
    setAnalytics([]);
    setDashboard(null);
    setUsers([]);
    setSuggestions([]);
  };

  const refreshAdminData = () => {
    fetchAdminData().catch((error) => console.error("Failed to refresh admin data:", error));
  };

  useEffect(() => {
    if (!admin || !selectedVenue?.id) {
      setSelectedVenueAudit(null);
      setSelectedVenueAuditLoading(false);
      return;
    }

    let cancelled = false;
    setSelectedVenueAuditLoading(true);
    fetch(`/api/admin/venues/${selectedVenue.id}/audit`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Venue audit loading failed");
        return res.json();
      })
      .then((data: VenueAudit) => {
        if (!cancelled) setSelectedVenueAudit(data);
      })
      .catch((error) => {
        console.error("Failed to load venue audit:", error);
        if (!cancelled) setSelectedVenueAudit(null);
      })
      .finally(() => {
        if (!cancelled) setSelectedVenueAuditLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [admin, events.length, selectedVenue?.id, selectedVenue?.updatedAt]);

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
    return <div className="min-h-screen bg-background" />;
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
      <header className="h-14 shrink-0 border-b border-border bg-card/95 flex items-center justify-between px-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-sm font-display font-semibold tracking-wide">Скоуп / админка</span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{admin.email} · {admin.role}</div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          size="sm"
        >
          Выйти
        </Button>
      </header>

      <main className="w-full flex-1 h-0 min-h-0 relative overflow-hidden bg-background">
        <section
          className={`h-full overflow-y-auto p-4 md:p-6 ${adminMobileShowMap ? "hidden" : "block"}`}
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <AdminPanel
            venues={venues}
            events={events}
            analytics={analytics}
            dashboard={dashboard}
            users={users}
            suggestions={suggestions}
            selectedVenueAudit={selectedVenueAudit}
            selectedVenueAuditLoading={selectedVenueAuditLoading}
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

        <section className={`absolute inset-0 h-full ${adminMobileShowMap ? "block" : "hidden"}`}>
          <Card className="absolute left-4 right-4 top-4 z-20 p-3 shadow-2xl md:left-5 md:right-auto md:w-[360px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Map className="size-3.5 text-primary" />
                  Карта координат
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Нажмите по карте, чтобы выбрать точку для карточки.
                </p>
                {pendingCoords && (
                  <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                    {pendingCoords.lat.toFixed(6)}, {pendingCoords.lng.toFixed(6)}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdminMobileShowMap(false)}
              >
                Готово
              </Button>
            </div>
          </Card>

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-2xl">
      <form
        className="contents"
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
        <CardHeader>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Скоуп</div>
          <CardTitle className="font-display text-xl">Вход в админку</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Почта</span>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Пароль</span>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>

          {error && <div className="text-xs text-destructive">{error}</div>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Проверка..." : "Войти"}
          </Button>
        </CardContent>
      </form>
      </Card>
    </div>
  );
}
