import { useMemo, useState } from "react";
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Calendar,
  LayoutDashboard,
  List,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminDashboard,
  AdminTelegramUser,
  AnalyticsEvent,
  Venue,
  VenueAudit,
  VenueEvent,
  VenueSuggestion,
  WeekdayKey,
  WorkingHoursSchedule,
} from "../types";
import {
  buildWorkingHoursText,
  createEmptySchedule,
  normalizeSchedule,
  slugifyVenueName,
} from "../utils/venueAdmin";
import { DashboardView } from "./admin/DashboardView";
import { EventsOverview } from "./admin/EventsOverview";
import { SuggestionsView } from "./admin/SuggestionsView";
import { UsersView } from "./admin/UsersView";
import { ACCEPTED_IMAGE_TYPES, EventEditor, VenueEditor, compressImageFile } from "./admin/VenueEditor";
import { VenueList } from "./admin/VenueList";
import { VenueWorkspace } from "./admin/VenueWorkspace";

interface AdminPanelProps {
  venues: Venue[];
  events: VenueEvent[];
  analytics: AnalyticsEvent[];
  dashboard: AdminDashboard | null;
  users: AdminTelegramUser[];
  suggestions: VenueSuggestion[];
  selectedVenueAudit: VenueAudit | null;
  selectedVenueAuditLoading: boolean;
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  onSaveVenue: (venue: any) => Promise<void> | void;
  onDeleteVenue: (id: string) => void;
  onSaveEvent: (event: any) => void;
  onDeleteEvent: (id: string) => void;
  pendingCoords: { lat: number; lng: number } | null;
  setPendingCoords: (co: any) => void;
  onToggleMobileMap?: (show: boolean) => void;
}

type AdminSection = "dashboard" | "venues" | "add" | "users" | "events" | "suggestions";

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const createVenueDraft = (coords?: { lat: number; lng: number } | null) => ({
  id: "",
  name: "",
  slug: "",
  category: "Бар",
  shortDescription: "",
  fullDescription: "",
  address: "",
  latitude: coords?.lat || 55.0302,
  longitude: coords?.lng || 82.9204,
  workingHours: "",
  workingHoursSchedule: createEmptySchedule(),
  logoUrl: "",
  contacts: {
    phone: "",
    telegram: "",
    instagram: "",
    vk: "",
    website: "",
  },
  gallery: [],
  tags: [],
  status: "published",
  premiumConfig: {
    premiumActive: false,
    customColors: {
      primary: "#131923",
      accent: "#c7a469",
      glowColor: "#c7a469",
      tagColor: "#c7a469",
      ctaColor: "#c7a469",
    },
    heroImage: "",
    moodBlock: "",
    moodEmoji: "✨",
    topItems: [],
    featuredDrinks: [],
    ctaUrl: "",
    ctaText: "",
  },
});

const normalizeVenueForEdit = (venue: Venue) => ({
  ...venue,
  workingHoursSchedule: normalizeSchedule(venue.workingHoursSchedule),
  contacts: {
    phone: venue.contacts?.phone || "",
    telegram: venue.contacts?.telegram || "",
    instagram: venue.contacts?.instagram || "",
    vk: venue.contacts?.vk || "",
    website: venue.contacts?.website || "",
  },
  logoUrl: venue.logoUrl || "",
  gallery: venue.gallery || [],
  tags: venue.tags || [],
  premiumConfig: {
    premiumActive: venue.premiumConfig?.premiumActive || false,
    customColors: {
      primary: "#131923",
      accent: "#c7a469",
      glowColor: "#c7a469",
      tagColor: "#c7a469",
      ctaColor: "#c7a469",
      ...(venue.premiumConfig?.customColors || {}),
    },
    heroImage: venue.premiumConfig?.heroImage || "",
    moodBlock: venue.premiumConfig?.moodBlock || "",
    moodEmoji: venue.premiumConfig?.moodEmoji || "✨",
    topItems: venue.premiumConfig?.topItems || venue.premiumConfig?.featuredDrinks || [],
    featuredDrinks: venue.premiumConfig?.featuredDrinks || venue.premiumConfig?.topItems || [],
    ctaUrl: venue.premiumConfig?.ctaUrl || "",
    ctaText: venue.premiumConfig?.ctaText || "",
  },
});

