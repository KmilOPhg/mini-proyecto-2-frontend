import { useEffect } from 'react';
import { announce } from '../utils/a11y';

/** WCAG 2.4.2 — título de página descriptivo. */
export function usePageTitle(title: string, options?: { announce?: boolean }) {
  useEffect(() => {
    const full = title.includes('CrossFlow') ? title : `${title} · CrossFlow`;
    document.title = full;
    if (options?.announce) {
      announce(title);
    }
  }, [title, options?.announce]);
}
