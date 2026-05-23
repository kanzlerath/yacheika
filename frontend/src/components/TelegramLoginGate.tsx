import { useEffect, useRef, useState } from "react";
import { AlertCircle, Send, ShieldCheck } from "lucide-react";
import { TelegramAuthSession, TelegramLoginWidgetUser } from "../types";
import { authenticateTelegram } from "../utils/telegramAuth";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
    onYacheykaTelegramAuth?: (user: TelegramLoginWidgetUser) => void;
  }
}

interface TelegramLoginGateProps {
  onAuthenticated: (auth: TelegramAuthSession) => void;
}

const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

export default function TelegramLoginGate({ onAuthenticated }: TelegramLoginGateProps) {
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const attemptedMiniAppAuthRef = useRef(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitTelegramAuth = async (payload: Parameters<typeof authenticateTelegram>[0]) => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const auth = await authenticateTelegram(payload);
      onAuthenticated(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telegram авторизация не прошла.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initData || attemptedMiniAppAuthRef.current) return;

    attemptedMiniAppAuthRef.current = true;
    webApp.ready?.();
    webApp.expand?.();
    submitTelegramAuth({ initData: webApp.initData });
  }, []);

  useEffect(() => {
    if (window.Telegram?.WebApp?.initData || !widgetContainerRef.current || !botUsername) return;

    window.onYacheykaTelegramAuth = (user: TelegramLoginWidgetUser) => {
      submitTelegramAuth({ loginWidgetUser: user });
    };

    widgetContainerRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername.replace(/^@/, ""));
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onYacheykaTelegramAuth(user)");
    widgetContainerRef.current.appendChild(script);

    return () => {
      delete window.onYacheykaTelegramAuth;
    };
  }, []);

  return (
    <div className="h-screen h-[100dvh] w-screen bg-[#030303] text-white flex items-center justify-center px-5">
      <section className="w-full max-w-[440px] space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.65)]" />
            <span className="font-display font-black tracking-[0.28em] text-sm uppercase">ЯЧЕЙКА</span>
          </div>
          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl font-black leading-tight">
              Вход только через Telegram
            </h1>
            <p className="text-sm leading-relaxed text-neutral-400">
              Реакции и админ-доступ привязаны к реальному Telegram-профилю. Админка открывается только для @nick_luzhkov.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-850 bg-neutral-950/80 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-neutral-100">Telegram-подпись проверяется на сервере</div>
              <div className="text-xs leading-relaxed text-neutral-500">
                Клиент не выбирает пользователя сам: backend принимает только данные, подписанные вашим ботом.
              </div>
            </div>
          </div>

          {!window.Telegram?.WebApp?.initData && (
            <div className="min-h-11 flex items-center">
              {botUsername ? (
                <div ref={widgetContainerRef} className={isAuthenticating ? "pointer-events-none opacity-50" : ""} />
              ) : (
                <div className="flex items-start gap-2 text-xs leading-relaxed text-amber-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>В окружении не задан VITE_TELEGRAM_BOT_USERNAME.</span>
                </div>
              )}
            </div>
          )}

          {isAuthenticating && (
            <div className="text-xs text-neutral-500">Проверяем Telegram-сессию...</div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs leading-relaxed text-rose-100">
              {error}
            </div>
          )}
        </div>

        {botUsername && (
          <a
            href={`https://t.me/${botUsername.replace(/^@/, "")}?startapp=yacheyka`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            <Send className="w-4 h-4 text-sky-400" />
            Открыть Mini App в Telegram
          </a>
        )}
      </section>
    </div>
  );
}
