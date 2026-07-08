/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import TelegramLoginWidget from "./TelegramLoginWidget";
import { MapStyle, TelegramAuthSession } from "../types";
import { appEase, panelTransition, revealItem, revealList } from "../utils/motionPresets";
import { LEGAL_LINKS } from "../legalDocuments";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: TelegramAuthSession | null;
  onLogout: () => void;
  mapStyle: MapStyle;
  onChangeMapStyle: (style: MapStyle) => void;
  nearbySort: boolean;
  onChangeNearbySort: (val: boolean) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  auth,
  onLogout,
  nearbySort,
  onChangeNearbySort,
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
  const [legalConsentAccepted, setLegalConsentAccepted] = useState(false);

  const updateLegalConsent = (value: boolean) => {
    setLegalConsentAccepted(value);
  };

  useEffect(() => {
    if (isOpen && !auth) {
      setLegalConsentAccepted(false);
    }
  }, [auth, isOpen]);

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
    } catch (error) {
      setSuggestionStatus("error");
      setSuggestionError(error instanceof Error ? error.message : "Не удалось отправить заявку.");
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="settings-surface relative w-full max-w-md rounded-2xl border p-6 shadow-2xl z-10 space-y-6 overflow-hidden max-h-[90vh] overflow-y-auto"
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
                    <a href="/delete-account" className="text-center text-[11px] font-semibold text-neutral-500 transition hover:text-neutral-200">
                      Удалить аккаунт
                    </a>
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
                      <TelegramLoginWidget disabled={!legalConsentAccepted} />
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Новое место
              </h4>
              <motion.div className="settings-card rounded-2xl border p-4 space-y-3" variants={revealItem}>
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
                      {!auth ? (
                        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs leading-relaxed text-muted-foreground">
                          Войдите через Telegram или Яндекс ID, чтобы предложить новое место. Так мы сможем связать заявку с профилем и показать статус рассмотрения.
                        </div>
                      ) : (
                        <>
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
                            placeholder="Комментарий: что это за место, почему стоит добавить"
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
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* GPS Proximity Sort Settings */}
            <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Геолокация и фильтры
              </h4>

              <motion.div className="settings-card flex items-center justify-between p-4 rounded-2xl border" variants={revealItem}>
                <div className="space-y-0.5 pr-2">
                  <div className="settings-strong text-xs font-semibold">
                    <span>Сортировка по близости (GPS)</span>
                  </div>
                  <div className="text-[10px] leading-relaxed">
                    Определяет ваши координаты и перестраивает список заведений от близких к дальним.
                  </div>
                </div>

                <Switch
                  checked={nearbySort}
                  onCheckedChange={onChangeNearbySort}
                  className={nearbySort ? "settings-toggle-on" : "settings-toggle-off"}
                  aria-label="Сортировка по близости"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
