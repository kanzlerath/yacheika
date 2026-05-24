/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import { TelegramLoginWidgetUser } from "../types";

interface TelegramLoginWidgetProps {
  onAuth: (user: TelegramLoginWidgetUser) => void;
  size?: "small" | "medium" | "large";
  radius?: number;
}

const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

export default function TelegramLoginWidget({
  onAuth,
  size = "large",
  radius = 12,
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !botUsername) return;

    // Define temporary unique callback name to avoid conflicts if multiple widgets exist
    const callbackName = `onYacheykaWidgetAuth_${Math.random().toString(36).substring(2, 9)}`;

    (window as any)[callbackName] = (user: TelegramLoginWidgetUser) => {
      onAuth(user);
    };

    // Clean up container
    containerRef.current.innerHTML = "";

    // Create script element
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername.replace(/^@/, ""));
    script.setAttribute("data-size", size);
    script.setAttribute("data-radius", String(radius));
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);

    containerRef.current.appendChild(script);

    return () => {
      delete (window as any)[callbackName];
    };
  }, [onAuth, size, radius]);

  if (!botUsername) {
    return (
      <div className="text-xs text-amber-300 leading-relaxed">
        Ошибка: В окружении не задана переменная VITE_TELEGRAM_BOT_USERNAME.
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
