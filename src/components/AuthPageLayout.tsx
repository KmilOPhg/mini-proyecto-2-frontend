import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthBrand() {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-7 h-7 rounded-[9px] flex items-center justify-center" style={{ background: '#4F46E5' }}>
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <span className="text-white text-[15px] font-semibold">CrossFlow</span>
    </div>
  );
}

export default function AuthPageLayout({ children, footer }: Props) {
  return (
    <div className="h-svh flex overflow-hidden" style={{ background: '#0F172A' }}>
      <main
        id="main"
        className="flex flex-col w-full lg:max-w-[480px] xl:max-w-[520px] h-svh min-h-0 shrink-0 px-5 sm:px-8 lg:px-10 py-4 sm:py-5"
        style={{ background: '#0F172A' }}
      >
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          <div className="w-full max-w-full">{children}</div>
        </div>
        {footer ? (
          <p className="flex-none pt-3 pb-1 text-[13px] text-center" style={{ color: '#64748B' }}>
            {footer}
          </p>
        ) : null}
      </main>

      <aside
        className="hidden lg:flex flex-1 flex-col justify-center h-svh min-h-0 px-12 xl:px-16 py-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #1E293B 100%)' }}
        aria-hidden="true"
      >
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.08)' }} />
        <div className="absolute -bottom-40 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(59,130,246,0.06)' }} />
        <div className="relative z-10 max-w-lg">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5 text-[11px] font-medium"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}
          >
            Estudio colaborativo en tiempo real
          </div>
          <h2 className="text-4xl xl:text-[2.75rem] font-bold leading-tight mb-4 text-white">
            Salas accesibles para aprender, crear y avanzar juntos.
          </h2>
          <p className="text-sm xl:text-[15px] leading-relaxed" style={{ color: '#64748B' }}>
            Video HD, chat instantáneo, pizarra compartida y herramientas de accesibilidad WCAG 2.2 integradas en cada sesión.
          </p>
        </div>
      </aside>
    </div>
  );
}
