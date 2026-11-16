import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AllocationModal } from '@/components/AllocationModal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { DEMO_TODAY } from '@/data/mockData';
import { useTeamspace } from '@/hooks/useTeamspace';
import type { Allocation } from '@/types/teamspace';
import { cn } from '@/utils/cn';
import {
  doDateRangesOverlap,
  getEmployeeAllocationOnDate,
  getEmployeePeakAllocationInRange,
  isAvailabilityStale,
} from '@/utils/capacity';
import {
  addDays,
  diffDaysInclusive,
  formatDateShort,
  pctToHours,
} from '@/utils/format';

export function CapacityPlannerPage() {
  const { employees, projects, allocations } = useTeamspace();

  const [windowStart, setWindowStart] = useState(DEMO_TODAY);
  const [weeksCount, setWeeksCount] = useState<4 | 6>(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [onlyOverloaded, setOnlyOverloaded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string | undefined>();

  const windowEnd = useMemo(
    () => addDays(windowStart, weeksCount * 7 - 1),
    [windowStart, weeksCount]
  );

  const totalDays = weeksCount * 7;

  const weekColumns = useMemo(() => {
    return Array.from({ length: weeksCount }, (_, idx) => {
      const start = addDays(windowStart, idx * 7);
      const mid = addDays(start, 2);
      const end = addDays(start, 6);
      return {
        index: idx,
        start,
        mid,
        end,
        label: formatDateShort(start),
      };
    });
  }, [windowStart, weeksCount]);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchesQuery =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.squad.toLowerCase().includes(q);
      if (!matchesQuery) return false;

      if (projectFilter) {
        const hasProjectInWindow = allocations.some(
          (a) =>
            a.employeeId === emp.id &&
            a.projectId === projectFilter &&
            doDateRangesOverlap(a.startDate, a.endDate, windowStart, windowEnd)
        );
        if (!hasProjectInWindow) return false;
      }

      if (onlyOverloaded) {
        const { peakPct } = getEmployeePeakAllocationInRange(
          emp.id,
          windowStart,
          windowEnd,
          allocations
        );
        if (peakPct <= emp.maxCapacityPct) return false;
      }

      return true;
    });
  }, [
    employees,
    allocations,
    searchQuery,
    projectFilter,
    onlyOverloaded,
    windowStart,
    windowEnd,
  ]);

  const refDate = new Date(`${DEMO_TODAY}T12:00:00Z`);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Capacity Planner</h2>
          <p className="text-xs text-slate-500">
            Timeline view of confirmed and tentative commitments ({formatDateShort(windowStart)} –{' '}
            {formatDateShort(windowEnd)})
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAllocation(null);
            setDefaultEmployeeId(undefined);
            setModalOpen(true);
          }}
        >
          <CalendarPlus className="h-4 w-4" />
          New Allocation
        </Button>
      </div>

      {/* Controls Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter people or squad..."
              className="w-52"
            />
            <Select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-52"
              aria-label="Filter by project"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setOnlyOverloaded((v) => !v)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
                onlyOverloaded
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Over-capacity only
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setWeeksCount(4)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium',
                  weeksCount === 4
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                4 Weeks
              </button>
              <button
                type="button"
                onClick={() => setWeeksCount(6)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium',
                  weeksCount === 6
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                6 Weeks
              </button>
            </div>

            <div className="inline-flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWindowStart((d) => addDays(d, -14))}
                aria-label="Previous 2 weeks"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWindowStart(DEMO_TODAY)}
              >
                Today
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWindowStart((d) => addDays(d, 14))}
                aria-label="Next 2 weeks"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Timeline Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            {/* Grid Header */}
            <div className="grid grid-cols-[260px_1fr] border-b border-slate-200 bg-slate-50">
              <div className="border-r border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">
                Team Member ({filteredEmployees.length})
              </div>
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${weeksCount}, minmax(0, 1fr))` }}
              >
                {weekColumns.map((wk) => (
                  <div
                    key={wk.start}
                    className="border-r border-slate-200 px-2.5 py-2.5 text-xs font-medium text-slate-600 last:border-r-0"
                  >
                    <span className="text-slate-900">Wk of {wk.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee Rows */}
            <div className="divide-y divide-slate-200">
              {filteredEmployees.map((emp) => {
                const { peakPct } = getEmployeePeakAllocationInRange(
                  emp.id,
                  windowStart,
                  windowEnd,
                  allocations
                );
                const isOver = peakPct > emp.maxCapacityPct;
                const stale = isAvailabilityStale(emp, refDate);

                const visibleAllocations = allocations.filter(
                  (a) =>
                    a.employeeId === emp.id &&
                    doDateRangesOverlap(a.startDate, a.endDate, windowStart, windowEnd)
                );

                return (
                  <div
                    key={emp.id}
                    className={cn(
                      'grid grid-cols-[260px_1fr] transition-colors hover:bg-slate-50/40',
                      isOver && 'bg-red-50/20'
                    )}
                  >
                    {/* Employee Info Cell */}
                    <div className="flex flex-col justify-between border-r border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/people/${emp.id}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <Avatar initials={emp.avatarInitials} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                              {emp.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {emp.role}
                            </p>
                          </div>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAllocation(null);
                            setDefaultEmployeeId(emp.id);
                            setModalOpen(true);
                          }}
                          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600"
                          title={`Allocate ${emp.name}`}
                        >
                          +
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant={isOver ? 'danger' : peakPct > 0 ? 'blue' : 'neutral'}>
                          Peak {peakPct}% ({pctToHours(peakPct, emp.weeklyCapacityHours)}h)
                        </Badge>
                        {stale && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700"
                            title="Unverified availability"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Stale
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timeline Track Cell */}
                    <div className="relative flex flex-col justify-between p-2">
                      {/* Weekly capacity summary row */}
                      <div
                        className="mb-2 grid gap-1"
                        style={{
                          gridTemplateColumns: `repeat(${weeksCount}, minmax(0, 1fr))`,
                        }}
                      >
                        {weekColumns.map((wk) => {
                          const wkPct = getEmployeeAllocationOnDate(
                            emp.id,
                            wk.mid,
                            allocations
                          );
                          const onLeave =
                            emp.leaveRange &&
                            doDateRangesOverlap(
                              wk.start,
                              wk.end,
                              emp.leaveRange.startDate,
                              emp.leaveRange.endDate
                            );
                          const wkOver = wkPct > emp.maxCapacityPct;

                          return (
                            <div
                              key={wk.start}
                              className={cn(
                                'flex items-center justify-between rounded px-2 py-0.5 text-[11px] tabular-nums',
                                onLeave
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : wkOver
                                    ? 'bg-red-100 font-semibold text-red-800'
                                    : wkPct > 0
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-slate-50 text-slate-400'
                              )}
                            >
                              <span>{onLeave ? 'Leave' : `${wkPct}%`}</span>
                              {onLeave ? (
                                <Clock className="h-3 w-3" />
                              ) : (
                                <span className="text-[10px] opacity-75">
                                  {pctToHours(wkPct, emp.weeklyCapacityHours)}h
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Allocation Bars */}
                      <div className="space-y-1.5">
                        {visibleAllocations.length === 0 ? (
                          <div className="py-1 text-center text-[11px] text-slate-400">
                            Available across this window
                          </div>
                        ) : (
                          visibleAllocations.map((alloc) => {
                            const proj = projectMap.get(alloc.projectId);
                            const clampedStart =
                              alloc.startDate < windowStart ? windowStart : alloc.startDate;
                            const clampedEnd =
                              alloc.endDate > windowEnd ? windowEnd : alloc.endDate;

                            const offsetDays =
                              diffDaysInclusive(windowStart, clampedStart) - 1;
                            const spanDays = diffDaysInclusive(clampedStart, clampedEnd);

                            const leftPct = Math.max(0, (offsetDays / totalDays) * 100);
                            const widthPct = Math.min(
                              100 - leftPct,
                              (spanDays / totalDays) * 100
                            );

                            return (
                              <div key={alloc.id} className="relative h-6 w-full">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAllocation(alloc);
                                    setDefaultEmployeeId(undefined);
                                    setModalOpen(true);
                                  }}
                                  style={{
                                    left: `${leftPct}%`,
                                    width: `${Math.max(widthPct, 6)}%`,
                                    backgroundColor:
                                      alloc.status === 'Flagged'
                                        ? '#dc2626'
                                        : proj?.color ?? '#2563eb',
                                  }}
                                  className={cn(
                                    'absolute top-0 flex h-6 items-center justify-between gap-1.5 overflow-hidden rounded px-2 text-left text-[11px] font-medium text-white shadow-2xs transition-opacity hover:opacity-90',
                                    alloc.status === 'Tentative' &&
                                      'opacity-80 ring-1 ring-inset ring-white/50'
                                  )}
                                  title={`${proj?.name ?? alloc.projectId} · ${alloc.effortPct}% (${alloc.startDate} to ${alloc.endDate})`}
                                >
                                  <span className="truncate">
                                    {proj?.code ?? 'PRJ'} · {proj?.name}
                                  </span>
                                  <span className="shrink-0 font-semibold tabular-nums">
                                    {alloc.effortPct}%
                                  </span>
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <AllocationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAllocation(null);
          setDefaultEmployeeId(undefined);
        }}
        existingAllocation={editingAllocation}
        defaultEmployeeId={defaultEmployeeId}
      />
    </div>
  );
}
