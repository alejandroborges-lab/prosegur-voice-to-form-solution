import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prosegur Voice-to-Form',
  description: 'AI-powered incident form filling for Prosegur security guards',
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
    >
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
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-gray-900 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <a href="/" className="text-white font-semibold text-lg">
                  Prosegur V2F
                </a>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                  Demo
                </span>
              </div>
              <div className="flex items-center gap-1">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/incidents">Incidencias</NavLink>
                <NavLink href="/forms">Formularios</NavLink>
                <NavLink href="/test">Test</NavLink>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
