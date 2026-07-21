import { useState } from "react";
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Activity,
  Calendar,
  FileText,
  Image,
  LayoutDashboard,
  List,
  MapPin,
  MessageSquare,
  Plus,
  Settings2,
  Sparkles,
  Users,
  type LucideIcon,
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
  UserFeedback,
  WeekdayKey,
  WorkingHoursSchedule,
} from "../types";
import {
  buildWorkingHoursText,
  createEmptySchedule,
  normalizeSchedule,
  slugifyVenueName,
} from "../utils/venueAdmin";
import { cn } from "@/lib/utils";
import { normalizePremiumRecommendations } from "../utils/premium";
import { DashboardView } from "./admin/DashboardView";
import { EventsOverview } from "./admin/EventsOverview";
import { FeedbackView } from "./admin/FeedbackView";
import { SuggestionsView } from "./admin/SuggestionsView";
import { UsersView } from "./admin/UsersView";
import { ACCEPTED_IMAGE_TYPES, EventEditor, VenueEditor, compressImageFile, type VenueEditorSection } from "./admin/VenueEditor";
import { VenueAuditView } from "./admin/VenueAuditView";
import { VenueList } from "./admin/VenueList";
import { VenueWorkspace } from "./admin/VenueWorkspace";

interface AdminPanelProps {
  venues: Venue[];
  events: VenueEvent[];
  analytics: AnalyticsEvent[];
  dashboard: AdminDashboard | null;
  users: AdminTelegramUser[];
  suggestions: VenueSuggestion[];
  feedback: UserFeedback[];
  selectedVenueAudit: VenueAudit | null;
  selectedVenueAuditLoading: boolean;
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue | null) => void;
  onSaveVenue: (venue: any) => Promise<Venue | void> | Venue | void;
  onDeleteVenue: (id: string) => Promise<void> | void;
  onSaveEvent: (event: any) => void;
  onDeleteEvent: (id: string) => void;
  pendingCoords: { lat: number; lng: number } | null;
  setPendingCoords: (co: any) => void;
  onToggleMobileMap?: (show: boolean) => void;
}

type AdminSection =
  | "dashboard"
  | "venues"
  | "add"
  | "venue-main"
  | "venue-content"
  | "venue-media"
  | "venue-premium"
  | "venue-events"
  | "venue-audit"
  | "users"
  | "events"
  | "suggestions"
  | "feedback";

const VENUE_EDITOR_SECTIONS: Partial<Record<AdminSection, VenueEditorSection>> = {
  add: "main",
  "venue-main": "main",
  "venue-content": "content",
  "venue-media": "media",
  "venue-premium": "premium",
};

