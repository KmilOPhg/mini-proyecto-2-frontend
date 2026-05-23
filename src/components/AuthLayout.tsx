import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  panelTitle: string;
  panelSubtitle: string;
};

const features = [
  { icon: '📚', text: 'Accede a materiales de estudio' },
  { icon: '🎯', text: 'Seguimiento de tu progreso' },
  { icon: '🤝', text: 'Colabora con tus compañeros' },
];

function CrossFlowLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? 'bg-white/10' : 'bg-indigo-600'}`}>
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <span className={`text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
        CrossFlow
      </span>
    </div>
  );
}

export default function AuthLayout({ children, panelTitle, panelSubtitle }: Props) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-8 w-56 h-56 bg-purple-500/10 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative z-10">
          <CrossFlowLogo dark />
        </div>

        {/* Center message */}
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">{panelTitle}</h2>
          <p className="text-indigo-300 text-lg leading-relaxed">{panelSubtitle}</p>

          <div className="mt-10 space-y-5">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-4">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-indigo-100 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-indigo-400 text-xs">
          © 2025 CrossFlow · Todos los derechos reservados
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <CrossFlowLogo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
