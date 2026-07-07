/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import TelegramLoginWidget from "./TelegramLoginWidget";
import { appEase, panelTransition, revealItem, revealList } from "../utils/motionPresets";

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionText?: string;
}

export default function AuthPromptModal({
  isOpen,
  onClose,
  actionText = "чтобы ставить отметки заведениям и делиться вайбом",
}: AuthPromptModalProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
            className="auth-prompt-surface relative w-full max-w-sm rounded-2xl border border-neutral-850 bg-neutral-950 p-6 shadow-2xl z-10 text-center space-y-6 overflow-hidden"
          >
            {/* Close Button */}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white"
              aria-label="Закрыть"
            >
              <X className="w-3.5 h-3.5" />
            </Button>

            {/* Icon & Heading */}
            <motion.div className="flex flex-col items-center space-y-3 pt-2" variants={revealList} initial="hidden" animate="show">
              <motion.div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-500" variants={revealItem}>
                <ShieldAlert className="w-6 h-6" />
              </motion.div>
              
              <motion.div className="space-y-1" variants={revealItem}>
                <h3 className="font-display text-lg font-bold text-white leading-snug">
                  Войдите через Telegram
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed px-2">
                  Авторизация необходима, {actionText}.
                </p>
              </motion.div>
            </motion.div>

            {/* Login Widget Wrapper */}
            <motion.div
              className="py-2.5 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-900 flex flex-col justify-center items-center gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...panelTransition, delay: 0.06 }}
            >
              <TelegramLoginWidget />
              <span className="text-[10px] text-neutral-500 font-mono">
                Безопасный вход. Данные профиля проверяются сервером.
              </span>
            </motion.div>

            {/* Cancel Button */}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
            >
              Продолжить просмотр гостем
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