export default function AdminPanel({
  venues,
  events,
  analytics,
  dashboard,
  users,
  suggestions,
  selectedVenueAudit,
  selectedVenueAuditLoading,
  selectedVenue,
  onSelectVenue,
  onSaveVenue,
  onDeleteVenue,
  onSaveEvent,
  onDeleteEvent,
  pendingCoords,
  setPendingCoords,
  onToggleMobileMap,
}: AdminPanelProps) {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [editingVenue, setEditingVenue] = useState<any>(() => createVenueDraft(pendingCoords));
  const [tagInput, setTagInput] = useState("");
  const [topItemInput, setTopItemInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<"gallery" | "hero" | "event" | "logo" | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: "21:00",
    coverImage: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 130, tolerance: 8 } }),
  );

  const duplicateName = useMemo(() => {
    const normalized = editingVenue.name.trim().toLowerCase();
    if (!normalized) return false;
    return venues.some((venue) => venue.id !== editingVenue.id && venue.name.trim().toLowerCase() === normalized);
  }, [editingVenue.id, editingVenue.name, venues]);

  const selectedVenueEvents = events.filter((event) => event.venueId === editingVenue.id);

  const loadVenue = (venue: Venue) => {
    onSelectVenue(venue);
    setEditingVenue(normalizeVenueForEdit(venue));
    setSection("venues");
    setSaveError(null);
  };

  const startCreateVenue = () => {
    setEditingVenue(createVenueDraft(pendingCoords));
    setSaveError(null);
    setSection("add");
  };

  const updateVenueName = (name: string) => {
    setEditingVenue((prev: any) => ({
      ...prev,
      name,
      slug: slugifyVenueName(name),
    }));
  };

  const updateSchedule = (day: WeekdayKey, patch: { from?: string; to?: string; closed?: boolean }) => {
    setEditingVenue((prev: any) => {
      const schedule = normalizeSchedule(prev.workingHoursSchedule);
      const current = schedule[day]?.[0] || { from: "18:00", to: "02:00" };
      const nextSchedule: WorkingHoursSchedule = {
        ...schedule,
        [day]: patch.closed ? [] : [{ ...current, ...patch, closed: undefined }],
      };
      return {
        ...prev,
        workingHoursSchedule: nextSchedule,
        workingHours: buildWorkingHoursText(nextSchedule),
      };
    });
  };

  const addTag = (rawTag = tagInput) => {
    const tag = rawTag.trim().replace(/^#/, "");
    if (!tag || editingVenue.tags.includes(tag)) return;
    setEditingVenue((prev: any) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput("");
  };

  const addTopItem = () => {
    const item = topItemInput.trim();
    if (!item) return;
    setEditingVenue((prev: any) => ({
      ...prev,
      premiumConfig: {
        ...prev.premiumConfig,
        topItems: [...(prev.premiumConfig.topItems || []), item],
        featuredDrinks: [...(prev.premiumConfig.topItems || []), item],
      },
    }));
    setTopItemInput("");
  };

  const uploadFile = async (file: File) => {
    const finalFile = await compressImageFile(file);
    const formData = new FormData();
    formData.append("file", finalFile);
    const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || error.error || "Не удалось загрузить изображение");
    }
    const data = await res.json();
    return data.url as string;
  };

  const uploadSelectedImages = async (files: FileList | File[] | null | undefined, target: "gallery" | "hero" | "event" | "logo") => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploadError(null);
    setUploadingTarget(target);
    try {
      const validFiles = list.filter((file) => {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          setUploadError("Поддерживаются только JPG, PNG, WebP, GIF или AVIF.");
          return false;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          setUploadError("Размер изображения не должен превышать 8 МБ.");
          return false;
        }
        return true;
      });
      if (!validFiles.length) return;
      const urls = await Promise.all(validFiles.map(uploadFile));
      if (target === "gallery") {
        setEditingVenue((prev: any) => ({ ...prev, gallery: [...prev.gallery, ...urls] }));
      } else if (target === "hero") {
        setEditingVenue((prev: any) => ({
          ...prev,
          premiumConfig: { ...prev.premiumConfig, heroImage: urls[0] },
        }));
      } else if (target === "logo") {
        setEditingVenue((prev: any) => ({ ...prev, logoUrl: urls[0] }));
      } else {
        setNewEvent((prev) => ({ ...prev, coverImage: urls[0] }));
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось загрузить изображение");
    } finally {
      setUploadingTarget(null);
    }
  };

  const saveVenue = async () => {
    setSaveError(null);
    if (duplicateName) {
      setSaveError("Заведение с таким именем уже есть.");
      return;
    }
    if (!editingVenue.name.trim()) {
      setSaveError("Укажите имя заведения.");
      return;
    }

    try {
      const schedule = normalizeSchedule(editingVenue.workingHoursSchedule);
      await onSaveVenue({
        ...editingVenue,
        slug: slugifyVenueName(editingVenue.name),
        workingHoursSchedule: schedule,
        workingHours: buildWorkingHoursText(schedule),
        premiumConfig: {
          ...editingVenue.premiumConfig,
          topItems: editingVenue.premiumConfig.topItems || [],
          featuredDrinks: editingVenue.premiumConfig.topItems || [],
          premiumTheme: undefined,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Не удалось сохранить заведение.");
    }
  };

  const applyPendingCoords = () => {
    if (!pendingCoords) return;
    setEditingVenue((prev: any) => ({
      ...prev,
      latitude: Number(pendingCoords.lat.toFixed(6)),
      longitude: Number(pendingCoords.lng.toFixed(6)),
    }));
    setPendingCoords(null);
  };

  const handleGalleryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEditingVenue((prev: any) => {
      const oldIndex = prev.gallery.indexOf(active.id);
      const newIndex = prev.gallery.indexOf(over.id);
      return { ...prev, gallery: arrayMove(prev.gallery, oldIndex, newIndex) };
    });
  };

  const createEvent = () => {
    if (!editingVenue.id || !newEvent.title.trim()) return;
    onSaveEvent({ ...newEvent, venueId: editingVenue.id });
    setNewEvent({
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      time: "21:00",
      coverImage: "",
    });
  };

  return (
    <div id="admin-panel" className="admin-panel-minimal min-h-full border bg-neutral-950 p-3 sm:p-4 text-xs sm:text-sm">
      <div className="grid min-h-full grid-cols-1 gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="space-y-2 border-b border-neutral-900 pb-3 lg:border-b-0 lg:border-r lg:pr-3">
          {[
            ["dashboard", LayoutDashboard, "Дашборд"],
            ["venues", List, "Заведения"],
            ["add", Plus, "Добавить заведение"],
            ["users", Users, "Пользователи"],
            ["suggestions", MapPin, "Заявки"],
            ["events", Calendar, "События"],
          ].map(([id, Icon, label]) => (
            <Button
              key={id as string}
              type="button"
              variant="ghost"
              onClick={() => (id === "add" ? startCreateVenue() : setSection(id as AdminSection))}
              className={`admin-tab flex w-full justify-start gap-2 text-left ${section === id ? "admin-tab-active" : ""}`}
            >
              <Icon className="h-4 w-4" />
              {label as string}
            </Button>
          ))}
        </nav>

        <div className="min-w-0">
          {section === "dashboard" && (
            <DashboardView dashboard={dashboard} analytics={analytics} venues={venues} />
          )}

          {section === "users" && <UsersView users={users} />}

          {section === "suggestions" && <SuggestionsView suggestions={suggestions} />}

          {section === "events" && (
            <EventsOverview events={events} venues={venues} onSelectVenue={loadVenue} />
          )}

          {(section === "venues" || section === "add") && (
            <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
              <VenueList venues={venues} selectedVenue={selectedVenue} onSelectVenue={loadVenue} />
              <VenueWorkspace
                editingVenue={editingVenue}
                selectedVenueAudit={selectedVenueAudit}
                selectedVenueAuditLoading={selectedVenueAuditLoading}
                selectedVenueEvents={selectedVenueEvents}
                saveError={saveError}
                saved={saved}
                onDeleteVenue={onDeleteVenue}
                saveVenue={saveVenue}
                editor={(
                  <VenueEditor
                    editingVenue={editingVenue}
                    setEditingVenue={setEditingVenue}
                    duplicateName={duplicateName}
                    tagInput={tagInput}
                    setTagInput={setTagInput}
                    addTag={addTag}
                    updateVenueName={updateVenueName}
                    updateSchedule={updateSchedule}
                    pendingCoords={pendingCoords}
                    onToggleMobileMap={onToggleMobileMap}
                    applyPendingCoords={applyPendingCoords}
                    uploadError={uploadError}
                    uploadingTarget={uploadingTarget}
                    uploadSelectedImages={uploadSelectedImages}
                    sensors={sensors}
                    handleGalleryDragEnd={handleGalleryDragEnd}
                    topItemInput={topItemInput}
                    setTopItemInput={setTopItemInput}
                    addTopItem={addTopItem}
                  />
                )}
                eventsEditor={(
                  <EventEditor
                    editingVenue={editingVenue}
                    events={selectedVenueEvents}
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    uploadError={uploadError}
                    uploadingTarget={uploadingTarget}
                    uploadSelectedImages={uploadSelectedImages}
                    onDeleteEvent={onDeleteEvent}
                    createEvent={createEvent}
                  />
                )}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
