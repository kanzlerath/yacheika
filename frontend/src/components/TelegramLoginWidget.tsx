import { useEffect, useId, useState } from "react";
import { MapStyle } from "../types";

interface TelegramLoginWidgetProps {
  disabled?: boolean;
  theme?: MapStyle;
}

type YandexSuggestResult = {
  handler: () => Promise<Record<string, unknown>>;
};

declare global {
  interface Window {
    YaAuthSuggest?: {
      init: (
        oauthQueryParams: Record<string, string>,
        tokenPageOrigin: string,
        suggestParams: Record<string, string | number>,
      ) => Promise<YandexSuggestResult>;
    };
  }
}

let yandexSdkPromise: Promise<void> | null = null;

const loadYandexSuggestSdk = () => {
  if (window.YaAuthSuggest) return Promise.resolve();
  if (yandexSdkPromise) return yandexSdkPromise;

  yandexSdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-yandex-suggest-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Yandex SDK loading failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js";
    script.async = true;
    script.dataset.yandexSuggestSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Yandex SDK loading failed"));
    document.head.appendChild(script);
  });

  return yandexSdkPromise;
};

const extractAccessToken = (data: Record<string, unknown>) => {
  const nestedData = typeof data.data === "object" && data.data ? data.data as Record<string, unknown> : null;
  const token = data.access_token || data.token || nestedData?.access_token;
  return typeof token === "string" ? token : "";
};

export default function TelegramLoginWidget({
  disabled = false,
  theme = "dark",
}: TelegramLoginWidgetProps) {
  const reactId = useId();
  const containerId = `yandex-login-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [yandexUnavailable, setYandexUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();
    setYandexUnavailable(false);

    const initialize = async () => {
      try {
        const [configResponse] = await Promise.all([
          fetch("/api/auth/yandex/config"),
          loadYandexSuggestSdk(),
        ]);
        if (!configResponse.ok) throw new Error("Yandex ID configuration unavailable");
        const config = await configResponse.json() as { clientId?: string };
        if (!config.clientId || !window.YaAuthSuggest) throw new Error("Yandex ID is not configured");

        const result = await window.YaAuthSuggest.init(
          {
            client_id: config.clientId,
            response_type: "token",
            redirect_uri: `${window.location.origin}/auth/yandex/suggest-token`,
          },
          window.location.origin,
          {
            view: "button",
            parentId: containerId,
            buttonView: "main",
            buttonTheme: theme,
            buttonSize: "m",
            buttonBorderRadius: 12,
            buttonIcon: "ya",
          },
        );
        if (cancelled) return;

        const tokenData = await result.handler();
        if (cancelled) return;
        const accessToken = extractAccessToken(tokenData);
        if (!accessToken) throw new Error("Yandex ID did not return an access token");

        const authResponse = await fetch("/api/auth/yandex/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });
        if (!authResponse.ok) throw new Error("Yandex ID token validation failed");
        window.location.assign("/?auth=success");
      } catch (error) {
        if (!cancelled) {
          console.error("Yandex Suggest authorization failed:", error);
          setYandexUnavailable(true);
        }
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [containerId, theme]);

  const handleTelegramLogin = () => {
    if (disabled) return;
    window.location.href = "/api/auth/telegram/start";
  };

  const handleYandexFallback = () => {
    if (disabled) return;
    window.location.href = "/api/auth/yandex/start";
  };

  return (
    <div className="grid w-full gap-2">
      <div
        className={disabled ? "pointer-events-none opacity-45" : undefined}
        aria-disabled={disabled}
      >
        <div id={containerId} className="yandex-suggest-container min-h-11 w-full" />
        {yandexUnavailable && (
          <button
            type="button"
            onClick={handleYandexFallback}
            disabled={disabled}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed"
          >
            Войти с Яндекс ID
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleTelegramLogin}
        disabled={disabled}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[#54a9eb] px-5 font-display text-sm font-semibold text-white shadow-lg shadow-sky-500/10 transition-all hover:bg-[#4b9cd9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#54a9eb] disabled:active:scale-100"
      >
        <svg className="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
        </svg>
        Войти через Telegram
      </button>
    </div>
  );
}
