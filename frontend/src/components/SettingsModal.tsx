/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Compass,
  User,
  Sliders,
} from "lucide-react";
import TelegramLoginWidget from "./TelegramLoginWidget";
import { MapStyle, TelegramAuthSession } from "../types";
import { appEase, panelTransition, revealItem, revealList } from "../utils/motionPresets";

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
  mapStyle,
  onChangeMapStyle,
  nearbySort,
  onChangeNearbySort,
}: SettingsModalProps) {
  const currentUser = auth?.user ?? null;

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
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-500" />
                <h3 className="font-display text-base font-bold uppercase tracking-wider">
                  Настройки и Профиль
                </h3>
              </div>
              <button
                onClick={onClose}
                className="settings-icon-button p-1.5 rounded-full border transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Section */}
            <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Аккаунт Telegram
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

                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/20 text-rose-400 border border-rose-900/20 font-mono shrink-0">
                      User
                    </span>
                  </div>

                  {/* Actions for authenticated */}
                  <div className="settings-divider flex flex-col gap-2 pt-2 border-t">
                    <button
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="settings-secondary-button w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer"
                    >
                      <span>Выйти из аккаунта</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Unauthenticated Guest message & Telegram widget */
                <motion.div className="settings-card p-4 rounded-2xl border text-center space-y-4" variants={revealItem}>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="settings-avatar w-8 h-8 rounded-full flex items-center justify-center border">
                      <User className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-xs leading-normal px-2">
                      Вы просматриваете карту как гость. Войдите через Telegram, чтобы ставить лайки заведениям, сохранять подборки и оценивать атмосферу.
                    </p>
                  </div>

                  <div className="settings-divider pt-2 border-t flex justify-center">
                    <TelegramLoginWidget />
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Map Styles Settings */}
            <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Стиль карты
              </h4>

              <motion.div className="grid grid-cols-2 gap-2" variants={revealList}>
                {(["dark", "light"] as const).map((style) => {
                  const isActive = mapStyle === style;
                  const label = style === "dark" ? "Тёмная" : "Светлая";
                  return (
                    <motion.button
                      key={style}
                      onClick={() => onChangeMapStyle(style)}
                      variants={revealItem}
                      whileTap={{ scale: 0.98 }}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold font-display transition cursor-pointer text-center ${
                        isActive
                          ? "theme-button-active shadow"
                          : "theme-button hover:text-white"
                      }`}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* GPS Proximity Sort Settings */}
            <motion.div className="space-y-3" variants={revealList} initial="hidden" animate="show">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Геолокация и фильтры
              </h4>

              <motion.div className="settings-card flex items-center justify-between p-4 rounded-2xl border" variants={revealItem}>
                <div className="space-y-0.5 pr-2">
                  <div className="settings-strong text-xs font-semibold flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-rose-500" />
                    <span>Сортировка по близости (GPS)</span>
                  </div>
                  <div className="text-[10px] leading-relaxed">
                    Определяет ваши координаты и перестраивает список заведений от близких к дальним.
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  onClick={() => onChangeNearbySort(!nearbySort)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    nearbySort ? "settings-toggle-on" : "settings-toggle-off"
                  }`}
                >
                  <motion.div
                    layout
                    transition={{ duration: 0.18, ease: appEase }}
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      nearbySort ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
