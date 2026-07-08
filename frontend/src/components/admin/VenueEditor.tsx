import type React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Image, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { VenueEvent, WeekdayKey, WorkingHoursSchedule } from "../../types";
import { WEEKDAYS, buildWorkingHoursText, normalizeSchedule } from "../../utils/venueAdmin";
import { AdminBlock, AdminSelect, EmptyLine } from "./AdminShared";

const CATEGORIES = [
  "Бар",
  "Паб",
  "Кафе",
  "Рюмочная",
  "Коктейльный бар",
  "Винный бар",
  "Крафтовый бар",
  "Гастробар",
  "Кальянная",
  "Караоке",
  "Клуб",
  "Ресторан",
];

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");
const COMPRESSED_IMAGE_MAX_SIZE = 1800;
const COMPRESSED_IMAGE_QUALITY = 0.86;

export const compressImageFile = async (file: File) => {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, COMPRESSED_IMAGE_MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", COMPRESSED_IMAGE_QUALITY);
  });
  bitmap.close();
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
};

const formatPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
  const normalized = digits.startsWith("7") ? digits : `7${digits}`;
  const body = normalized.slice(1);
  const parts = [
    body.slice(0, 3),
    body.slice(3, 6),
    body.slice(6, 8),
    body.slice(8, 10),
  ].filter(Boolean);
  if (!parts.length) return "+7 ";
  return `+7 (${parts[0]}${parts[0].length === 3 ? ")" : ""}${parts[1] ? ` ${parts[1]}` : ""}${parts[2] ? `-${parts[2]}` : ""}${parts[3] ? `-${parts[3]}` : ""}`;
};

