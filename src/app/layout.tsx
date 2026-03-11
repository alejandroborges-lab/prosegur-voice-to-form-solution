import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prosegur Voice-to-Form',
  description: 'AI-powered incident form filling for Prosegur security guards',
  icons: {
    icon: '/prosegur-logo.png',
  },
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="nav-link">
      {children}
    </a>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <nav className="bg-gradient-prosegur border-b border-white/10 sticky top-0 z-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <a href="/" className="flex items-center gap-3">
                  <img
                    src="/prosegur-logo.png"
                    alt="Prosegur"
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-bold text-lg tracking-tight">
                      Voice-to-Form
                    </span>
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-white/40">
                      AI Platform
                    </span>
                  </div>
                </a>
              </div>
              <div className="flex items-center gap-1">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/incidents">Incidencias</NavLink>
                <NavLink href="/analytics">Analytics</NavLink>
                <NavLink href="/forms">Formularios</NavLink>
                <NavLink href="/test">Test</NavLink>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
