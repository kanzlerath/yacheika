import { useState } from "react";

const COOKIE_CONSENT_KEY = "scope.cookieNoticeAccepted";

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem(COOKIE_CONSENT_KEY) !== "true");

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[130] rounded-2xl border border-neutral-800 bg-neutral-950/96 p-4 text-neutral-200 shadow-2xl backdrop-blur-xl md:left-auto md:right-5 md:max-w-md">
      <p className="text-xs leading-relaxed text-neutral-400">
        Сайт использует cookie-файлы и сервис Яндекс.Метрика для улучшения работы сервиса. Продолжая использование сайта, вы соглашаетесь с использованием cookie-файлов.
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <a href="/privacy" className="text-xs font-semibold text-neutral-500 underline decoration-neutral-700 transition hover:text-white">
          Подробнее
        </a>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(COOKIE_CONSENT_KEY, "true");
            setVisible(false);
          }}
          className="app-text-button min-h-9 px-4 py-2"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
