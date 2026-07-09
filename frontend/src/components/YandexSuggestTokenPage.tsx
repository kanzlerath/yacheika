import { useEffect } from "react";

declare global {
  interface Window {
    YaSendSuggestToken?: (origin: string, extraData?: Record<string, unknown>) => void;
  }
}

export default function YandexSuggestTokenPage() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-token-with-polyfills-latest.js";
    script.async = true;
    script.onload = () => {
      if (window.YaSendSuggestToken) {
        window.YaSendSuggestToken(window.location.origin);
      }
    };
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070a] px-6 text-center text-sm text-neutral-400">
      Завершаем вход через Яндекс ID...
    </div>
  );
}
