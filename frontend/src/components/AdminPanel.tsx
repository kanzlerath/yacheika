import { useMemo, useState } from "react";
import type React from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  Calendar,
  Check,
  Eye,
  GripVertical,
  Image,
  LayoutDashboard,
  List,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import {
  AdminDashboard,
  AdminTelegramUser,
  AnalyticsEvent,
  Venue,
  VenueEvent,
  WeekdayKey,
  WorkingHoursSchedule,
} from "../types";
import {
  WEEKDAYS,
  buildWorkingHoursText,
  createEmptySchedule,
  normalizeSchedule,
  slugifyVenueName,
} from "../utils/venueAdmin";

interface AdminPanelProps {
  venues: Venue[];
  events: VenueEvent[];
  analytics: AnalyticsEvent[];
  dashboard: AdminDashboard | null;
  users: AdminTelegramUser[];
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

type AdminSection = "dashboard" | "venues" | "add" | "users" | "events";

const CATEGORIES = [
  "бар",
  "паб",
  "рюмочная",
  "клуб",
  "ресторан",
  "коктейльный бар",
  "винный бар",
  "крафтовый бар",
  "кальянная",
];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const createVenueDraft = (coords?: { lat: number; lng: number } | null) => ({
  id: "",
  name: "",
  slug: "",
  category: "бар",
  shortDescription: "",
  fullDescription: "",
  address: "",
  latitude: coords?.lat || 55.0302,
  longitude: coords?.lng || 82.9204,
  workingHours: "",
  workingHoursSchedule: createEmptySchedule(),
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
      primary: "#09090b",
      accent: "#c7a469",
      glowColor: "#c7a469",
    },
    heroImage: "",
    moodBlock: "",
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
  gallery: venue.gallery || [],
  tags: venue.tags || [],
  premiumConfig: {
    premiumActive: venue.premiumConfig?.premiumActive || false,
    customColors: venue.premiumConfig?.customColors || {
      primary: "#09090b",
      accent: "#c7a469",
      glowColor: "#c7a469",
    },
    heroImage: venue.premiumConfig?.heroImage || "",
    moodBlock: venue.premiumConfig?.moodBlock || "",
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
  const [pendingGalleryFile, setPendingGalleryFile] = useState<{ file: File; preview: string } | null>(null);
  const [pendingHeroFile, setPendingHeroFile] = useState<{ file: File; preview: string } | null>(null);
  const [pendingEventCover, setPendingEventCover] = useState<{ file: File; preview: string } | null>(null);
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

  const selectPendingFile = (
    file: File | undefined,
    setter: (value: { file: File; preview: string } | null) => void,
  ) => {
    setUploadError(null);
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Поддерживаются только JPG, PNG, WebP, GIF или AVIF.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadError("Размер изображения не должен превышать 8 МБ.");
      return;
    }
    setter({ file, preview: URL.createObjectURL(file) });
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || error.error || "Не удалось загрузить изображение");
    }
    const data = await res.json();
    return data.url as string;
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

