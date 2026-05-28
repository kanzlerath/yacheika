/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Compass,
  LogOut,
  User,
  Sliders,
} from "lucide-react";
import TelegramLoginWidget from "./TelegramLoginWidget";
import { TelegramAuthSession } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: TelegramAuthSession | null;
  onLogout: () => void;
  mapStyle: "dark" | "light" | "voyager";
  onChangeMapStyle: (style: "dark" | "light" | "voyager") => void;
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative w-full max-w-md rounded-3xl border border-neutral-850 bg-neutral-950 p-6 shadow-2xl z-10 space-y-6 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-500" />
                <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">
                  Настройки и Профиль
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Аккаунт Telegram
              </h4>

              {auth ? (
                /* Authenticated User info */
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-900 space-y-4">
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
                      <div className="font-semibold text-sm text-neutral-100 truncate">
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
                  <div className="flex flex-col gap-2 pt-2 border-t border-neutral-900">
                    <button
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-950 hover:bg-rose-950/20 border border-neutral-900 hover:border-rose-900/30 text-xs font-semibold text-neutral-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Выйти из аккаунта</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Unauthenticated Guest message & Telegram widget */
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-900 text-center space-y-4">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-850 flex items-center justify-center text-neutral-400 border border-neutral-800">
                      <User className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-xs text-neutral-400 leading-normal px-2">
                      Вы просматриваете карту как гость. Войдите через Telegram, чтобы ставить лайки заведениям, сохранять подборки и оценивать атмосферу.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-900 flex justify-center">
                    <TelegramLoginWidget />
                  </div>
                </div>
              )}
            </div>

            {/* Map Styles Settings */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Стиль карты
              </h4>

              <div className="grid grid-cols-3 gap-2">
                {(["dark", "voyager", "light"] as const).map((style) => {
                  const isActive = mapStyle === style;
                  const label =
                    style === "dark"
                      ? "Тёмная"
                      : style === "voyager"
                      ? "Цветная"
                      : "Светлая";
                  return (
                    <button
                      key={style}
                      onClick={() => onChangeMapStyle(style)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold font-display transition cursor-pointer text-center ${
                        isActive
                          ? "bg-white text-black border-white shadow"
                          : "bg-neutral-950 text-neutral-400 border-neutral-900 hover:border-neutral-800 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GPS Proximity Sort Settings */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Геолокация и фильтры
              </h4>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900/60 border border-neutral-900">
                <div className="space-y-0.5 pr-2">
                  <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-rose-500" />
                    <span>Сортировка по близости (GPS)</span>
                  </div>
                  <div className="text-[10px] leading-relaxed text-neutral-500">
                    Определяет ваши координаты и перестраивает список заведений от близких к дальним.
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  onClick={() => onChangeNearbySort(!nearbySort)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    nearbySort ? "bg-rose-500" : "bg-neutral-800"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      nearbySort ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
