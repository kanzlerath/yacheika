import type React from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Crop, GripVertical, Image, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { VenueEvent, WeekdayKey, WorkingHoursSchedule } from "../../types";
import { normalizePremiumRecommendations } from "../../utils/premium";
import { WEEKDAYS, buildWorkingHoursText, normalizeSchedule } from "../../utils/venueAdmin";
import { AdminBlock, AdminSelect, EmptyLine } from "./AdminShared";
import VenueCard from "../VenueCard";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

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
type UploadTarget = "gallery" | "hero" | "event" | "logo";
type CropJob = {
  file: File;
  queue: File[];
  target: UploadTarget;
  aspect: number;
  title: string;
  imageUrl: string;
  replaceUrl?: string;
};

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

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new window.Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const cropImageFile = async (file: File, imageUrl: string, crop: Area) => {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", COMPRESSED_IMAGE_QUALITY);
  });
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "-cropped.webp"), { type: "image/webp" });
};

function useImageCropQueue(uploadSelectedImages: (files: FileList | File[] | null | undefined, target: UploadTarget, replaceUrl?: string) => Promise<void>) {
  const [cropJob, setCropJob] = useState<CropJob | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);

  useEffect(() => () => {
    if (cropJob) URL.revokeObjectURL(cropJob.imageUrl);
  }, [cropJob]);

  const startCropQueue = async (files: FileList | File[] | null | undefined, target: UploadTarget, aspect: number, title: string, replaceUrl?: string) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const [file, ...queue] = list;
    if (file.type === "image/gif") {
      await uploadSelectedImages([file], target);
      if (queue.length) await startCropQueue(queue, target, aspect, title);
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropJob({
      file,
      queue,
      target,
      aspect,
      title,
      imageUrl: URL.createObjectURL(file),
      replaceUrl,
    });
  };

  const startCropFromUrl = async (url: string, target: UploadTarget, aspect: number, title: string, replaceUrl?: string) => {
    const response = await fetch(`/api/storage/image?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error("Не удалось загрузить исходное изображение для обрезки");
    const blob = await response.blob();
    const extension = blob.type.split("/")[1] || "jpg";
    const file = new File([blob], `existing-image.${extension}`, { type: blob.type || "image/jpeg" });
    await startCropQueue([file], target, aspect, title, replaceUrl);
  };

  const closeCrop = () => {
    if (cropJob) URL.revokeObjectURL(cropJob.imageUrl);
    setCropJob(null);
    setCropping(false);
    setCroppedAreaPixels(null);
  };

  const confirmCrop = async () => {
    if (!cropJob || !croppedAreaPixels) return;
    const currentJob = cropJob;
    setCropping(true);
    try {
      const croppedFile = await cropImageFile(currentJob.file, currentJob.imageUrl, croppedAreaPixels);
      closeCrop();
      await uploadSelectedImages([croppedFile], currentJob.target, currentJob.replaceUrl);
      if (currentJob.queue.length) {
        await startCropQueue(currentJob.queue, currentJob.target, currentJob.aspect, currentJob.title);
      }
    } finally {
      setCropping(false);
    }
  };

  return {
    startCropQueue,
    startCropFromUrl,
    cropDialogProps: {
      job: cropJob,
      crop,
      zoom,
      cropping,
      onCropChange: setCrop,
      onZoomChange: setZoom,
      onCropComplete: (_: Area, pixels: Area) => setCroppedAreaPixels(pixels),
      onCancel: closeCrop,
      onConfirm: confirmCrop,
    },
  };
}

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
    events = [],
  } = props;

  const schedule = normalizeSchedule(editingVenue.workingHoursSchedule);
  const { startCropQueue, startCropFromUrl, cropDialogProps } = useImageCropQueue(uploadSelectedImages);

  return (
    <>
    <Tabs defaultValue="main" className="w-full gap-4">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
        <TabsTrigger value="main" className="h-10 flex-none rounded-none px-4 text-xs">Основное</TabsTrigger>
        <TabsTrigger value="content" className="h-10 flex-none rounded-none px-4 text-xs">Контент</TabsTrigger>
        <TabsTrigger value="media" className="h-10 flex-none rounded-none px-4 text-xs">Фото</TabsTrigger>
        <TabsTrigger value="premium" className="h-10 flex-none rounded-none px-4 text-xs">Premium</TabsTrigger>
      </TabsList>

      <TabsContent value="main" className="flex flex-col gap-4">
      <AdminBlock title={editingVenue.id ? "Редактирование заведения" : "Добавление заведения"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Имя">
            <Input value={editingVenue.name} onChange={(event) => updateVenueName(event.target.value)} placeholder="Например: Nobody Knows I Suppose" />
            {duplicateName && <div className="mt-1 text-[10px] text-destructive">Такое имя уже есть.</div>}
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
          onSelect={(files) => startCropQueue(files, "logo", 1, "Обрезка логотипа")}
          onCropExisting={() => startCropFromUrl(editingVenue.logoUrl, "logo", 1, "Обрезка логотипа")}
          label="Загрузить логотип"
          fit="contain"
        />
      </AdminBlock>

      <AdminBlock title="Адрес и координаты">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Адрес">
            <Input value={editingVenue.address} onChange={(event) => setEditingVenue({ ...editingVenue, address: event.target.value })} placeholder="Например: ул. Ленина, 12" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Широта">
              <Input type="number" value={editingVenue.latitude} onChange={(event) => setEditingVenue({ ...editingVenue, latitude: Number(event.target.value) })} placeholder="55.030200" />
            </Field>
            <Field label="Долгота">
              <Input type="number" value={editingVenue.longitude} onChange={(event) => setEditingVenue({ ...editingVenue, longitude: Number(event.target.value) })} placeholder="82.920400" />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {onToggleMobileMap && (
            <Button type="button" variant="outline" onClick={() => onToggleMobileMap(true)} className="text-xs font-semibold">
              <MapPin className="inline h-3.5 w-3.5" /> Указать на карте
            </Button>
          )}
          {pendingCoords && (
            <Button type="button" variant="outline" onClick={applyPendingCoords} className="text-xs font-semibold">
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
              <div key={day.key} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Checkbox checked={!closed} onCheckedChange={(checked) => updateSchedule(day.key, { closed: !checked })} />
                  {day.label}
                </label>
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <Input type="time" disabled={closed} value={interval.from} onChange={(event) => updateSchedule(day.key, { from: event.target.value })} className="min-w-0" />
                  <Input type="time" disabled={closed} value={interval.to} onChange={(event) => updateSchedule(day.key, { to: event.target.value })} className="min-w-0" />
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
            <Input value={editingVenue.shortDescription} onChange={(event) => setEditingVenue({ ...editingVenue, shortDescription: event.target.value })} placeholder="Коротко: чем место отличается и кому подойдет" />
          </Field>
          <Field label="Полное описание">
            <Textarea value={editingVenue.fullDescription} onChange={(event) => setEditingVenue({ ...editingVenue, fullDescription: event.target.value })} rows={4} placeholder="Атмосфера, посадка, напитки, музыка, важные детали для гостя" />
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
            <Button key={tag} type="button" variant="outline" size="xs" onClick={() => setEditingVenue({ ...editingVenue, tags: editingVenue.tags.filter((item: string) => item !== tag) })} className="rounded-full">
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
          className="mt-3"
          placeholder="Введите тег и нажмите Enter или запятую"
        />
      </AdminBlock>

      </TabsContent>

      <TabsContent value="media" className="flex flex-col gap-4">
      <AdminBlock title="Галерея">
        {uploadError && <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">{uploadError}</div>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGalleryDragEnd}>
          <SortableContext items={editingVenue.gallery} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {editingVenue.gallery.map((url: string) => (
                <SortableImage
                  key={url}
                  url={url}
                  onDelete={() => setEditingVenue({ ...editingVenue, gallery: editingVenue.gallery.filter((item: string) => item !== url) })}
                  onCrop={() => startCropFromUrl(url, "gallery", 4 / 3, "Обрезка фото", url)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <ImageUploadBox
          multiple
          uploading={uploadingTarget === "gallery"}
          onSelect={(files) => startCropQueue(files, "gallery", 4 / 3, "Обрезка фото")}
          label="Добавить фото"
        />
      </AdminBlock>

      </TabsContent>

      <TabsContent value="premium" className="flex flex-col gap-4">
      <AdminBlock title="Premium">
        <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
          <Switch
            checked={editingVenue.premiumConfig.premiumActive}
            onCheckedChange={(checked) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, premiumActive: checked } })}
          />
          Включить premium-оформление
        </label>
        {editingVenue.premiumConfig.premiumActive && (
          <div className="flex flex-col gap-4">
            <div className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-xl border bg-black">
              <VenueCard
                venue={editingVenue}
                userReactions={[]}
                vEvents={events}
                onReact={() => undefined}
                onEventAttendance={() => undefined}
                previewMode
              />
            </div>

            <Accordion type="multiple" defaultValue={["cta"]} className="flex flex-col gap-2">
            <PremiumAccordionSection value="cta" title="CTA-кнопка">
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorField label="Фон кнопки" hint="Основной цвет CTA." value={editingVenue.premiumConfig.customColors.ctaColor || editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, ctaColor: value } } })} />
                <ColorField label="Цвет текста" hint="Цвет надписи на CTA." value={editingVenue.premiumConfig.customColors.ctaTextColor || "#05070a"} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, ctaTextColor: value } } })} />
                <Field label="Текст кнопки">
                  <Input value={editingVenue.premiumConfig.ctaText || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, ctaText: event.target.value } })} placeholder="Например: Забронировать стол" />
                </Field>
                <Field label="Анимация">
                  <AdminSelect
                    value={editingVenue.premiumConfig.ctaAnimation || "none"}
                    onValueChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, ctaAnimation: value } })}
                    options={[
                      { value: "none", label: "Без анимации" },
                      { value: "breathe", label: "Мягко пульсирует" },
                      { value: "shimmer", label: "Блик" },
                      { value: "nudge", label: "Подрагивает" },
                    ]}
                  />
                </Field>
                <Field label="Ссылка">
                  <Input value={editingVenue.premiumConfig.ctaUrl || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, ctaUrl: event.target.value } })} placeholder="https://t.me/..." />
                </Field>
              </div>
            </PremiumAccordionSection>

            <PremiumAccordionSection value="vibe" title="Вайб дня">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Emoji">
                  <EmojiPickerPopover
                    value={editingVenue.premiumConfig.moodEmoji || "✨"}
                    onChange={(emoji) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, moodEmoji: emoji } })}
                  />
                </Field>
                <Field label="Надпись">
                  <Input value={editingVenue.premiumConfig.moodBlock || ""} onChange={(event) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, moodBlock: event.target.value } })} placeholder="Например: Сегодня винил и тихий свет" />
                </Field>
                <ColorField label="Цвет текста" hint="Надпись внутри блока." value={editingVenue.premiumConfig.customColors.vibeTextColor || "#e5e7eb"} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, vibeTextColor: value } } })} />
                <ColorField label="Цвет фона" hint="Фон блока вайба." value={editingVenue.premiumConfig.customColors.vibeBackgroundColor || "#0b0f15"} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, vibeBackgroundColor: value } } })} />
                <ColorField label="Цвет обводки" hint="Контур блока вайба." value={editingVenue.premiumConfig.customColors.vibeBorderColor || editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, vibeBorderColor: value } } })} />
                <ColorField label="Цвет свечения" hint="Цвет внешнего свечения." value={editingVenue.premiumConfig.customColors.vibeGlowColor || editingVenue.premiumConfig.customColors.glowColor} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, vibeGlowColor: value } } })} />
              </div>
              <div className="mt-3 flex flex-col gap-3 rounded-lg border p-3">
                <label className="flex items-center justify-between gap-3 text-xs font-semibold">
                  Свечение
                  <Switch checked={editingVenue.premiumConfig.vibeGlowEnabled ?? true} onCheckedChange={(checked) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, vibeGlowEnabled: checked } })} />
                </label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[editingVenue.premiumConfig.vibeGlowIntensity ?? 35]}
                    min={0}
                    max={100}
                    step={5}
                    disabled={editingVenue.premiumConfig.vibeGlowEnabled === false}
                    onValueChange={([value]) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, vibeGlowIntensity: value } })}
                    aria-label="Интенсивность свечения"
                  />
                  <span className="w-10 text-right font-mono text-xs text-muted-foreground">{editingVenue.premiumConfig.vibeGlowIntensity ?? 35}%</span>
                </div>
              </div>
            </PremiumAccordionSection>

            <PremiumAccordionSection value="recommendations" title="Теги и рекомендации">
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorField label="Цвет тегов" hint="Фон, текст и контур тегов." value={editingVenue.premiumConfig.customColors.tagColor || editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, tagColor: value } } })} />
                <ColorField label="Обводка рекомендаций" hint="Контур плашки с рекомендациями." value={editingVenue.premiumConfig.customColors.recommendationBorderColor || editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, recommendationBorderColor: value } } })} />
              </div>
              <div className="mt-3">
                <TopItemsEditor editingVenue={editingVenue} setEditingVenue={setEditingVenue} input={topItemInput} setInput={setTopItemInput} addItem={addTopItem} />
              </div>
            </PremiumAccordionSection>

            <PremiumAccordionSection value="marker" title="Маркер на карте">
              <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                <ColorField label="Цвет маркера" hint="Используется для точки заведения и её выделения на карте." value={editingVenue.premiumConfig.customColors.accent} onChange={(value) => setEditingVenue({ ...editingVenue, premiumConfig: { ...editingVenue.premiumConfig, customColors: { ...editingVenue.premiumConfig.customColors, accent: value } } })} />
                <div className="flex h-24 items-center justify-center rounded-lg border bg-muted/20">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `color-mix(in srgb, ${editingVenue.premiumConfig.customColors.accent} 22%, transparent)` }}
                  >
                    <div
                      className="size-5 rounded-full border-2 border-white shadow-lg"
                      style={{ backgroundColor: editingVenue.premiumConfig.customColors.accent }}
                    />
                  </div>
                </div>
              </div>
            </PremiumAccordionSection>

            <PremiumAccordionSection value="image" title="Главное изображение">
              <ImageUploadBox
                existingUrl={editingVenue.premiumConfig.heroImage}
                uploading={uploadingTarget === "hero"}
                onSelect={(files) => startCropQueue(files, "hero", 16 / 9, "Обрезка premium-изображения")}
                onCropExisting={() => startCropFromUrl(editingVenue.premiumConfig.heroImage, "hero", 16 / 9, "Обрезка premium-изображения")}
                label="Главное изображение premium"
              />
            </PremiumAccordionSection>
            </Accordion>
          </div>
        )}
      </AdminBlock>
      </TabsContent>
    </Tabs>
    <ImageCropDialog {...cropDialogProps} />
    </>
  );
}

export function EventEditor({ editingVenue, events, newEvent, setNewEvent, uploadError, uploadingTarget, uploadSelectedImages, onDeleteEvent, createEvent }: any) {
  const { startCropQueue, startCropFromUrl, cropDialogProps } = useImageCropQueue(uploadSelectedImages);

  if (!editingVenue.id) {
    return <AdminBlock title="События"><EmptyLine>Сначала сохраните заведение.</EmptyLine></AdminBlock>;
  }

  return (
    <>
    <AdminBlock title={`События: ${editingVenue.name}`}>
      <div className="mb-4 flex flex-col gap-2">
        {events.length === 0 ? <EmptyLine>Событий пока нет.</EmptyLine> : events.map((event: VenueEvent) => (
          <Card key={event.id} size="sm">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="font-semibold text-foreground">{event.title}</div>
                <div className="text-[10px] text-muted-foreground">{event.date} · {event.time}</div>
              </div>
              <Button type="button" variant="destructive" size="icon-sm" onClick={() => onDeleteEvent(event.id)}>
                <Trash2 />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(120px,180px)_minmax(150px,220px)]">
        <Field label="Название события">
          <Input value={newEvent.title} onChange={(event) => setNewEvent({ ...newEvent, title: event.target.value })} placeholder="Например: Vinyl Night / гостевой сет" />
        </Field>
        <Field label="Время">
          <Input value={newEvent.time} onChange={(event) => setNewEvent({ ...newEvent, time: event.target.value })} placeholder="21:00" />
        </Field>
        <Field label="Дата">
          <Input type="date" value={newEvent.date} onChange={(event) => setNewEvent({ ...newEvent, date: event.target.value })} className="min-w-0" />
        </Field>
      </div>
      <Field label="Описание">
        <Textarea value={newEvent.description} onChange={(event) => setNewEvent({ ...newEvent, description: event.target.value })} rows={3} placeholder="Коротко: что будет, кто играет, почему стоит прийти" />
      </Field>
      {uploadError && <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">{uploadError}</div>}
      <ImageUploadBox
        existingUrl={newEvent.coverImage}
        uploading={uploadingTarget === "event"}
        onSelect={(files) => startCropQueue(files, "event", 16 / 9, "Обрезка обложки события")}
        onCropExisting={() => startCropFromUrl(newEvent.coverImage, "event", 16 / 9, "Обрезка обложки события")}
        label="Обложка события"
      />
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="outline" onClick={createEvent} >
          <Plus data-icon="inline-start" /> Создать событие
        </Button>
      </div>
    </AdminBlock>
    <ImageCropDialog {...cropDialogProps} />
    </>
  );
}

function TopItemsEditor({ editingVenue, setEditingVenue, input, setInput, addItem }: any) {
  const items = normalizePremiumRecommendations(editingVenue.premiumConfig.topItems || []);
  const updateItems = (next: Array<{ text: string; emoji: string }>) => {
    setEditingVenue({
      ...editingVenue,
      premiumConfig: {
        ...editingVenue.premiumConfig,
        topItems: next,
        featuredDrinks: next,
      },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Рекомендуем</div>
      <div className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <div key={`${item.text}-${index}`} className="flex items-center gap-2">
            <EmojiPickerPopover
              value={item.emoji}
              onChange={(emoji) => {
                const next = [...items];
                next[index] = { ...item, emoji };
                updateItems(next);
              }}
            />
            <Input
              value={item.text}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...item, text: event.target.value };
                updateItems(next);
              }}
            />
            <Button type="button" variant="destructive" size="icon-sm" onClick={() => updateItems(items.filter((_, i) => i !== index))}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addItem()} placeholder="Например: Домашний негрони" />
        <Button type="button" variant="outline" onClick={addItem}>Добавить</Button>
      </div>
    </div>
  );
}

function EmojiPickerPopover({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectEmoji = (data: EmojiClickData) => {
    onChange(data.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Выбрать emoji">
          <span className="text-base">{value || "✨"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Suspense fallback={<div className="flex h-[420px] w-[320px] items-center justify-center text-xs text-muted-foreground">Загружаю emoji...</div>}>
          <EmojiPicker
            onEmojiClick={selectEmoji}
            width={320}
            height={420}
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
            searchPlaceHolder="Найти emoji"
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}

function PremiumAccordionSection({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-lg border bg-card px-4 last:border-b">
      <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

function ImageUploadBox({ existingUrl, onSelect, onCropExisting, label, multiple = false, uploading = false, fit = "cover" }: any) {
  const preview = existingUrl;
  return (
    <div className="mt-3 rounded-xl border p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Image className="size-3.5" /> {label}
      </div>
      {preview && <img src={preview} alt="" className={`mb-3 h-36 w-full rounded-lg ${fit === "contain" ? "object-contain bg-muted p-3" : "object-cover"}`} />}
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-muted">
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
        {preview && onCropExisting && (
          <Button type="button" variant="outline" size="sm" onClick={() => void onCropExisting()} disabled={uploading}>
            <Crop data-icon="inline-start" />
            Обрезать текущую
          </Button>
        )}
      </div>
    </div>
  );
}

function ImageCropDialog({
  job,
  crop,
  zoom,
  cropping,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onCancel,
  onConfirm,
}: {
  job: CropJob | null;
  crop: { x: number; y: number };
  zoom: number;
  cropping: boolean;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(job)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!cropping}>
        <DialogHeader>
          <DialogTitle>{job?.title || "Обрезка изображения"}</DialogTitle>
          <DialogDescription>
            Подвиньте изображение и настройте масштаб перед загрузкой.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[360px] overflow-hidden rounded-xl border border-border bg-black">
          {job && (
            <Cropper
              image={job.imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={job.aspect}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropComplete}
              showGrid={false}
            />
          )}
        </div>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Масштаб
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            className="w-full accent-[var(--primary)]"
          />
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={cropping}>
            Отмена
          </Button>
          <Button type="button" onClick={onConfirm} disabled={cropping}>
            {cropping ? "Готовлю..." : "Обрезать и загрузить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableImage({ url, onDelete, onCrop }: { key?: React.Key; url: string; onDelete: () => void; onCrop: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: url });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="relative aspect-video overflow-hidden rounded-lg border bg-muted shadow-sm">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <Button type="button" variant="secondary" size="icon-sm" {...attributes} {...listeners} className="absolute left-1 top-1 touch-none active:scale-95" aria-label="Перетащить фото">
        <GripVertical />
      </Button>
      <Button type="button" variant="destructive" size="icon-sm" onClick={onDelete} className="absolute right-1 top-1">
        <Trash2 />
      </Button>
      <Button type="button" variant="secondary" size="icon-sm" onClick={() => void onCrop()} className="absolute bottom-1 right-1" aria-label="Обрезать фото">
        <Crop />
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
        <Input type="color" value={isHex ? value : "#000000"} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 rounded border bg-background p-1" />
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="font-mono" placeholder="#c7a469 или rgb(...)" />
      </div>
      {hint && <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{hint}</div>}
    </Field>
  );
}