export function VenueEditor(props: any) {
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
    uploadingTarget,
    uploadSelectedImages,
    sensors,
    handleGalleryDragEnd,
    topItemInput,
    setTopItemInput,
    addTopItem,
  } = props;

  const schedule = normalizeSchedule(editingVenue.workingHoursSchedule);

  return (
    <Tabs defaultValue="main" className="w-full gap-3">
      <TabsList className="grid h-auto w-full grid-cols-2 md:max-w-xl md:grid-cols-4">
        <TabsTrigger value="main" className="min-h-9 text-xs">Основное</TabsTrigger>
        <TabsTrigger value="content" className="min-h-9 text-xs">Контент</TabsTrigger>
        <TabsTrigger value="media" className="min-h-9 text-xs">Фото</TabsTrigger>
        <TabsTrigger value="premium" className="min-h-9 text-xs">Premium</TabsTrigger>
      </TabsList>

      <TabsContent value="main" className="flex flex-col gap-4">
      <AdminBlock title={editingVenue.id ? "Редактирование заведения" : "Добавление заведения"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Имя">
            <Input value={editingVenue.name} onChange={(event) => updateVenueName(event.target.value)} className="admin-input" placeholder="Например: Nobody Knows I Suppose" />
            {duplicateName && <div className="mt-1 text-[10px] text-rose-300">Такое имя уже есть.</div>}
          </Field>
          <Field label="Категория">
            <AdminSelect value={editingVenue.category} onValueChange={(value) => setEditingVenue({ ...editingVenue, category: value })} options={CATEGORIES} />
          </Field>
          <Field label="Статус">
            <AdminSelect
              value={editingVenue.status}
              onValueChange={(value) => setEditingVenue({ ...editingVenue, status: value })}
              options={[
                { value: "published", label: "Опубликовано" },
                { value: "draft", label: "Черновик" },
                { value: "hidden", label: "Скрыто" },
                { value: "archived", label: "Архив" },
              ]}
            />
          </Field>
        </div>
      </AdminBlock>

      <AdminBlock title="Логотип заведения">
        <ImageUploadBox
          existingUrl={editingVenue.logoUrl}
          uploading={uploadingTarget === "logo"}
          onSelect={(files) => uploadSelectedImages(files, "logo")}
          label="Загрузить логотип"
          fit="contain"
        />
      </AdminBlock>

      <AdminBlock title="Адрес и координаты">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Адрес">
            <Input value={editingVenue.address} onChange={(event) => setEditingVenue({ ...editingVenue, address: event.target.value })} className="admin-input" placeholder="Например: ул. Ленина, 12" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Широта">
              <Input type="number" value={editingVenue.latitude} onChange={(event) => setEditingVenue({ ...editingVenue, latitude: Number(event.target.value) })} className="admin-input" placeholder="55.030200" />
            </Field>
            <Field label="Долгота">
              <Input type="number" value={editingVenue.longitude} onChange={(event) => setEditingVenue({ ...editingVenue, longitude: Number(event.target.value) })} className="admin-input" placeholder="82.920400" />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {onToggleMobileMap && (
            <Button type="button" variant="outline" onClick={() => onToggleMobileMap(true)} className="settings-secondary-button rounded-lg border px-3 py-2 text-xs font-semibold">
              <MapPin className="inline h-3.5 w-3.5" /> Указать на карте
            </Button>
          )}
          {pendingCoords && (
            <Button type="button" variant="outline" onClick={applyPendingCoords} className="admin-primary rounded-lg border px-3 py-2 text-xs font-semibold">
              Применить {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
            </Button>
          )}
        </div>
      </AdminBlock>

      <AdminBlock title="Расписание по дням">
        <div className="flex flex-col gap-2">
          {WEEKDAYS.map((day) => {
            const interval = schedule[day.key]?.[0] || { from: "18:00", to: "02:00" };
            const closed = (schedule[day.key] || []).length === 0;
            return (
              <div key={day.key} className="admin-time-row">
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Checkbox checked={!closed} onCheckedChange={(checked) => updateSchedule(day.key, { closed: !checked })} />
                  {day.label}
                </label>
                <div className="admin-time-inputs">
                  <Input type="time" disabled={closed} value={interval.from} onChange={(event) => updateSchedule(day.key, { from: event.target.value })} className="admin-input admin-native-date-input" />
                  <Input type="time" disabled={closed} value={interval.to} onChange={(event) => updateSchedule(day.key, { to: event.target.value })} className="admin-input admin-native-date-input" />
                </div>
              </div>
            );
          })}
          <Field label="Примечание">
            <Input
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

      </TabsContent>

      <TabsContent value="content" className="flex flex-col gap-4">
      <AdminBlock title="Описание и контакты">
        <div className="flex flex-col gap-3">
          <Field label="Короткое описание">
            <Input value={editingVenue.shortDescription} onChange={(event) => setEditingVenue({ ...editingVenue, shortDescription: event.target.value })} className="admin-input" placeholder="Коротко: чем место отличается и кому подойдет" />
          </Field>
          <Field label="Полное описание">
            <Textarea value={editingVenue.fullDescription} onChange={(event) => setEditingVenue({ ...editingVenue, fullDescription: event.target.value })} rows={4} className="admin-input" placeholder="Атмосфера, посадка, напитки, музыка, важные детали для гостя" />
          </Field>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["phone", "telegram", "instagram", "website"] as const).map((key) => (
              <Field key={key} label={key}>
                <Input
                  value={editingVenue.contacts[key] || ""}
                  onChange={(event) => setEditingVenue({
                    ...editingVenue,
                    contacts: {
                      ...editingVenue.contacts,
                      [key]: key === "phone" ? formatPhoneInput(event.target.value) : event.target.value,
                    },
                  })}
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
            <Button key={tag} type="button" variant="outline" size="xs" onClick={() => setEditingVenue({ ...editingVenue, tags: editingVenue.tags.filter((item: string) => item !== tag) })} className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
              {tag} ×
            </Button>
          ))}
        </div>
        <Input
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

      </TabsContent>

      <TabsContent value="media" className="flex flex-col gap-4">
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
        <ImageUploadBox
          multiple
          uploading={uploadingTarget === "gallery"}
          onSelect={(files) => uploadSelectedImages(files, "gallery")}
          label="Добавить фото"
        />
      </AdminBlock>

      </TabsContent>

      <TabsContent value="premium" className="flex flex-col gap-4">
      <AdminBlock title="Premium">
        <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-neutral-200">
          <Switch
            checked={editingVenue.premiumConfig.premiumActive}
            onCheckedChange={(checked) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, premiumActive: checked } })}
          />
          Включить premium-оформление
        </label>
        {editingVenue.premiumConfig.premiumActive && (
          <div className="flex flex-col gap-4">
            <div
              className="rounded-xl border bg-neutral-950/40 p-4"
              style={{
                borderColor: editingVenue.premiumConfig.customColors.accent,
                boxShadow: `0 0 24px color-mix(in srgb, ${editingVenue.premiumConfig.customColors.glowColor} 28%, transparent)`,
              }}
            >
              <div className="text-[10px] uppercase tracking-wider text-neutral-300">Превью premium-акцентов</div>
              <div className="mt-3 inline-flex rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: editingVenue.premiumConfig.customColors.accent, color: "#05070a" }}>
                CTA / активная кнопка
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ColorField label="Акцент" hint="Контуры, маркер и активные элементы." value={editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, accent: value } } })} />
              <ColorField label="Свечение" hint="Мягкая подсветка premium-карточки." value={editingVenue.premiumConfig.customColors.glowColor} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, glowColor: value } } })} />
              <ColorField label="Цвет тегов" hint="Фон и контур тегов в premium-карточке." value={editingVenue.premiumConfig.customColors.tagColor || editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, tagColor: value } } })} />
              <ColorField label="CTA" hint="Главная premium-кнопка в карточке." value={editingVenue.premiumConfig.customColors.ctaColor || editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, ctaColor: value } } })} />
            </div>
            <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)]">
              <Field label="Emoji">
                <Input value={editingVenue.premiumConfig.moodEmoji || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, moodEmoji: event.target.value } })} className="admin-input" placeholder="✨" maxLength={4} />
              </Field>
              <Field label="Вайб дня">
                <Input value={editingVenue.premiumConfig.moodBlock || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, moodBlock: event.target.value } })} className="admin-input" placeholder="Например: Сегодня винил и тихий свет до поздней ночи" />
              </Field>
            </div>
            <TopItemsEditor editingVenue={editingVenue} setEditingVenue={setEditingVenue} input={topItemInput} setInput={setTopItemInput} addItem={addTopItem} />
            <ImageUploadBox
              existingUrl={editingVenue.premiumConfig.heroImage}
              uploading={uploadingTarget === "hero"}
              onSelect={(files) => uploadSelectedImages(files, "hero")}
              label="Главное изображение premium"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="CTA ссылка">
                <Input value={editingVenue.premiumConfig.ctaUrl || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, ctaUrl: event.target.value } })} className="admin-input" placeholder="https://t.me/..." />
              </Field>
              <Field label="CTA текст">
                <Input value={editingVenue.premiumConfig.ctaText || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, ctaText: event.target.value } })} className="admin-input" placeholder="Например: Забронировать стол" />
              </Field>
            </div>
          </div>
        )}
      </AdminBlock>
      </TabsContent>
    </Tabs>
  );
}

