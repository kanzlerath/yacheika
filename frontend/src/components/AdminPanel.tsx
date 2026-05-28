/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  Save,
  Trash2,
  Plus,
  Compass,
  Sparkles,
  Layers,
  Calendar,
  Eye,
  Activity,
  UserCheck,
  MapPin,
  Check
} from "lucide-react";
import { Venue, VenueEvent, AnalyticsEvent } from "../types";

interface AdminPanelProps {
  venues: Venue[];
  events: VenueEvent[];
  analytics: AnalyticsEvent[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  onSaveVenue: (venue: any) => void;
  onDeleteVenue: (id: string) => void;
  onSaveEvent: (event: any) => void;
  onDeleteEvent: (id: string) => void;
  pendingCoords: { lat: number; lng: number } | null;
  setPendingCoords: (co: any) => void;
  onToggleMobileMap?: (show: boolean) => void;
}

const CATEGORIES = [
  "бар",
  "паб",
  "рюмочная",
  "клуб",
  "ресторан",
  "коктейльный бар",
  "винный бар",
  "крафтовый бар",
  "кальянная"
];

const PRESET_THEMES = [
  {
    id: "crimson-glow",
    title: "Crimson Club",
    primary: "#140a0c",
    accent: "#f43f5e",
    glowColor: "rgba(244, 63, 94, 0.45)"
  },
  {
    id: "emerald-vault",
    title: "Emerald Vault",
    primary: "#050b07",
    accent: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.45)"
  },
  {
    id: "violet-night",
    title: "Violet Velvet",
    primary: "#0a060d",
    accent: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.45)"
  },
  {
    id: "amber-smoke",
    title: "Amber Smoke",
    primary: "#0d0a07",
    accent: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.45)"
  }
];

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

