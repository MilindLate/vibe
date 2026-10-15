// src/components/admin/AdminLayout.tsx
import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navItems = [
    { name: 'Dashboard', to: '/admin' },
    { name: 'Users', to: '/admin/users' },
    { name: 'Videos', to: '/admin/videos' },
    { name: 'Analytics', to: '/admin/analytics' },
  ];
  return (
    <div className="flex min-h-screen bg-vibe-dark text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-vibe-card p-4">
        <h2 className="text-2xl font-bold mb-6">Vibe Admin</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block py-2 px-3 rounded ${isActive ? 'bg-primary text-white' : 'hover:bg-primary/20'}
              `
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