  const uploadPendingGallery = async () => {
    if (!pendingGalleryFile) return;
    try {
      const url = await uploadFile(pendingGalleryFile.file);
      setEditingVenue((prev: any) => ({ ...prev, gallery: [...prev.gallery, url] }));
      setPendingGalleryFile(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось загрузить изображение");
    }
  };

  const uploadPendingHero = async () => {
    if (!pendingHeroFile) return;
    try {
      const url = await uploadFile(pendingHeroFile.file);
      setEditingVenue((prev: any) => ({
        ...prev,
        premiumConfig: { ...prev.premiumConfig, heroImage: url },
      }));
      setPendingHeroFile(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось загрузить изображение");
    }
  };

  const uploadPendingEventCover = async () => {
    if (!pendingEventCover) return;
    try {
      const url = await uploadFile(pendingEventCover.file);
      setNewEvent((prev) => ({ ...prev, coverImage: url }));
      setPendingEventCover(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось загрузить обложку");
    }
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
    setPendingEventCover(null);
  };

  return (
    <div id="admin-panel" className="admin-panel-minimal min-h-full border bg-neutral-950 p-3 sm:p-4 text-xs sm:text-sm">
      <div className="grid min-h-full grid-cols-1 gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="space-y-2 border-b border-neutral-900 pb-3 lg:border-b-0 lg:border-r lg:pr-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Админка</div>
              <div className="font-display text-sm font-semibold text-neutral-100">Управление</div>
            </div>
            <button type="button" onClick={startCreateVenue} className="admin-primary rounded-lg border px-2 py-1.5 text-[10px] font-semibold">
              <Plus className="inline h-3.5 w-3.5" /> Добавить
            </button>
          </div>

          {[
            ["dashboard", LayoutDashboard, "Дашборд"],
            ["venues", List, "Заведения"],
            ["add", Plus, "Добавить заведение"],
            ["users", Users, "Пользователи"],
            ["events", Calendar, "События"],
          ].map(([id, Icon, label]) => (
            <button
              key={id as string}
              type="button"
              onClick={() => (id === "add" ? startCreateVenue() : setSection(id as AdminSection))}
              className={`admin-tab flex w-full items-center gap-2 text-left ${section === id ? "admin-tab-active" : ""}`}
            >
              <Icon className="h-4 w-4" />
              {label as string}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {section === "dashboard" && (
            <DashboardView dashboard={dashboard} analytics={analytics} venues={venues} />
          )}

          {section === "users" && <UsersView users={users} />}

          {section === "events" && (
            <EventsOverview events={events} venues={venues} onSelectVenue={loadVenue} />
          )}

          {(section === "venues" || section === "add") && (
            <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
              <VenueList venues={venues} selectedVenue={selectedVenue} onSelectVenue={loadVenue} onCreate={startCreateVenue} />
              <div className="space-y-4">
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
                  pendingGalleryFile={pendingGalleryFile}
                  pendingHeroFile={pendingHeroFile}
                  selectPendingFile={selectPendingFile}
                  setPendingGalleryFile={setPendingGalleryFile}
                  setPendingHeroFile={setPendingHeroFile}
                  uploadPendingGallery={uploadPendingGallery}
                  uploadPendingHero={uploadPendingHero}
                  sensors={sensors}
                  handleGalleryDragEnd={handleGalleryDragEnd}
                  topItemInput={topItemInput}
                  setTopItemInput={setTopItemInput}
                  addTopItem={addTopItem}
                />

                <EventEditor
                  editingVenue={editingVenue}
                  events={selectedVenueEvents}
                  newEvent={newEvent}
                  setNewEvent={setNewEvent}
                  pendingEventCover={pendingEventCover}
                  setPendingEventCover={setPendingEventCover}
                  selectPendingFile={selectPendingFile}
                  uploadPendingEventCover={uploadPendingEventCover}
                  uploadError={uploadError}
                  onDeleteEvent={onDeleteEvent}
                  createEvent={createEvent}
                />

                {saveError && <div className="rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-rose-200">{saveError}</div>}

                <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-900 pt-3">
                  {editingVenue.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Удалить заведение?")) onDeleteVenue(editingVenue.id);
                      }}
                      className="admin-danger flex items-center gap-1.5 rounded-xl border px-4 py-2 font-semibold"
                    >
                      <Trash2 className="h-4 w-4" /> Удалить
                    </button>
                  )}
                  <button type="button" onClick={saveVenue} className="admin-primary flex items-center gap-1.5 rounded-xl border px-5 py-2 font-semibold">
                    {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saved ? "Сохранено" : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardView({ dashboard, analytics, venues }: { dashboard: AdminDashboard | null; analytics: AnalyticsEvent[]; venues: Venue[] }) {
  const totals = dashboard?.totals;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-neutral-100">Дашборд</h2>
        <p className="text-xs text-neutral-500">Сводка по аудитории, заведениям и действиям пользователей.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Пользователи" value={totals?.users ?? 0} note={`+${totals?.newUsers7d ?? 0} за 7 дней`} />
        <Metric label="Заведения" value={totals?.venues ?? venues.length} note={`${totals?.publishedVenues ?? 0} опубликовано`} />
        <Metric label="Действия за 24ч" value={totals?.analytics24h ?? 0} note={`${totals?.analytics7d ?? 0} за 7 дней`} />
        <Metric label="Реакции" value={totals?.reactions ?? 0} note={`${totals?.events ?? 0} событий`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminBlock title="Топ заведений за неделю">
          {(dashboard?.topVenues || []).length === 0 ? (
            <EmptyLine>Пока нет событий аналитики.</EmptyLine>
          ) : (
            <div className="space-y-2">
              {dashboard?.topVenues.map((venue) => (
                <div key={venue.venueId} className="venue-soft-panel flex items-center justify-between p-3">
                  <div className="font-semibold text-neutral-100">{venue.name}</div>
                  <div className="text-[10px] text-neutral-500">Открытия {venue.opens} · Маршруты {venue.routes} · Всего {venue.total}</div>
                </div>
              ))}
            </div>
          )}
        </AdminBlock>

        <AdminBlock title="Что проверить">
          {(dashboard?.incompleteVenues || []).length === 0 ? (
            <EmptyLine>Критичных пропусков не видно.</EmptyLine>
          ) : (
            <div className="space-y-2">
              {dashboard?.incompleteVenues.map((venue) => (
                <div key={venue.id} className="venue-soft-panel p-3">
                  <div className="font-semibold text-neutral-100">{venue.name}</div>
                  <div className="mt-1 text-[10px] text-neutral-500">{venue.issues.join(", ")}</div>
                </div>
              ))}
            </div>
          )}
        </AdminBlock>
      </div>

      <AdminBlock title="Последние действия">
        <ActivityFeed analytics={analytics} venues={venues} />
      </AdminBlock>
    </div>
  );
}

function VenueList({ venues, selectedVenue, onSelectVenue, onCreate }: { venues: Venue[]; selectedVenue: Venue | null; onSelectVenue: (venue: Venue) => void; onCreate: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-neutral-100">Заведения</h2>
        <button type="button" onClick={onCreate} className="admin-primary rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold">
          <Plus className="inline h-3.5 w-3.5" /> Новое
        </button>
      </div>
      <div className="max-h-[72vh] space-y-1.5 overflow-y-auto pr-1">
        {venues.map((venue) => (
          <button
            type="button"
            key={venue.id}
            onClick={() => onSelectVenue(venue)}
            className={`admin-list-item w-full rounded-lg border p-2 text-left ${selectedVenue?.id === venue.id ? "admin-list-item-active" : ""}`}
          >
            <div className="truncate font-semibold">{venue.name}</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
              <span>{venue.category}</span>
              <span>{venue.status}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function VenueEditor(props: any) {
  const {
    editingVenue,
    setEditingVenue,
    duplicateName,
    tagInput,
    setTagInput,
    addTag,
    updateVenueName,
    updateSchedule,
    pendingCoords,
    onToggleMobileMap,
    applyPendingCoords,
    uploadError,
    pendingGalleryFile,
    pendingHeroFile,
    selectPendingFile,
    setPendingGalleryFile,
    setPendingHeroFile,
    uploadPendingGallery,
    uploadPendingHero,
    sensors,
    handleGalleryDragEnd,
    topItemInput,
    setTopItemInput,
    addTopItem,
  } = props;

  const schedule = normalizeSchedule(editingVenue.workingHoursSchedule);

  return (
    <div className="space-y-4">
      <AdminBlock title={editingVenue.id ? "Редактирование заведения" : "Добавление заведения"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Имя">
            <input value={editingVenue.name} onChange={(event) => updateVenueName(event.target.value)} className="admin-input" placeholder="Например: Nobody Knows I Suppose" />
            {duplicateName && <div className="mt-1 text-[10px] text-rose-300">Такое имя уже есть.</div>}
          </Field>
          <Field label="Категория">
            <select value={editingVenue.category} onChange={(event) => setEditingVenue({ ...editingVenue, category: event.target.value })} className="admin-input">
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </Field>
          <Field label="Статус">
            <select value={editingVenue.status} onChange={(event) => setEditingVenue({ ...editingVenue, status: event.target.value })} className="admin-input">
              <option value="published">Опубликовано</option>
              <option value="draft">Черновик</option>
              <option value="hidden">Скрыто</option>
              <option value="archived">Архив</option>
            </select>
          </Field>
        </div>
      </AdminBlock>

      <AdminBlock title="Адрес и координаты">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Адрес">
            <input value={editingVenue.address} onChange={(event) => setEditingVenue({ ...editingVenue, address: event.target.value })} className="admin-input" placeholder="Например: ул. Ленина, 12" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Широта">
              <input type="number" value={editingVenue.latitude} onChange={(event) => setEditingVenue({ ...editingVenue, latitude: Number(event.target.value) })} className="admin-input" placeholder="55.030200" />
            </Field>
            <Field label="Долгота">
              <input type="number" value={editingVenue.longitude} onChange={(event) => setEditingVenue({ ...editingVenue, longitude: Number(event.target.value) })} className="admin-input" placeholder="82.920400" />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {onToggleMobileMap && (
            <button type="button" onClick={() => onToggleMobileMap(true)} className="settings-secondary-button rounded-lg border px-3 py-2 text-xs font-semibold">
              <MapPin className="inline h-3.5 w-3.5" /> Указать на карте
            </button>
          )}
          {pendingCoords && (
            <button type="button" onClick={applyPendingCoords} className="admin-primary rounded-lg border px-3 py-2 text-xs font-semibold">
              Применить {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
            </button>
          )}
        </div>
      </AdminBlock>

      <AdminBlock title="Расписание по дням">
        <div className="space-y-2">
          {WEEKDAYS.map((day) => {
            const interval = schedule[day.key]?.[0] || { from: "18:00", to: "02:00" };
            const closed = (schedule[day.key] || []).length === 0;
            return (
              <div key={day.key} className="grid grid-cols-[92px_1fr] items-center gap-2 rounded-lg border border-neutral-900 p-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <input type="checkbox" checked={!closed} onChange={(event) => updateSchedule(day.key, { closed: !event.target.checked })} />
                  {day.label}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" disabled={closed} value={interval.from} onChange={(event) => updateSchedule(day.key, { from: event.target.value })} className="admin-input" />
                  <input type="time" disabled={closed} value={interval.to} onChange={(event) => updateSchedule(day.key, { to: event.target.value })} className="admin-input" />
                </div>
              </div>
            );
          })}
          <Field label="Примечание">
            <input
              value={schedule.note || ""}
              onChange={(event) => {
                const next = { ...schedule, note: event.target.value };
                setEditingVenue({ ...editingVenue, workingHoursSchedule: next, workingHours: buildWorkingHoursText(next) });
              }}
              className="admin-input"
              placeholder="Например: кухня до 23:00"
            />
          </Field>
        </div>
      </AdminBlock>

      <AdminBlock title="Описание и контакты">
        <div className="space-y-3">
          <Field label="Короткое описание">
            <input value={editingVenue.shortDescription} onChange={(event) => setEditingVenue({ ...editingVenue, shortDescription: event.target.value })} className="admin-input" placeholder="Коротко: чем место отличается и кому подойдет" />
          </Field>
          <Field label="Полное описание">
            <textarea value={editingVenue.fullDescription} onChange={(event) => setEditingVenue({ ...editingVenue, fullDescription: event.target.value })} rows={4} className="admin-input" placeholder="Атмосфера, посадка, напитки, музыка, важные детали для гостя" />
          </Field>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["phone", "telegram", "instagram", "website"] as const).map((key) => (
              <Field key={key} label={key}>
                <input
                  value={editingVenue.contacts[key] || ""}
                  onChange={(event) => setEditingVenue({ ...editingVenue, contacts: { ...editingVenue.contacts, [key]: event.target.value } })}
                  className="admin-input"
                  placeholder={
                    key === "phone"
                      ? "+7 (999) 123-45-67"
                      : key === "telegram"
                      ? "bar_username без @"
                      : key === "instagram"
                      ? "instagram_username"
                      : "https://example.com"
                  }
                />
              </Field>
            ))}
          </div>
        </div>
      </AdminBlock>

      <AdminBlock title="Теги атмосферы">
        <div className="flex flex-wrap gap-2">
          {editingVenue.tags.map((tag: string) => (
            <button key={tag} type="button" onClick={() => setEditingVenue({ ...editingVenue, tags: editingVenue.tags.filter((item: string) => item !== tag) })} className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
              #{tag} ×
            </button>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={(event) => {
            const value = event.target.value;
            if (value.includes(",")) {
              value.split(",").forEach((part) => addTag(part));
            } else {
              setTagInput(value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          className="admin-input mt-3"
          placeholder="Введите тег и нажмите Enter или запятую"
        />
      </AdminBlock>

      <AdminBlock title="Галерея">
        {uploadError && <div className="mb-2 rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-rose-200">{uploadError}</div>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGalleryDragEnd}>
          <SortableContext items={editingVenue.gallery} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {editingVenue.gallery.map((url: string) => (
                <SortableImage
                  key={url}
                  url={url}
                  onDelete={() => setEditingVenue({ ...editingVenue, gallery: editingVenue.gallery.filter((item: string) => item !== url) })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <ImageUploadBox pending={pendingGalleryFile} onSelect={(file) => selectPendingFile(file, setPendingGalleryFile)} onUpload={uploadPendingGallery} onClear={() => setPendingGalleryFile(null)} label="Добавить фото" />
      </AdminBlock>

      <AdminBlock title="Premium">
        <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-neutral-200">
          <input
            type="checkbox"
            checked={editingVenue.premiumConfig.premiumActive}
            onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, premiumActive: event.target.checked } })}
          />
          Включить premium-оформление
        </label>
        {editingVenue.premiumConfig.premiumActive && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <ColorField label="Фон" value={editingVenue.premiumConfig.customColors.primary} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, primary: value } } })} />
              <ColorField label="Акцент" value={editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, accent: value } } })} />
              <ColorField label="Свечение" value={editingVenue.premiumConfig.customColors.glowColor} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, glowColor: value } } })} />
            </div>
            <Field label="Вайб дня">
              <input value={editingVenue.premiumConfig.moodBlock || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, moodBlock: event.target.value } })} className="admin-input" placeholder="Например: Сегодня винил и тихий свет до поздней ночи" />
            </Field>
            <TopItemsEditor editingVenue={editingVenue} setEditingVenue={setEditingVenue} input={topItemInput} setInput={setTopItemInput} addItem={addTopItem} />
            <ImageUploadBox
              pending={pendingHeroFile}
              existingUrl={editingVenue.premiumConfig.heroImage}
              onSelect={(file) => selectPendingFile(file, setPendingHeroFile)}
              onUpload={uploadPendingHero}
              onClear={() => setPendingHeroFile(null)}
              label="Главное изображение premium"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="CTA ссылка">
                <input value={editingVenue.premiumConfig.ctaUrl || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, ctaUrl: event.target.value } })} className="admin-input" placeholder="https://t.me/..." />
              </Field>
              <Field label="CTA текст">
                <input value={editingVenue.premiumConfig.ctaText || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, ctaText: event.target.value } })} className="admin-input" placeholder="Например: Забронировать стол" />
              </Field>
            </div>
          </div>
        )}
      </AdminBlock>
    </div>
  );
}

