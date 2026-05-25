import { Settings } from "lucide-react";

const clientId = "8930888716"; // ПОДСТАВЬТЕ СЮДА ВАШ ЧИСЛОВОЙ CLIENT_ID ИЗ BOTFATHER
const redirectUri = "https://api.thescope.ru.com/api/auth/telegram/callback"; // Должен строго совпадать с настройками в BotFather


export default function TelegramLoginWidget() {
  const handleLogin = () => {
    const scope = "openid profile";
    const state = Math.random().toString(36).substring(2, 11); // Защита от CSRF
    
    // Формируем URL по стандарту OIDC Telegram
    const authUrl = `https://oauth.telegram.org/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`;
    
    // Перенаправляем пользователя на авторизацию
    window.location.href = authUrl;
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center justify-center gap-2.5 bg-[#54a9eb] hover:bg-[#4b9cd9] text-white font-display font-semibold py-3 px-5 rounded-xl transition-all w-full cursor-pointer shadow-lg shadow-sky-500/10 active:scale-[0.98]"
    >
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
      </svg>
      Войти через Telegram
    </button>
  );
}