export function EventEditor({ editingVenue, events, newEvent, setNewEvent, uploadError, uploadingTarget, uploadSelectedImages, onDeleteEvent, createEvent }: any) {
  if (!editingVenue.id) {
    return <AdminBlock title="События"><EmptyLine>Сначала сохраните заведение.</EmptyLine></AdminBlock>;
  }

  return (
    <AdminBlock title={`События: ${editingVenue.name}`}>
      <div className="mb-4 flex flex-col gap-2">
        {events.length === 0 ? <EmptyLine>Событий пока нет.</EmptyLine> : events.map((event: VenueEvent) => (
          <div key={event.id} className="venue-soft-panel flex items-center justify-between gap-3 p-3">
            <div>
              <div className="font-semibold text-neutral-100">{event.title}</div>
              <div className="text-[10px] text-neutral-500">{event.date} · {event.time}</div>
            </div>
            <Button type="button" variant="outline" size="icon-sm" onClick={() => onDeleteEvent(event.id)} className="admin-danger rounded-lg border p-2">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="admin-date-grid">
        <Field label="Название события">
          <Input value={newEvent.title} onChange={(event) => setNewEvent({ ...newEvent, title: event.target.value })} className="admin-input" placeholder="Например: Vinyl Night / гостевой сет" />
        </Field>
        <Field label="Время">
          <Input value={newEvent.time} onChange={(event) => setNewEvent({ ...newEvent, time: event.target.value })} className="admin-input" placeholder="21:00" />
        </Field>
        <Field label="Дата">
          <Input type="date" value={newEvent.date} onChange={(event) => setNewEvent({ ...newEvent, date: event.target.value })} className="admin-input admin-native-date-input" />
        </Field>
      </div>
      <Field label="Описание">
        <Textarea value={newEvent.description} onChange={(event) => setNewEvent({ ...newEvent, description: event.target.value })} rows={3} className="admin-input" placeholder="Коротко: что будет, кто играет, почему стоит прийти" />
      </Field>
      {uploadError && <div className="mb-2 rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-rose-200">{uploadError}</div>}
      <ImageUploadBox
        existingUrl={newEvent.coverImage}
        uploading={uploadingTarget === "event"}
        onSelect={(files) => uploadSelectedImages(files, "event")}
        label="Обложка события"
      />
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="outline" onClick={createEvent} className="admin-primary rounded-xl border px-4 py-2 font-semibold">
          <Plus className="inline h-4 w-4" /> Создать событие
        </Button>
      </div>
    </AdminBlock>
  );
}

function TopItemsEditor({ editingVenue, setEditingVenue, input, setInput, addItem }: any) {
  const items = editingVenue.premiumConfig.topItems || [];
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">Рекомендуем</div>
      <div className="flex flex-col gap-1.5">
        {items.map((item: string, index: number) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, topItems: next, featuredDrinks: next } });
              }}
              className="admin-input"
            />
            <Button type="button" variant="outline" size="icon-sm" onClick={() => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, topItems: items.filter((_: string, i: number) => i !== index), featuredDrinks: items.filter((_: string, i: number) => i !== index) } })} className="admin-danger rounded-lg border p-2">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addItem()} className="admin-input" placeholder="Например: Домашний негрони" />
        <Button type="button" variant="outline" onClick={addItem} className="admin-primary rounded-lg border px-3 font-semibold">Добавить</Button>
      </div>
    </div>
  );
}

