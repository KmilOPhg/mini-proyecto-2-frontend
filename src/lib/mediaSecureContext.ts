/** Mensaje cuando el navegador bloquea cámara/mic en HTTP (p. ej. celular en red local). */
export function mediaSecureContextError(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.isSecureContext) return null;
  return 'Cámara y micrófono requieren HTTPS. En local usa https:// en la PC y acepta el certificado en el celular.';
}

export function screenShareUnsupportedError(): string | null {
  if (typeof navigator === 'undefined') return null;
  if (typeof navigator.mediaDevices?.getDisplayMedia === 'function') return null;
  return 'Compartir pantalla no está disponible en este dispositivo o navegador.';
}
