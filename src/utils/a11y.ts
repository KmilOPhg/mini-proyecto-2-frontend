export type A11yFontSize = 'sm' | 'md' | 'lg' | 'xl';

export const LS_SR  = 'cf_a11y_sr';
export const LS_HC  = 'cf_a11y_hc';
export const LS_FS  = 'cf_a11y_fs';

const FONT_PX: Record<A11yFontSize, string> = {
  sm: '13px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

export interface A11ySettings {
  screenReader: boolean;
  highContrast: boolean;
  fontSize: A11yFontSize;
}

export function applyA11ySettings({ screenReader, highContrast, fontSize }: A11ySettings) {
  const html = document.documentElement;
  html.classList.toggle('cf-sr-enhanced', screenReader);
  html.classList.toggle('cf-high-contrast', highContrast);
  html.style.fontSize = FONT_PX[fontSize];
}

export function initA11y() {
  applyA11ySettings({
    screenReader: localStorage.getItem(LS_SR) !== 'false',
    highContrast: localStorage.getItem(LS_HC) === 'true',
    fontSize: (localStorage.getItem(LS_FS) as A11yFontSize) ?? 'md',
  });
}
