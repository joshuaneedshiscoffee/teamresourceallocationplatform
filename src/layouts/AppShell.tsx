import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Layers,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTeamspace } from '@/hooks/useTeamspace';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/format';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const ROUTE_META: Array<{ match: RegExp; title: string; parent?: { label: string; to: string } }> = [
  { match: /^\/$/, title: 'Overview' },
  { match: /^\/planner$/, title: 'Capacity Planner' },
  { match: /^\/people$/, title: 'People Directory' },
  {
    match: /^\/people\/.+/,
    title: 'Employee Profile',
    parent: { label: 'People', to: '/people' },
  },
  { match: /^\/projects$/, title: 'Projects' },
  {
    match: /^\/projects\/.+/,
    title: 'Project Details',
    parent: { label: 'Projects', to: '/projects' },
  },
  { match: /^\/allocations$/, title: 'Allocations' },
  { match: /^\/conflicts$/, title: 'Conflicts & Alerts' },
  { match: /^\/commitments$/, title: 'My Commitments' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    employees,
    projects,
    activePersona,
    setActivePersona,
    conflicts,
    workloadFlags,
    lastSyncedAt,
    resetDemoData,
  } = useTeamspace();

  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);

  const openFlagsCount = workloadFlags.filter((f) => f.status !== 'Resolved').length;
  const totalAlertsCount = conflicts.length + openFlagsCount;

  const navItems: NavItem[] = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/planner', label: 'Capacity Planner', icon: CalendarRange },
    { to: '/people', label: 'People', icon: Users },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/allocations', label: 'Allocations', icon: Layers },
    {
      to: '/conflicts',
      label: 'Conflicts',
      icon: AlertTriangle,
      badge: conflicts.length > 0 ? conflicts.length : undefined,
    },
    { to: '/commitments', label: 'My Commitments', icon: UserCheck },
  ];

  const pageMeta: { title: string; parent?: { label: string; to: string } } = useMemo(() => {
    return (
      ROUTE_META.find((r) => r.match.test(location.pathname)) ?? {
        title: 'Teamspace',
      }
    );
  }, [location.pathname]);

  const personas = useMemo(
    () => employees.filter((e) => e.isPersona),
    [employees]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { people: [], projects: [] };
    return {
      people: employees
        .filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.role.toLowerCase().includes(q) ||
            e.squad.toLowerCase().includes(q)
        )
        .slice(0, 4),
      projects: projects
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            p.client.toLowerCase().includes(q)
        )
        .slice(0, 4),
    };
  }, [searchQuery, employees, projects]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:static lg:z-auto',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Wordmark */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3.5">
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
              T
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-slate-900">
                  Teamspace
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  Resource Planning
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    collapsed && 'justify-center px-2'
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </span>
                {!collapsed && item.badge !== undefined && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[11px] font-semibold text-red-700 tabular-nums">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Demo Environment Indicator & Reset */}
        <div className="border-t border-slate-200 p-3">
          {!collapsed ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  IXD04 Demo Env
                </span>
                <span className="text-[10px] text-slate-400">40h/wk</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Synced {formatRelativeTime(lastSyncedAt, new Date())}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2 w-full justify-center text-xs"
                onClick={resetDemoData}
              >
                <RotateCcw className="h-3 w-3" />
                Reset Demo Data
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={resetDemoData}
              title="Reset Demo Data"
              className="flex w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm">
              {pageMeta.parent && (
                <>
                  <Link
                    to={pageMeta.parent.to}
                    className="font-medium text-slate-500 hover:text-slate-900"
                  >
                    {pageMeta.parent.label}
                  </Link>
                  <span className="text-slate-300">/</span>
                </>
              )}
              <h1 className="font-semibold text-slate-900">{pageMeta.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Global Quick Search */}
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                placeholder="Search people or projects..."
                className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {searchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 mt-1.5 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  {searchResults.people.length === 0 &&
                  searchResults.projects.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-slate-500">
                      No matching people or projects.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.people.length > 0 && (
                        <div>
                          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            People
                          </p>
                          {searchResults.people.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onMouseDown={() => {
                                navigate(`/people/${emp.id}`);
                                setSearchQuery('');
                              }}
                              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                            >
                              <span className="font-medium text-slate-900">{emp.name}</span>
                              <span className="text-slate-500">{emp.role}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.projects.length > 0 && (
                        <div>
                          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Projects
                          </p>
                          {searchResults.projects.map((proj) => (
                            <button
                              key={proj.id}
                              type="button"
                              onMouseDown={() => {
                                navigate(`/projects/${proj.id}`);
                                setSearchQuery('');
                              }}
                              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                            >
                              <span className="font-medium text-slate-900">{proj.name}</span>
                              <span className="text-slate-500">{proj.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setPersonaOpen(false);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {totalAlertsCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {totalAlertsCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Alerts & Conflicts ({totalAlertsCount})
                    </span>
                    <Link
                      to="/conflicts"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {conflicts.length === 0 && openFlagsCount === 0 ? (
                      <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        No active conflicts or flags.
                      </div>
                    ) : (
                      conflicts.slice(0, 4).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate('/conflicts');
                          }}
                          className="w-full rounded-md border border-slate-100 bg-slate-50 p-2 text-left text-xs hover:bg-slate-100"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{c.type}</span>
                            <Badge variant={c.severity === 'Critical' ? 'danger' : 'warning'}>
                              {c.severity}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                            {c.description}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Demo Persona Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPersonaOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50"
              >
                <Avatar initials={activePersona.avatarInitials} size="sm" />
                <div className="hidden sm:block">
                  <p className="text-xs font-medium leading-none text-slate-900">
                    {activePersona.name}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-none text-slate-500">
                    {activePersona.role}
                  </p>
                </div>
              </button>

              {personaOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                  <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Switch Demo Persona
                  </p>
                  {personas.map((p) => {
                    const isCurrent = p.id === activePersona.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActivePersona(p.id);
                          setPersonaOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                          isCurrent ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                        )}
                      >
                        <Avatar initials={p.avatarInitials} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{p.name}</p>
                          <p className="truncate text-[11px] text-slate-500">{p.role}</p>
                        </div>
                        {isCurrent && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