function EventEditor({ editingVenue, events, newEvent, setNewEvent, pendingEventCover, setPendingEventCover, selectPendingFile, uploadPendingEventCover, uploadError, onDeleteEvent, createEvent }: any) {
  if (!editingVenue.id) {
    return <AdminBlock title="События"><EmptyLine>Сначала сохраните заведение.</EmptyLine></AdminBlock>;
  }

  return (
    <AdminBlock title={`События: ${editingVenue.name}`}>
      <div className="mb-4 space-y-2">
        {events.length === 0 ? <EmptyLine>Событий пока нет.</EmptyLine> : events.map((event: VenueEvent) => (
          <div key={event.id} className="venue-soft-panel flex items-center justify-between gap-3 p-3">
            <div>
              <div className="font-semibold text-neutral-100">{event.title}</div>
              <div className="text-[10px] text-neutral-500">{event.date} · {event.time}</div>
            </div>
            <button type="button" onClick={() => onDeleteEvent(event.id)} className="admin-danger rounded-lg border p-2">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Название события">
          <input value={newEvent.title} onChange={(event) => setNewEvent({ ...newEvent, title: event.target.value })} className="admin-input" placeholder="Например: Vinyl Night / гостевой сет" />
        </Field>
        <Field label="Время">
          <input value={newEvent.time} onChange={(event) => setNewEvent({ ...newEvent, time: event.target.value })} className="admin-input" placeholder="21:00" />
        </Field>
        <Field label="Дата">
          <input type="date" value={newEvent.date} onChange={(event) => setNewEvent({ ...newEvent, date: event.target.value })} className="admin-input" />
        </Field>
      </div>
      <Field label="Описание">
        <textarea value={newEvent.description} onChange={(event) => setNewEvent({ ...newEvent, description: event.target.value })} rows={3} className="admin-input" placeholder="Коротко: что будет, кто играет, почему стоит прийти" />
      </Field>
      {uploadError && <div className="mb-2 rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-rose-200">{uploadError}</div>}
      <ImageUploadBox pending={pendingEventCover} existingUrl={newEvent.coverImage} onSelect={(file) => selectPendingFile(file, setPendingEventCover)} onUpload={uploadPendingEventCover} onClear={() => setPendingEventCover(null)} label="Обложка события" />
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={createEvent} className="admin-primary rounded-xl border px-4 py-2 font-semibold">
          <Plus className="inline h-4 w-4" /> Создать событие
        </button>
      </div>
    </AdminBlock>
  );
}

function UsersView({ users }: { users: AdminTelegramUser[] }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-neutral-100">Пользователи</h2>
      <div className="grid gap-2">
        {users.map((user) => (
          <div key={user.id} className="venue-soft-panel flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="truncate font-semibold text-neutral-100">{user.firstName} {user.lastName || ""}</div>
              <div className="truncate text-[10px] text-neutral-500">@{user.username || "без username"} · {user.telegramId}</div>
            </div>
            <div className="text-right text-[10px] text-neutral-500">
              <div>{user.reactionsCount} реакций</div>
              <div>{new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsOverview({ events, venues, onSelectVenue }: { events: VenueEvent[]; venues: Venue[]; onSelectVenue: (venue: Venue) => void }) {
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-neutral-100">События</h2>
      {events.map((event) => {
        const venue = venueById.get(event.venueId);
        return (
          <button key={event.id} type="button" onClick={() => venue && onSelectVenue(venue)} className="venue-soft-panel w-full p-3 text-left">
            <div className="font-semibold text-neutral-100">{event.title}</div>
            <div className="mt-1 text-[10px] text-neutral-500">{venue?.name || event.venueId} · {event.date} · {event.time}</div>
          </button>
        );
      })}
    </div>
  );
}

function TopItemsEditor({ editingVenue, setEditingVenue, input, setInput, addItem }: any) {
  const items = editingVenue.premiumConfig.topItems || [];
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">Топы</div>
      <div className="space-y-1.5">
        {items.map((item: string, index: number) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, topItems: next, featuredDrinks: next } });
              }}
              className="admin-input"
            />
            <button type="button" onClick={() => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, topItems: items.filter((_: string, i: number) => i !== index), featuredDrinks: items.filter((_: string, i: number) => i !== index) } })} className="admin-danger rounded-lg border p-2">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addItem()} className="admin-input" placeholder="Например: Домашний негрони" />
        <button type="button" onClick={addItem} className="admin-primary rounded-lg border px-3 font-semibold">Добавить</button>
      </div>
    </div>
  );
}

