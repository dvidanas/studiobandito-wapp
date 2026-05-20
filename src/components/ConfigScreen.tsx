import Link from "next/link";

interface Props {
  missing: string[];
}

const ENV_DESCRIPTIONS: Record<string, string> = {
  YCLOUD_API_KEY: "API Key de YCloud",
  YCLOUD_PHONE_NUMBER: "Número de WhatsApp en formato E.164 (ej: +5491155555555)",
  GEMINI_API_KEY: "API Key de Google Gemini (AI Studio)",
};

export function ConfigScreen({ missing }: Props) {
  const allRequired = ["YCLOUD_API_KEY", "YCLOUD_PHONE_NUMBER", "GEMINI_API_KEY"];

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Configuración incompleta
                </h2>
                <p className="text-sm text-gray-600">
                  Faltan variables de entorno para iniciar el sistema.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Estado de variables */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Variables de entorno
              </h3>
              <ul className="space-y-2">
                {allRequired.map((key) => {
                  const ok = !missing.includes(key);
                  return (
                    <li
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <span
                        className={`mt-0.5 flex-shrink-0 text-sm ${
                          ok ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {ok ? "✓" : "✗"}
                      </span>
                      <div>
                        <code className="text-sm font-mono font-medium text-gray-800">
                          {key}
                        </code>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ENV_DESCRIPTIONS[key]}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* URL Webhook */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                URL del Webhook
              </h3>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <code className="text-sm text-gray-700 flex-1 break-all">
                  https://TU_DOMINIO/api/webhook
                </code>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Reemplazá TU_DOMINIO por el dominio asignado en EasyPanel.
              </p>
            </div>

            {/* Pasos */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Pasos para configurar
              </h3>
              <ol className="space-y-2 text-sm text-gray-600">
                {[
                  "Crear cuenta en ycloud.com",
                  "Registrar número de WhatsApp Business.",
                  "Settings → API Keys → copiar YCLOUD_API_KEY.",
                  "Copiar número como YCLOUD_PHONE_NUMBER (E.164 con +).",
                  "YCloud → Webhooks → pegar la URL del webhook de arriba.",
                  "Suscribir al evento whatsapp.inbound_message.received.",
                  "Obtener GEMINI_API_KEY desde aistudio.google.com",
                  "Configurar las variables en EasyPanel → Environment → reiniciar.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            {/* Acceso al dashboard */}
            <div className="pt-2 border-t border-gray-100">
              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
              >
                Ir al dashboard
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
