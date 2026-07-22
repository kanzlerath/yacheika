/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Moon,
  Sun,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TelegramLoginWidget from "./TelegramLoginWidget";
import { MapStyle, TelegramAuthSession, VenueSuggestion } from "../types";
import { appEase, panelTransition, revealItem, revealList } from "../utils/motionPresets";
import { LEGAL_LINKS } from "../legalDocuments";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: TelegramAuthSession | null;
  onLogout: () => void;
  mapStyle: MapStyle;
  onChangeMapStyle: (style: MapStyle) => Promise<void>;
  locationEnabled: boolean;
  onChangeLocationEnabled: (enabled: boolean) => void;
  clusterMaxZoom: number;
  onChangeClusterMaxZoom: (value: number) => Promise<void>;
}

export default function SettingsModal({
  isOpen,
  onClose,
  auth,
  onLogout,
  mapStyle,
  onChangeMapStyle,
  locationEnabled,
  onChangeLocationEnabled,
  clusterMaxZoom,
  onChangeClusterMaxZoom,
}: SettingsModalProps) {
  const currentUser = auth?.user ?? null;
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    name: "",
    address: "",
    comment: "",
    contact: "",
  });
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestionUpdates, setSuggestionUpdates] = useState<VenueSuggestion[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    kind: "idea" as "idea" | "bug" | "other",
    message: "",
    contact: "",
  });
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [deleteAccountConfirmOpen, setDeleteAccountConfirmOpen] = useState(false);
  const [legalConsentAccepted, setLegalConsentAccepted] = useState(false);
  const [clusterZoomDraft, setClusterZoomDraft] = useState(clusterMaxZoom);

  const updateLegalConsent = (value: boolean) => {
    setLegalConsentAccepted(value);
  };

  useEffect(() => {
    if (isOpen && !auth) {
      setLegalConsentAccepted(false);
    }
  }, [auth, isOpen]);

  useEffect(() => {
    setClusterZoomDraft(clusterMaxZoom);
  }, [clusterMaxZoom]);

  const loadSuggestionUpdates = async () => {
    if (!auth) {
      setSuggestionUpdates([]);
      return;
    }

    try {
      const response = await fetch("/api/users/me/venue-suggestions");
      if (!response.ok) throw new Error("Failed to load suggestion updates");
      setSuggestionUpdates(await response.json());
    } catch (error) {
      // Updates are supplementary to the settings panel, so a transient
      // failure must not prevent the user from sending a new suggestion.
      console.error("Failed to load suggestion updates:", error);
    }
  };

  useEffect(() => {
    if (isOpen) void loadSuggestionUpdates();
  }, [auth?.user.id, isOpen]);

  const submitSuggestion = async () => {
    setSuggestionError(null);
    if (!auth) {
      setSuggestionError("Войдите, чтобы предложить заведение.");
      return;
    }
    if (!suggestionForm.name.trim() || !suggestionForm.address.trim()) {
      setSuggestionError("Укажите название и адрес.");
      return;
    }

    setSuggestionStatus("sending");
    try {
      const res = await fetch("/api/users/me/venue-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(suggestionForm),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Не удалось отправить заявку.");
      }
      setSuggestionStatus("sent");
      setSuggestionForm({ name: "", address: "", comment: "", contact: "" });
      void loadSuggestionUpdates();
    } catch (error) {
      setSuggestionStatus("error");
      setSuggestionError(error instanceof Error ? error.message : "Не удалось отправить заявку.");
    }
  };

  const commitClusterZoom = async (value: number) => {
    try {
      await onChangeClusterMaxZoom(value);
    } catch {
      setClusterZoomDraft(clusterMaxZoom);
    }
  };

  const submitFeedback = async () => {
    setFeedbackError(null);
    if (!auth) return;
    if (feedbackForm.message.trim().length < 3) {
      setFeedbackError("Опишите предложение или проблему чуть подробнее.");
      return;
    }

    setFeedbackStatus("sending");
    try {
      const res = await fetch("/api/users/me/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackForm),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Не удалось отправить сообщение.");
      }
      setFeedbackStatus("sent");
      setFeedbackForm({ kind: "idea", message: "", contact: "" });
    } catch (error) {
      setFeedbackStatus("error");
      setFeedbackError(error instanceof Error ? error.message : "Не удалось отправить сообщение.");
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="safe-modal-shell fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: appEase }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={panelTransition}
            className="safe-modal-content settings-surface relative z-10 max-h-full w-full max-w-md space-y-6 overflow-y-auto rounded-2xl border p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="settings-divider flex items-center justify-between pb-3 border-b">
              <div className="flex items-center">
                <h3 className="font-display text-base font-bold uppercase tracking-wider">
                  Настройки и Профиль
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={onClose}
                className="settings-icon-button rounded-full"
                aria-label="Закрыть настройки"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Profile Section */}
            <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Аккаунт
              </h4>

              {auth ? (
                /* Authenticated User info */
                <motion.div className="settings-card p-4 rounded-2xl border space-y-4" variants={revealItem}>
                  <div className="flex items-center gap-3">
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.firstName}
                        className="w-11 h-11 rounded-full border border-neutral-800 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-300 shrink-0">
                        {currentUser?.firstName?.slice(0, 1) || "T"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="settings-strong font-semibold text-sm truncate">
                        {currentUser?.firstName} {currentUser?.lastName || ""}
                      </div>
                      <div className="text-xs text-neutral-500 truncate">
                        @{currentUser?.username}
                      </div>
                    </div>
                  </div>

                  <div className="settings-divider flex items-center justify-between gap-3 border-t pt-3">
                    <div>
                      <div className="settings-strong text-xs font-semibold">Оформление</div>
                      <div className="mt-1 text-[11px] text-neutral-500">Тема интерфейса и карты</div>
                    </div>
                    <ToggleGroup
                      type="single"
                      value={mapStyle}
                      onValueChange={(value) => {
                        if (value === "dark" || value === "light") {
                          void onChangeMapStyle(value);
                        }
                      }}
                      variant="outline"
                      spacing={1}
                      aria-label="Тема интерфейса"
                    >
                      <ToggleGroupItem value="light" aria-label="Светлая тема" title="Светлая тема">
                        <Sun />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="dark" aria-label="Тёмная тема" title="Тёмная тема">
                        <Moon />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="settings-divider flex flex-col gap-3 border-t pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="settings-strong text-xs font-semibold">Группировка меток</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                          Объединять близкие места до масштаба {clusterZoomDraft}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-neutral-400">{clusterZoomDraft}</span>
                    </div>
                    <Slider
                      value={[clusterZoomDraft]}
                      min={8}
                      max={18}
                      step={1}
                      onValueChange={([value]) => setClusterZoomDraft(value)}
                      onValueCommit={([value]) => void commitClusterZoom(value)}
                      aria-label="Масштаб группировки меток"
                    />
                  </div>

                  {/* Actions for authenticated */}
                  <div className="settings-divider flex flex-col gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="settings-secondary-button w-full rounded-xl text-xs font-semibold"
                    >
                      <span>Выйти из аккаунта</span>
                    </Button>
                  </div>
                </motion.div>
              ) : (
                /* Unauthenticated Guest message & Telegram widget */
                <motion.div className="settings-card flex flex-col gap-4 rounded-2xl border p-4 text-center" variants={revealItem}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="settings-avatar flex size-8 items-center justify-center rounded-full border">
                      <User className="size-4.5" />
                    </div>
                    <p className="text-xs leading-normal px-2">
                  Вы просматриваете карту как гость. Войдите через Telegram или Яндекс ID, чтобы ставить лайки заведениям, сохранять подборки и оценивать атмосферу.
                    </p>
                  </div>

                  <div className="settings-divider pt-2 border-t flex justify-center">
                    <div className="flex w-full flex-col gap-3">
                      <label className="flex items-start gap-2 text-left text-[11px] leading-relaxed text-neutral-500">
                        <Checkbox
                          checked={legalConsentAccepted}
                          onCheckedChange={(value) => updateLegalConsent(value === true)}
                          className="mt-0.5 shrink-0"
                        />
                        <span>
                          Продолжая авторизацию, я принимаю{" "}
                          <a href="/terms" className="underline decoration-neutral-700 hover:text-neutral-200">Пользовательское соглашение</a>{" "}
                          и даю{" "}
                          <a href="/consent" className="underline decoration-neutral-700 hover:text-neutral-200">согласие на обработку персональных данных</a>{" "}
                          в соответствии с{" "}
                          <a href="/privacy" className="underline decoration-neutral-700 hover:text-neutral-200">Политикой обработки персональных данных</a>.
                        </span>
                      </label>
                      <TelegramLoginWidget disabled={!legalConsentAccepted} theme={mapStyle} />
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {auth && (
              <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Обращения
                </h4>
                <motion.div className="settings-card rounded-2xl border p-4 space-y-3" variants={revealItem}>
                  {suggestionUpdates.length > 0 && (
                    <div className="space-y-2" aria-live="polite">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        Новости по вашим заявкам
                      </div>
                      {suggestionUpdates.map((suggestion) => {
                        const accepted = suggestion.status === "converted";
                        return (
                          <div key={suggestion.id} className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2.5 text-xs leading-relaxed text-neutral-300">
                            <div className="font-semibold text-emerald-200">
                              {accepted ? "Заявка принята" : "Заявка рассматривается"}
                            </div>
                            <p className="mt-0.5">
                              {accepted
                                ? <>Спасибо за наводку: «{suggestion.name}» появится в каталоге после подготовки.</>
                                : <>Спасибо за наводку: «{suggestion.name}» уже взяли в работу.</>}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSuggestionOpen((value) => !value)}
                    className="settings-secondary-button w-full rounded-xl text-xs font-semibold"
                  >
                    Предложить заведение
                  </Button>

                  <AnimatePresence initial={false}>
                    {suggestionOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: appEase }}
                        className="space-y-2 overflow-hidden"
                      >
                        <Input
                          value={suggestionForm.name}
                          onChange={(event) => setSuggestionForm((prev) => ({ ...prev, name: event.target.value }))}
                          className="settings-form-input"
                          placeholder="Название: например, Весна"
                        />
                        <Input
                          value={suggestionForm.address}
                          onChange={(event) => setSuggestionForm((prev) => ({ ...prev, address: event.target.value }))}
                          className="settings-form-input"
                          placeholder="Адрес: ул. Ленина, 34"
                        />
                        <Textarea
                          value={suggestionForm.comment}
                          onChange={(event) => setSuggestionForm((prev) => ({ ...prev, comment: event.target.value }))}
                          className="settings-form-input min-h-20 resize-none"
                          placeholder="Что это за место и почему его стоит добавить"
                        />
                        <Input
                          value={suggestionForm.contact}
                          onChange={(event) => setSuggestionForm((prev) => ({ ...prev, contact: event.target.value }))}
                          className="settings-form-input"
                          placeholder="Контакт, если нужен ответ"
                        />
                        {suggestionError && <div className="text-[11px] text-rose-300">{suggestionError}</div>}
                        {suggestionStatus === "sent" && <div className="text-[11px] text-emerald-300">Заявка отправлена.</div>}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={submitSuggestion}
                          disabled={suggestionStatus === "sending"}
                          className="app-text-button w-full"
                        >
                          {suggestionStatus === "sending" ? "Отправляем..." : "Отправить"}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="settings-divider border-t" />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFeedbackOpen((value) => !value)}
                    className="settings-secondary-button w-full rounded-xl text-xs font-semibold"
                  >
                    Сообщить о проблеме или идее
                  </Button>

                  <AnimatePresence initial={false}>
                    {feedbackOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: appEase }}
                        className="space-y-2 overflow-hidden"
                      >
                        <ToggleGroup
                          type="single"
                          value={feedbackForm.kind}
                          onValueChange={(kind) => {
                            if (kind === "idea" || kind === "bug" || kind === "other") {
                              setFeedbackForm((prev) => ({ ...prev, kind }));
                            }
                          }}
                          variant="outline"
                          spacing={1}
                          className="flex w-full"
                          aria-label="Тип обращения"
                        >
                          <ToggleGroupItem value="idea" className="flex-1">Идея</ToggleGroupItem>
                          <ToggleGroupItem value="bug" className="flex-1">Ошибка</ToggleGroupItem>
                          <ToggleGroupItem value="other" className="flex-1">Другое</ToggleGroupItem>
                        </ToggleGroup>
                        <Textarea
                          value={feedbackForm.message}
                          onChange={(event) => setFeedbackForm((prev) => ({ ...prev, message: event.target.value }))}
                          className="settings-form-input min-h-24 resize-none"
                          placeholder="Опишите, что произошло или что хотелось бы улучшить"
                        />
                        <Input
                          value={feedbackForm.contact}
                          onChange={(event) => setFeedbackForm((prev) => ({ ...prev, contact: event.target.value }))}
                          className="settings-form-input"
                          placeholder="Контакт для ответа, если нужен"
                        />
                        {feedbackError && <div className="text-[11px] text-rose-300">{feedbackError}</div>}
                        {feedbackStatus === "sent" && <div className="text-[11px] text-emerald-300">Сообщение отправлено.</div>}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={submitFeedback}
                          disabled={feedbackStatus === "sending"}
                          className="app-text-button w-full"
                        >
                          {feedbackStatus === "sending" ? "Отправляем..." : "Отправить"}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}

            {/* Location Settings */}
            <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Карта
              </h4>

              <motion.div className="settings-card flex items-center justify-between p-4 rounded-2xl border" variants={revealItem}>
                <div className="space-y-0.5 pr-2">
                  <div className="settings-strong text-xs font-semibold">
                    <span>Использовать геопозицию</span>
                  </div>
                  <div className="text-[10px] leading-relaxed">
                    Показывает ваше положение на карте и позволяет быстро вернуться к нему.
                  </div>
                </div>

                <Switch
                  checked={locationEnabled}
                  onCheckedChange={onChangeLocationEnabled}
                  className={locationEnabled ? "settings-toggle-on" : "settings-toggle-off"}
                  aria-label="Использовать геопозицию"
                />
              </motion.div>
            </motion.div>

            <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Документы
              </h4>
              <motion.div className="settings-card rounded-2xl border p-4" variants={revealItem}>
                <div className="grid gap-2 text-[11px] font-semibold">
                  {LEGAL_LINKS.map((link) => (
                    <a key={link.href} href={link.href} className="text-neutral-500 transition hover:text-neutral-200">
                      {link.label}
                    </a>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {auth && (
              <motion.div className="pt-1" variants={revealList} initial="hidden" animate="show">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteAccountConfirmOpen(true)}
                  className="settings-danger-button w-full rounded-xl text-xs font-semibold"
                >
                  Удалить аккаунт
                </Button>
              </motion.div>
            )}
          </motion.div>

          <Dialog open={deleteAccountConfirmOpen} onOpenChange={setDeleteAccountConfirmOpen}>
            <DialogContent
              data-theme={mapStyle}
              className={`settings-surface max-w-sm ${mapStyle === "dark" ? "dark" : ""}`}
            >
              <DialogHeader>
                <DialogTitle>Перейти к удалению аккаунта?</DialogTitle>
                <DialogDescription>
                  Откроется страница с порядком удаления аккаунта и персональных данных.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteAccountConfirmOpen(false)}>
                  Отмена
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    window.location.assign("/delete-account");
                  }}
                >
                  Продолжить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AnimatePresence>
  );
}