const WORKSPACE_COPY: Partial<Record<AdminSection, { title: string; description: string }>> = {
  add: {
    title: "Новое заведение",
    description: "Создайте карточку, укажите адрес и расписание. Остальные разделы станут доступны после первого сохранения.",
  },
  "venue-main": {
    title: "Основные данные",
    description: "Название, категория, статус публикации, логотип, адрес и режим работы.",
  },
  "venue-content": {
    title: "Контент карточки",
    description: "Описание, контакты и теги, которые видит пользователь.",
  },
  "venue-media": {
    title: "Фото",
    description: "Галерея, порядок изображений и отдельные миниатюры.",
  },
  "venue-premium": {
    title: "Premium-оформление",
    description: "Предпросмотр и визуальные настройки premium-карточки.",
  },
  "venue-events": {
    title: "События карточки",
    description: "Мероприятия, привязанные к выбранному заведению.",
  },
  "venue-audit": {
    title: "Аудит карточки",
    description: "Просмотры, действия, реакции, конверсия и качество заполнения.",
  },
};

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
  galleryThumbnails: {},
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
      ctaTextColor: "#05070a",
      vibeTextColor: "#e5e7eb",
      vibeBackgroundColor: "#0b0f15",
      vibeBorderColor: "#c7a469",
      vibeGlowColor: "#c7a469",
      recommendationBorderColor: "#c7a469",
    },
    ctaAnimation: "none",
    vibeGlowEnabled: true,
    vibeGlowIntensity: 35,
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
  galleryThumbnails: venue.galleryThumbnails || {},
  tags: venue.tags || [],
  premiumConfig: {
    premiumActive: venue.premiumConfig?.premiumActive || false,
    customColors: {
      primary: "#131923",
      accent: "#c7a469",
      glowColor: "#c7a469",
      tagColor: "#c7a469",
      ctaColor: "#c7a469",
      ctaTextColor: "#05070a",
      vibeTextColor: "#e5e7eb",
      vibeBackgroundColor: "#0b0f15",
      vibeBorderColor: "#c7a469",
      vibeGlowColor: "#c7a469",
      recommendationBorderColor: "#c7a469",
      ...(venue.premiumConfig?.customColors || {}),
    },
    ctaAnimation: venue.premiumConfig?.ctaAnimation || "none",
    vibeGlowEnabled: venue.premiumConfig?.vibeGlowEnabled ?? true,
    vibeGlowIntensity: venue.premiumConfig?.vibeGlowIntensity ?? 35,
    heroImage: venue.premiumConfig?.heroImage || "",
    moodBlock: venue.premiumConfig?.moodBlock || "",
    moodEmoji: venue.premiumConfig?.moodEmoji || "✨",
    topItems: normalizePremiumRecommendations(venue.premiumConfig?.topItems || venue.premiumConfig?.featuredDrinks || []),
    featuredDrinks: normalizePremiumRecommendations(venue.premiumConfig?.featuredDrinks || venue.premiumConfig?.topItems || []),
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
  feedback,
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
  const [uploadingTarget, setUploadingTarget] = useState<"gallery" | "gallery-thumbnail" | "hero" | "event" | "logo" | null>(null);
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

  const selectedVenueEvents = events.filter((event) => event.venueId === editingVenue.id);

  const loadVenue = (venue: Venue) => {
    onSelectVenue(venue);
    setEditingVenue(normalizeVenueForEdit(venue));
    setSection("venue-main");
    setSaveError(null);
  };

  const startCreateVenue = () => {
    onSelectVenue(null);
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
        topItems: [...(prev.premiumConfig.topItems || []), { text: item, emoji: "✨" }],
        featuredDrinks: [...(prev.premiumConfig.topItems || []), { text: item, emoji: "✨" }],
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

  const uploadSelectedImages = async (files: FileList | File[] | null | undefined, target: "gallery" | "gallery-thumbnail" | "hero" | "event" | "logo", replaceUrl?: string) => {
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
        setEditingVenue((prev: any) => ({
          ...prev,
          gallery: [...prev.gallery, ...urls],
        }));
      } else if (target === "gallery-thumbnail") {
        if (!replaceUrl) throw new Error("Не найдено исходное фото для миниатюры");
        setEditingVenue((prev: any) => ({
          ...prev,
          galleryThumbnails: {
            ...(prev.galleryThumbnails || {}),
            [replaceUrl]: urls[0],
          },
        }));
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
    if (!editingVenue.name.trim()) {
      setSaveError("Укажите имя заведения.");
      return;
    }

    try {
      const schedule = normalizeSchedule(editingVenue.workingHoursSchedule);
      const savedVenue = await onSaveVenue({
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
      if (savedVenue) {
        onSelectVenue(savedVenue);
        setEditingVenue(normalizeVenueForEdit(savedVenue));
        setSection("venue-main");
      }
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

  const deleteCurrentVenue = async (id: string) => {
    await onDeleteVenue(id);
    onSelectVenue(null);
    setEditingVenue(createVenueDraft(pendingCoords));
    setSection("venues");
  };

  const activeEditorSection = VENUE_EDITOR_SECTIONS[section];
  const workspaceCopy = WORKSPACE_COPY[section];
  const isVenueWorkspace = Boolean(
    workspaceCopy && (activeEditorSection || section === "venue-events" || section === "venue-audit"),
  );

  const renderNavItems = (items: Array<{ id: AdminSection; icon: LucideIcon; label: string }>) => items.map(({ id, icon: Icon, label }) => (
    <Button
      key={id}
      type="button"
      variant="ghost"
      onClick={() => (id === "add" ? startCreateVenue() : setSection(id))}
      className={cn(
        "w-full justify-start gap-2 text-left text-muted-foreground",
        section === id && "bg-muted text-foreground",
      )}
    >
      <Icon data-icon="inline-start" />
      {label}
    </Button>
  ));

  return (
    <div id="workspace" className="min-h-full overflow-hidden rounded-xl border bg-card text-xs text-card-foreground sm:text-sm">
      <div className="grid min-h-full grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav className="border-b bg-muted/15 p-3 lg:sticky lg:top-0 lg:self-start lg:border-b-0 lg:border-r lg:p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex flex-col gap-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Обзор
              </div>
              {renderNavItems([
                { id: "dashboard", icon: LayoutDashboard, label: "Дашборд" },
                { id: "venues", icon: List, label: "Все заведения" },
                { id: "add", icon: Plus, label: "Добавить заведение" },
              ])}
            </div>

            {editingVenue.id && (
              <div className="flex min-w-0 flex-col gap-1">
                <div className="px-2 pb-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Выбранное заведение
                  </div>
                  <div className="mt-1 truncate text-xs font-semibold text-foreground" title={editingVenue.name}>
                    {editingVenue.name}
                  </div>
                </div>
                {renderNavItems([
                  { id: "venue-main", icon: Settings2, label: "Основное" },
                  { id: "venue-content", icon: FileText, label: "Контент" },
                  { id: "venue-media", icon: Image, label: "Фото" },
                  { id: "venue-premium", icon: Sparkles, label: "Premium" },
                  { id: "venue-events", icon: Calendar, label: "События карточки" },
                  { id: "venue-audit", icon: Activity, label: "Аудит карточки" },
                ])}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Работа с сервисом
              </div>
              {renderNavItems([
                { id: "users", icon: Users, label: "Пользователи" },
                { id: "suggestions", icon: MapPin, label: "Заявки" },
                { id: "feedback", icon: MessageSquare, label: "Обращения" },
                { id: "events", icon: Calendar, label: "Все события" },
              ])}
            </div>
          </div>
        </nav>

        <div className="min-w-0 p-3 sm:p-5">
          {section === "dashboard" && (
            <DashboardView dashboard={dashboard} analytics={analytics} venues={venues} />
          )}

          {section === "users" && <UsersView users={users} />}

          {section === "suggestions" && <SuggestionsView suggestions={suggestions} />}

          {section === "feedback" && <FeedbackView feedback={feedback} />}

          {section === "events" && (
            <EventsOverview events={events} venues={venues} onSelectVenue={loadVenue} />
          )}

          {section === "venues" && (
            <div className="rounded-xl border bg-background p-4 shadow-sm">
              <VenueList venues={venues} selectedVenue={selectedVenue} onSelectVenue={loadVenue} />
            </div>
          )}

          {isVenueWorkspace && workspaceCopy && (
            <VenueWorkspace
              editingVenue={editingVenue}
              title={workspaceCopy.title}
              description={workspaceCopy.description}
              saveError={saveError}
              saved={saved}
              showActions={Boolean(activeEditorSection)}
              onDeleteVenue={deleteCurrentVenue}
              saveVenue={saveVenue}
            >
              {activeEditorSection && (
                <VenueEditor
                  section={activeEditorSection}
                  editingVenue={editingVenue}
                  setEditingVenue={setEditingVenue}
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
                  events={selectedVenueEvents}
                />
              )}

              {section === "venue-events" && (
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

              {section === "venue-audit" && (
                <VenueAuditView
                  audit={selectedVenueAudit}
                  loading={selectedVenueAuditLoading}
                  venue={editingVenue}
                />
              )}
            </VenueWorkspace>
          )}
        </div>
      </div>
    </div>
  );
}
