interface TelegramLoginWidgetProps {
  disabled?: boolean;
}

export default function TelegramLoginWidget({ disabled = false }: TelegramLoginWidgetProps) {
  const handleTelegramLogin = () => {
    if (disabled) return;
    window.location.href = "/api/auth/telegram/start";
  };

  const handleYandexLogin = () => {
    if (disabled) return;
    window.location.href = "/api/auth/yandex/start";
  };

  return (
    <div className="grid w-full gap-2">
      <button
        onClick={handleYandexLogin}
        disabled={disabled}
        className="flex h-11 w-full cursor-pointer items-center justify-between bg-black px-4 font-display text-sm font-semibold text-white shadow-lg shadow-black/15 transition-all hover:bg-neutral-950 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-black disabled:active:scale-100"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#fc3f1d] text-sm font-black leading-none text-white">
          Я
        </span>
        <span className="min-w-0 flex-1 truncate px-3">Войти с Яндекс ID</span>
        <span className="size-5 shrink-0" aria-hidden="true" />
      </button>

      <button
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