export default function AdminPanel({
  venues,
  events,
  analytics,
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
  const [activeTab, setActiveTab] = useState<"venue" | "events" | "analytics">("venue");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mobileSubView, setMobileSubView] = useState<"list" | "editor">("list");

  // Phone formatting helper mask: +7 (XXX) XXX-XX-XX
  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, "");
    let digits = clean;
    if (digits.startsWith("7") || digits.startsWith("8")) {
      digits = digits.substring(1);
    }
    digits = digits.substring(0, 10);
    
    if (digits.length === 0) return "";
    
    let formatted = "+7 (";
    if (digits.length > 0) {
      formatted += digits.substring(0, Math.min(digits.length, 3));
    }
    if (digits.length >= 3) {
      formatted += ") ";
    }
    if (digits.length > 3) {
      formatted += digits.substring(3, Math.min(digits.length, 6));
    }
    if (digits.length >= 6) {
      formatted += "-";
    }
    if (digits.length > 6) {
      formatted += digits.substring(6, Math.min(digits.length, 8));
    }
    if (digits.length >= 8) {
      formatted += "-";
    }
    if (digits.length > 8) {
      formatted += digits.substring(8, 10);
    }
    return formatted;
  };

  const uploadFile = async (file: File): Promise<string> => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Поддерживаются только JPG, PNG, WebP, GIF или AVIF.");
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("Размер изображения не должен превышать 8 МБ.");
    }

    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to upload image');
    }
    const data = await res.json();
    return data.url;
  };

  const handleImageUpload = async (
    file: File | undefined,
    onUploaded: (url: string) => void,
    resetInput?: () => void,
  ) => {
    if (!file) return;

    setUploadError(null);

    try {
      const url = await uploadFile(file);
      onUploaded(url);
      resetInput?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить изображение.";
      setUploadError(message);
    }
  };

  const [editingVenue, setEditingVenue] = useState<any>({
    id: "",
    name: "",
    slug: "",
    category: "бар",
    shortDescription: "",
    fullDescription: "",
    address: "",
    latitude: 55.0302,
    longitude: 82.9204,
    workingHours: "Ежедневно с 18:00 до 02:00",
    contacts: {
      phone: "",
      telegram: "",
      instagram: "",
      vk: "",
      website: ""
    },
    gallery: [],
    tags: [],
    status: "published",
    premiumConfig: {
      premiumActive: false,
      premiumTheme: "crimson-glow",
      customColors: {
        primary: "#111",
        accent: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.4)"
      },
      heroImage: "",
      moodBlock: "",
      featuredDrinks: []
    }
  });

  const [newEvent, setNewEvent] = useState<any>({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: "21:00",
    coverImage: ""
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load selected venue into editor form
  const handleLoadVenue = (v: Venue) => {
    onSelectVenue(v);
    setMobileSubView("editor");
    setEditingVenue({
      ...v,
      contacts: {
        phone: v.contacts.phone || "",
        telegram: v.contacts.telegram || "",
        instagram: v.contacts.instagram || "",
        vk: v.contacts.vk || "",
        website: v.contacts.website || ""
      },
      premiumConfig: {
        premiumActive: v.premiumConfig?.premiumActive || false,
        premiumTheme: v.premiumConfig?.premiumTheme || "crimson-glow",
        customColors: v.premiumConfig?.customColors || {
          primary: "#111",
          accent: "#f43f5e",
          glowColor: "rgba(244, 63, 94, 0.4)"
        },
        heroImage: v.premiumConfig?.heroImage || "",
        moodBlock: v.premiumConfig?.moodBlock || "",
        featuredDrinks: v.premiumConfig?.featuredDrinks || []
      }
    });
  };

  const handleCreateNewVenueForm = () => {
    setMobileSubView("editor");
    setEditingVenue({
      id: "",
      name: "Новый Бар",
      slug: "new-bar",
      category: "бар",
      shortDescription: "Краткое душевное описание",
      fullDescription: "Полное атмосферное описание",
      address: "ул. Ленина, 12",
      latitude: pendingCoords?.lat || 55.0302,
      longitude: pendingCoords?.lng || 82.9204,
      workingHours: "Ежедневно с 18:00",
      contacts: {
        phone: "",
        telegram: "",
        instagram: "",
        vk: "",
        website: ""
      },
      gallery: [
        "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=800"
      ],
      tags: ["коктейли", "свидание"],
      status: "published",
      premiumConfig: {
        premiumActive: false,
        premiumTheme: "crimson-glow",
        customColors: {
          primary: "#140a0c",
          accent: "#f43f5e",
          glowColor: "rgba(244, 63, 94, 0.45)"
        },
        heroImage: "",
        moodBlock: "",
        featuredDrinks: []
      }
    });
  };

  // Set selected coords from map click
  const handleApplyCoords = () => {
    if (pendingCoords) {
      setEditingVenue((prev: any) => ({
        ...prev,
        latitude: Number(pendingCoords.lat.toFixed(6)),
        longitude: Number(pendingCoords.lng.toFixed(6))
      }));
      setPendingCoords(null);
    }
  };

  const applyThemePreset = (themeId: string) => {
    const pr = PRESET_THEMES.find((p) => p.id === themeId);
    if (!pr) return;

    setEditingVenue((prev: any) => ({
      ...prev,
      premiumConfig: {
        ...prev.premiumConfig,
        premiumTheme: themeId,
        customColors: {
          primary: pr.primary,
          accent: pr.accent,
          glowColor: pr.glowColor
        }
      }
    }));
  };

  const saveVenueForm = () => {
    onSaveVenue(editingVenue);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !editingVenue.id) return;
    onSaveEvent({
      ...newEvent,
      venueId: editingVenue.id
    });
    setNewEvent({
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      time: "21:00",
      coverImage: ""
    });
  };

  return (
    <div id="admin-panel" className="bg-neutral-950 p-4 rounded-2xl border border-neutral-900 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs sm:text-sm">
      
      {/* Sidebar List of Venues */}
      <div className={`lg:col-span-4 space-y-3 lg:border-r border-neutral-900/60 lg:pr-3 ${mobileSubView === "list" ? "block" : "hidden lg:block"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <Layers className="w-4 h-4 text-rose-500" />
            <span className="font-display font-bold text-sm tracking-tight">Редактор заведений</span>
          </div>
          <button
            onClick={handleCreateNewVenueForm}
            className="flex items-center gap-1 text-[10px] bg-white text-black py-1 px-2.5 rounded hover:bg-neutral-200 transition font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Создать
          </button>
        </div>

        {/* Venues sidebar slider list */}
        <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => handleLoadVenue(v)}
              className={`w-full text-left p-2 rounded-lg border flex items-center justify-between transition ${
                selectedVenue?.id === v.id
                  ? "bg-rose-950/20 text-rose-300 border-rose-900"
                  : "bg-neutral-900/50 text-neutral-400 border-neutral-900 hover:border-neutral-800"
              }`}
            >
              <div className="font-medium truncate pr-2 font-display">{v.name}</div>
              <div className="flex gap-1 shrink-0">
                <span className="text-[9px] uppercase font-mono bg-black px-1.5 py-0.2 rounded text-neutral-500">
                  {v.category}
                </span>
                {v.premiumConfig?.premiumActive && (
                  <span className="text-[9px] px-1 bg-amber-950 text-amber-500 rounded font-semibold font-display">P</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Dynamic coordinate picker capture button */}
        {pendingCoords && (
          <div className="p-3 bg-indigo-950/40 border border-indigo-900 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-1 text-indigo-300 font-semibold font-display">
              <MapPin className="w-4 h-4" /> Позиция выбрана!
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              Lat: {pendingCoords.lat.toFixed(5)}, Lng: {pendingCoords.lng.toFixed(5)}
            </div>
            <button
              onClick={handleApplyCoords}
              className="w-full select-none text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-1.5 rounded transition"
            >
              Перенести в анкету заведения
            </button>
          </div>
        )}

        {/* Live behavior monitor log stream */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Аналитика логов (События в реальном времени)</span>
          </div>
          <div className="bg-black/80 border border-neutral-900 rounded-xl p-3 h-[180px] overflow-y-auto scrollbar-none font-mono text-[10px] text-neutral-400 space-y-2 leading-relaxed">
            {analytics.length === 0 ? (
              <div className="text-neutral-600 italic">Ожидаем действий пользователей...</div>
            ) : (
              analytics.map((an) => {
                const timeStr = new Date(an.timestamp).toLocaleTimeString();
                return (
                  <div key={an.id} className="border-b border-neutral-950 pb-1 flex items-start gap-1">
                    <span className="text-neutral-600 shrink-0">[{timeStr}]</span>
                    <span className="text-emerald-500 shrink-0">{an.eventType.toUpperCase()}</span>
                    <span className="text-neutral-300 break-all">
                      {an.metadata?.action || "checked"}:{" "}
                      {venues.find((ve) => ve.id === an.venueId)?.name || an.venueId || "Global"}
                      {an.userId ? ` (by ${an.userId})` : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className={`lg:col-span-8 flex flex-col space-y-4 ${mobileSubView === "editor" ? "block" : "hidden lg:block"}`}>
        
        {/* Editor tab switches */}
        <div className="flex border-b border-neutral-900 pb-2 gap-3 text-xs font-display">
          <button
            onClick={() => setActiveTab("venue")}
            className={`pb-1 px-3 border-b-2 transition ${
              activeTab === "venue" ? "border-rose-500 text-white font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Параметры заведения
          </button>
          
          <button
            onClick={() => setActiveTab("events")}
            disabled={!editingVenue.id}
            className={`pb-1 px-3 border-b-2 transition disabled:opacity-30 disabled:pointer-events-none ${
              activeTab === "events" ? "border-rose-500 text-white font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Управление событиями ({events.filter(e => e.venueId === editingVenue.id).length})
          </button>
        </div>

        {activeTab === "venue" && (
          <div className="space-y-4 max-h-[580px] overflow-y-auto pr-2">
            
            {/* Back Button on Mobile */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileSubView("list")}
                className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer select-none mb-2"
              >
                ← Назад к списку заведений
              </button>
            </div>
            
            {/* Main info row */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Название</label>
                <input
                  type="text"
                  value={editingVenue.name}
                  onChange={(e) => setEditingVenue({ ...editingVenue, name: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Категория</label>
                <select
                  value={editingVenue.category}
                  onChange={(e) => setEditingVenue({ ...editingVenue, category: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Slug в URL</label>
                <input
                  type="text"
                  value={editingVenue.slug}
                  onChange={(e) => setEditingVenue({ ...editingVenue, slug: e.target.value })}
                  placeholder="friends-bar"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Широта (Latitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={editingVenue.latitude}
                  onChange={(e) => setEditingVenue({ ...editingVenue, latitude: Number(e.target.value) })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Долгота (Longitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={editingVenue.longitude}
                  onChange={(e) => setEditingVenue({ ...editingVenue, longitude: Number(e.target.value) })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800"
                />
              </div>
            </div>

            {onToggleMobileMap && (
              <div className="xl:hidden space-y-2">
                <button
                  type="button"
                  onClick={() => onToggleMobileMap(true)}
                  className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-500 w-full justify-center cursor-pointer select-none"
                >
                  <MapPin className="w-4 h-4" /> Указать на карте
                </button>
                
                {pendingCoords && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/60 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-1 text-rose-300 font-semibold font-display">
                      <MapPin className="w-4 h-4" /> Точка выбрана на карте!
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      Широта: {pendingCoords.lat.toFixed(6)}<br />
                      Долгота: {pendingCoords.lng.toFixed(6)}
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoords}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-1.5 rounded-lg transition cursor-pointer select-none"
                    >
                      Применить координаты
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Адрес</label>
                <input
                  type="text"
                  value={editingVenue.address}
                  onChange={(e) => setEditingVenue({ ...editingVenue, address: e.target.value })}
                  placeholder="ул. Потанинская, 3"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Часы работы</label>
                <input
                  type="text"
                  value={editingVenue.workingHours}
                  onChange={(e) => setEditingVenue({ ...editingVenue, workingHours: e.target.value })}
                  placeholder="Ежедневно с 18:00 до 03:00"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-neutral-500 uppercase">Краткое описание на карточку</label>
              <input
                type="text"
                value={editingVenue.shortDescription}
                onChange={(e) => setEditingVenue({ ...editingVenue, shortDescription: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-neutral-500 uppercase">Полный атмосферный обзор</label>
              <textarea
                value={editingVenue.fullDescription}
                onChange={(e) => setEditingVenue({ ...editingVenue, fullDescription: e.target.value })}
                rows={3}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none focus:border-rose-800 font-sans"
              />
            </div>

            {/* Contacts object links */}
            <div className="space-y-1 border-t border-neutral-900 pt-3">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest pb-1">Ссылки и контакты</div>
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Телефон (+7...)"
                  value={editingVenue.contacts.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setEditingVenue({
                      ...editingVenue,
                      contacts: { ...editingVenue.contacts, phone: formatted }
                    });
                  }}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none font-mono"
                />
                
                <input
                  type="text"
                  placeholder="Telegram handle"
                  value={editingVenue.contacts.telegram}
                  onChange={(e) => setEditingVenue({
                    ...editingVenue,
                    contacts: { ...editingVenue.contacts, telegram: e.target.value }
                  })}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none"
                />

                <input
                  type="text"
                  placeholder="Instagram handle"
                  value={editingVenue.contacts.instagram}
                  onChange={(e) => setEditingVenue({
                    ...editingVenue,
                    contacts: { ...editingVenue.contacts, instagram: e.target.value }
                  })}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none"
                />
              </div>
            </div>

            {/* Tags and Status settings */}
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Теги атмосферы (Через запятую)</label>
                <input
                  type="text"
                  value={editingVenue.tags.join(", ")}
                  onChange={(e) => setEditingVenue({
                    ...editingVenue,
                    tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                  })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Статус заведения</label>
                <select
                  value={editingVenue.status}
                  onChange={(e) => setEditingVenue({ ...editingVenue, status: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none"
                >
                  <option value="draft">Черновик (Draft)</option>
                  <option value="published">Опубликовано (Published)</option>
                  <option value="hidden">Скрыто (Hidden)</option>
                  <option value="archived">В архиве (Archived)</option>
                </select>
              </div>
            </div>

            {/* Gallery images with upload capability */}
            <div className="space-y-1 border-t border-neutral-900 pt-3">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block pb-1">Галерея заведения</label>
              {uploadError && (
                <div className="rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-[11px] text-rose-200">
                  {uploadError}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {editingVenue.gallery?.map((imgUrl: string, idx: number) => (
                  <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900">
                    <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                    <button
                      type="button"
                      onClick={() => {
                        const nextGallery = [...editingVenue.gallery];
                        nextGallery.splice(idx, 1);
                        setEditingVenue({ ...editingVenue, gallery: nextGallery });
                      }}
                      className="absolute top-1 right-1 bg-black/80 hover:bg-rose-900 p-1 rounded-full text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <label className="aspect-video rounded-lg border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 flex flex-col items-center justify-center text-neutral-500 hover:text-neutral-300 cursor-pointer transition select-none">
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-semibold">Добавить фото</span>
                  <input
                    type="file"
                    accept={IMAGE_ACCEPT_ATTRIBUTE}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      await handleImageUpload(
                        file,
                        (url) => {
                          setEditingVenue((prev: any) => ({
                            ...prev,
                            gallery: [...(prev.gallery || []), url]
                          }));
                        },
                        () => {
                          e.target.value = "";
                        },
                      );
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Premium visual settings toggle box */}
            <div className="border-t border-neutral-900 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> Premium оформление карточки
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingVenue.premiumConfig.premiumActive}
                    onChange={(e) => setEditingVenue({
                      ...editingVenue,
                      premiumConfig: { ...editingVenue.premiumConfig, premiumActive: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 relative bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:width-4 after:w-4 after:transition-all peer-checked:bg-amber-600 peer-checked:after:bg-white border border-neutral-700"></div>
                  <span className="ml-2 text-xs text-neutral-300 font-medium">Включить Premium</span>
                </label>
              </div>

              {editingVenue.premiumConfig.premiumActive && (
                <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-xl space-y-3.5 animate-fadeIn">
                  
                  {/* Presets Themes select line */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase">Готовые темы дизайна</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRESET_THEMES.map((theme) => {
                        const active = editingVenue.premiumConfig.premiumTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => applyThemePreset(theme.id)}
                            className={`p-2 rounded-lg border text-center transition ${
                              active
                                ? "bg-neutral-900 border-white text-white"
                                : "bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full mx-auto mb-1 border" style={{ backgroundColor: theme.accent }} />
                            <div className="text-[9px] font-display font-medium leading-none">{theme.title}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Colored overrides outputs */}
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-neutral-500">Глубокий фон</span>
                      <input
                        type="text"
                        value={editingVenue.premiumConfig.customColors?.primary}
                        onChange={(e) => setEditingVenue({
                          ...editingVenue,
                          premiumConfig: {
                            ...editingVenue.premiumConfig,
                            customColors: { ...editingVenue.premiumConfig.customColors, primary: e.target.value }
                          }
                        })}
                        className="w-full bg-neutral-900 p-1.5 rounded border border-neutral-800 text-center text-white"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-neutral-500">Акцент свечения</span>
                      <input
                        type="text"
                        value={editingVenue.premiumConfig.customColors?.accent}
                        onChange={(e) => setEditingVenue({
                          ...editingVenue,
                          premiumConfig: {
                            ...editingVenue.premiumConfig,
                            customColors: { ...editingVenue.premiumConfig.customColors, accent: e.target.value }
                          }
                        })}
                        className="w-full bg-neutral-900 p-1.5 rounded border border-neutral-800 text-center text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-neutral-500">Glow RGBA суффикс</span>
                      <input
                        type="text"
                        value={editingVenue.premiumConfig.customColors?.glowColor}
                        onChange={(e) => setEditingVenue({
                          ...editingVenue,
                          premiumConfig: {
                            ...editingVenue.premiumConfig,
                            customColors: { ...editingVenue.premiumConfig.customColors, glowColor: e.target.value }
                          }
                        })}
                        className="w-full bg-neutral-900 p-1.5 rounded border border-neutral-800 text-center text-white"
                      />
                    </div>
                  </div>

                  {/* Mood banner text input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase">Сегодня тут вайб-оверлей (Mood block)</label>
                    <input
                      type="text"
                      placeholder="e.g. Сегодня техно биты с 22:00 от диджея"
                      value={editingVenue.premiumConfig.moodBlock || ""}
                      onChange={(e) => setEditingVenue({
                        ...editingVenue,
                        premiumConfig: { ...editingVenue.premiumConfig, moodBlock: e.target.value }
                      })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none"
                    />
                  </div>

                  {/* Featured drinks line commas */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase">Рекомендованные бокалы (Featured drinks, через запятую)</label>
                    <input
                      type="text"
                      placeholder="Penicillin, Tommy's Margarita, Basil Sour"
                      value={editingVenue.premiumConfig.featuredDrinks?.join(", ") || ""}
                      onChange={(e) => setEditingVenue({
                        ...editingVenue,
                        premiumConfig: {
                          ...editingVenue.premiumConfig,
                          featuredDrinks: e.target.value.split(",").map(d => d.trim()).filter(Boolean)
                        }
                      })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none"
                    />
                  </div>

                  {/* Premium Hero Image with upload */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase">Главное изображение Premium (Hero Image)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="URL или загрузите файл"
                        value={editingVenue.premiumConfig.heroImage || ""}
                        onChange={(e) => setEditingVenue({
                          ...editingVenue,
                          premiumConfig: { ...editingVenue.premiumConfig, heroImage: e.target.value }
                        })}
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white outline-none"
                      />
                      <label className="bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-neutral-200 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold flex items-center justify-center whitespace-nowrap">
                        Загрузить файл
                        <input
                          type="file"
                          accept={IMAGE_ACCEPT_ATTRIBUTE}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            await handleImageUpload(
                              file,
                              (url) => {
                                setEditingVenue((prev: any) => ({
                                  ...prev,
                                  premiumConfig: { ...prev.premiumConfig, heroImage: url }
                                }));
                              },
                              () => {
                                e.target.value = "";
                              },
                            );
                          }}
                        />
                      </label>
                    </div>
                    {uploadError && (
                      <div className="rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-[11px] text-rose-200">
                        {uploadError}
                      </div>
                    )}
                  </div>

                  {/* Premium customized visual CTA button links links */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase">Ссылка кнопки CTA</span>
                      <input
                        type="text"
                        placeholder="https://t.me/..."
                        value={editingVenue.premiumConfig.ctaUrl || ""}
                        onChange={(e) => setEditingVenue({
                          ...editingVenue,
                          premiumConfig: { ...editingVenue.premiumConfig, ctaUrl: e.target.value }
                        })}
                        className="w-full bg-neutral-900 p-2 rounded border border-neutral-800 text-white text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase">Текст Кнопки CTA</span>
                      <input
                        type="text"
                        placeholder="Купить билет"
                        value={editingVenue.premiumConfig.ctaText || ""}
                        onChange={(e) => setEditingVenue({
                          ...editingVenue,
                          premiumConfig: { ...editingVenue.premiumConfig, ctaText: e.target.value }
                        })}
                        className="w-full bg-neutral-900 p-2 rounded border border-neutral-800 text-white text-xs"
                      />
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Form Save triggers */}
            <div className="flex gap-2 justify-end border-t border-neutral-900 pt-4" id="form-save-div">
              {editingVenue.id && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Вы уверены, что хотите удалить заведение?")) {
                      onDeleteVenue(editingVenue.id);
                    }
                  }}
                  className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-semibold py-2 px-4 rounded-xl flex items-center gap-1.5 transition select-none"
                >
                  <Trash2 className="w-4 h-4" /> Удалить
                </button>
              )}

              <button
                type="button"
                onClick={saveVenueForm}
                className="bg-white text-black font-semibold py-2 px-5 rounded-xl flex items-center gap-1.5 hover:bg-neutral-200 transition select-none shadow-md"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" /> Сохранено
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Сохранить данные
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* Live Event CRUD for active editingVenue selection */}
        {activeTab === "events" && editingVenue.id && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="font-display font-bold text-xs sm:text-sm text-neutral-200">
              События в &quot;{editingVenue.name}&quot;
            </h3>

            {/* List active events */}
            <div className="space-y-2">
              {events.filter(e => e.venueId === editingVenue.id).length === 0 ? (
                <div className="text-neutral-500 italic py-4">Событий для этого заведения пока нет. Зарегистрируйте первое ниже!</div>
              ) : (
                <div className="grid gap-2">
                  {events
                    .filter((e) => e.venueId === editingVenue.id)
                    .map((e) => (
                      <div
                        key={e.id}
                        className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex justify-between items-center text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-white">{e.title}</div>
                          <div className="text-neutral-400 leading-normal">{e.description}</div>
                          <div className="text-[10px] font-mono text-neutral-500">
                            Дата: {e.date} | Время: {e.time}
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteEvent(e.id)}
                          className="p-2 bg-rose-950/20 text-rose-400 rounded-lg hover:bg-rose-950 transition shrink-0"
                          title="Удалить событие"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Create new event form block */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3.5">
              <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-semibold">
                <Calendar className="w-3.5 h-3.5" /> Добавить свежее событие сегодня
              </div>
              
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Заголовок события"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-white"
                />
                
                <input
                  type="text"
                  placeholder="Время проведения (e.g. 21:00)"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-white"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Обложка события</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="URL или загрузите файл"
                    value={newEvent.coverImage || ""}
                    onChange={(e) => setNewEvent({ ...newEvent, coverImage: e.target.value })}
                    className="flex-1 bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-white font-mono text-xs"
                  />
                  <label className="bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold flex items-center justify-center whitespace-nowrap">
                    Загрузить
                    <input
                      type="file"
                      accept={IMAGE_ACCEPT_ATTRIBUTE}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        await handleImageUpload(
                          file,
                          (url) => {
                            setNewEvent((prev: any) => ({ ...prev, coverImage: url }));
                          },
                          () => {
                            e.target.value = "";
                          },
                        );
                      }}
                    />
                  </label>
                </div>
                {uploadError && (
                  <div className="rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-[11px] text-rose-200">
                    {uploadError}
                  </div>
                )}
              </div>

              <textarea
                placeholder="Краткое интригующее описание программы события"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-white text-xs"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddEvent}
                  className="bg-white text-black font-semibold py-1.5 px-4 rounded-lg flex items-center gap-1.5 hover:bg-neutral-200 transition text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Создать событие
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