function ImageUploadBox({ pending, existingUrl, onSelect, onUpload, onClear, label }: any) {
  const preview = pending?.preview || existingUrl;
  return (
    <div className="mt-3 rounded-xl border border-neutral-900 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
        <Image className="h-3.5 w-3.5" /> {label}
      </div>
      {preview && <img src={preview} alt="" className="mb-3 h-36 w-full rounded-lg object-cover" />}
      <div className="flex flex-wrap gap-2">
        <label className="settings-secondary-button rounded-lg border px-3 py-2 text-xs font-semibold">
          Выбрать файл
          <input type="file" accept={IMAGE_ACCEPT_ATTRIBUTE} className="hidden" onChange={(event) => onSelect(event.target.files?.[0])} />
        </label>
        {pending && (
          <>
            <button type="button" onClick={onUpload} className="admin-primary rounded-lg border px-3 py-2 text-xs font-semibold">Загрузить</button>
            <button type="button" onClick={onClear} className="settings-secondary-button rounded-lg border px-3 py-2 text-xs font-semibold">Отмена</button>
          </>
        )}
      </div>
    </div>
  );
}

function SortableImage({ url, onDelete }: { key?: React.Key; url: string; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: url });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="relative aspect-video overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button type="button" {...attributes} {...listeners} className="absolute left-1 top-1 rounded bg-black/70 p-1 text-neutral-200">
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDelete} className="absolute right-1 top-1 rounded bg-black/70 p-1 text-rose-300">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="venue-soft-panel p-4">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-neutral-100">{value}</div>
      <div className="mt-1 text-[10px] text-neutral-500">{note}</div>
    </div>
  );
}

function ActivityFeed({ analytics, venues }: { analytics: AnalyticsEvent[]; venues: Venue[] }) {
  return (
    <div className="max-h-72 space-y-2 overflow-y-auto">
      {analytics.length === 0 ? <EmptyLine>Пока нет действий.</EmptyLine> : analytics.slice(0, 20).map((event) => (
        <div key={event.id} className="flex items-center justify-between border-b border-neutral-900 pb-2 text-[11px]">
          <span className="text-neutral-300">{event.eventType}</span>
          <span className="text-neutral-500">{venues.find((venue) => venue.id === event.venueId)?.name || event.venueId || "global"}</span>
          <span className="text-neutral-600">{new Date(event.timestamp).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

function AdminBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-neutral-900 pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-display text-sm font-semibold text-neutral-100">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { key?: React.Key; label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input type="color" value={isHex ? value : "#000000"} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 rounded border border-neutral-800 bg-neutral-950" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="admin-input font-mono" placeholder="#c7a469 или rgb(...)" />
      </div>
    </Field>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-neutral-900 p-4 text-center text-xs text-neutral-500">{children}</div>;
}
