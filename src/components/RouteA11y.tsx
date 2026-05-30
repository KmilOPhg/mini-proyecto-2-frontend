import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { announce } from '../utils/a11y';

const STATIC_TITLES: Record<string, string> = {
  '/login': 'Iniciar sesión',
  '/register': 'Crear cuenta',
  '/username-setup': 'Configurar nombre de usuario',
  '/dashboard': 'Inicio — Salas colaborativas',
};

/** Títulos de documento y anuncio de ruta para lectores de pantalla. */
export default function RouteA11y() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/salas/')) return;

    const pageTitle = STATIC_TITLES[pathname] ?? 'CrossFlow';
    document.title = pageTitle === 'CrossFlow' ? pageTitle : `${pageTitle} · CrossFlow`;
    if (STATIC_TITLES[pathname]) {
      announce(pageTitle);
    }
  }, [pathname]);

  return (
    <>
      <div id="cf-live-polite" aria-live="polite" aria-atomic="true" className="cf-sr-only" />
      <div id="cf-live-assertive" aria-live="assertive" aria-atomic="true" className="cf-sr-only" />
    </>
  );
}