function ImageUploadBox({ existingUrl, onSelect, label, multiple = false, uploading = false, fit = "cover" }: any) {
  const preview = existingUrl;
  return (
    <div className="mt-3 rounded-xl border border-neutral-900 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
        <Image className="h-3.5 w-3.5" /> {label}
      </div>
      {preview && <img src={preview} alt="" className={`mb-3 h-36 w-full rounded-lg ${fit === "contain" ? "object-contain bg-neutral-950 p-3" : "object-cover"}`} />}
      <div className="flex flex-wrap gap-2">
        <label className="settings-secondary-button inline-flex min-h-9 items-center rounded-lg border px-3 py-2 text-xs font-semibold">
          {uploading ? "Загрузка..." : multiple ? "Выбрать файлы" : "Выбрать файл"}
          <input
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            multiple={multiple}
            disabled={uploading}
            className="hidden"
            onChange={(event) => {
              onSelect(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function SortableImage({ url, onDelete }: { key?: React.Key; url: string; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: url });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="relative aspect-video overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <Button type="button" variant="ghost" size="icon-sm" {...attributes} {...listeners} className="absolute left-1 top-1 rounded bg-black/70 p-2 text-neutral-200 touch-none active:scale-95" aria-label="Перетащить фото">
        <GripVertical className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} className="absolute right-1 top-1 rounded bg-black/70 p-1 text-rose-300">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Field({ label, children }: { key?: React.Key; label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (value: string) => void }) {
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input type="color" value={isHex ? value : "#000000"} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 rounded border border-neutral-800 bg-neutral-950 p-1" />
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="admin-input font-mono" placeholder="#c7a469 или rgb(...)" />
      </div>
      {hint && <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">{hint}</div>}
    </Field>
  );
}
