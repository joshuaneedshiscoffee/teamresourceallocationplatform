import { useMemo, useState } from 'react';
import { ArrowUpDown, CalendarPlus, Layers, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AllocationModal } from '@/components/AllocationModal';
import { AllocationStatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import { useTeamspace } from '@/hooks/useTeamspace';
import type { Allocation, AllocationStatus } from '@/types/teamspace';
import { formatDateRange, formatRelativeTime, pctToHours } from '@/utils/format';

type SortKey = 'startDate' | 'effortPct' | 'employee';

export function AllocationsPage() {
  const { allocations, employees, projects } = useTeamspace();

  const [query, setQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AllocationStatus>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [sortAsc, setSortAsc] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allocations
      .filter((a) => {
        const emp = employeeMap.get(a.employeeId);
        const proj = projectMap.get(a.projectId);
        const matchesQuery =
          !q ||
          emp?.name.toLowerCase().includes(q) ||
          proj?.name.toLowerCase().includes(q) ||
          proj?.code.toLowerCase().includes(q) ||
          (a.roleOnProject ?? '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
        if (projectFilter && a.projectId !== projectFilter) return false;
        if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'startDate') cmp = a.startDate.localeCompare(b.startDate);
        else if (sortKey === 'effortPct') cmp = a.effortPct - b.effortPct;
        else {
          const nameA = employeeMap.get(a.employeeId)?.name ?? '';
          const nameB = employeeMap.get(b.employeeId)?.name ?? '';
          cmp = nameA.localeCompare(nameB);
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [
    allocations,
    employeeMap,
    projectMap,
    query,
    projectFilter,
    statusFilter,
    sortKey,
    sortAsc,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Allocations</h2>
          <p className="text-xs text-slate-500">
            {filtered.length} of {allocations.length} assignment records · Explicit effort & date ranges
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAllocation(null);
            setModalOpen(true);
          }}
        >
          <CalendarPlus className="h-4 w-4" />
          New Allocation
        </Button>
      </div>

      <Card className="p-3.5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee, project, or role..."
              className="pl-9"
            />
          </div>
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label="Filter by project"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'ALL' | AllocationStatus)
            }
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Tentative">Tentative</option>
            <option value="Flagged">Flagged</option>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No allocations match your filters"
          description="Adjust your search or create a new allocation."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery('');
                setProjectFilter('');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-medium text-slate-500">
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('employee')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Employee <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('effortPct')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Effort <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('startDate')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Date Range <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((alloc) => {
                  const emp = employeeMap.get(alloc.employeeId);
                  const proj = projectMap.get(alloc.projectId);
                  return (
                    <tr key={alloc.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link
                          to={`/people/${alloc.employeeId}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <Avatar initials={emp?.avatarInitials ?? '??'} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600">
                              {emp?.name ?? alloc.employeeId}
                            </p>
                            <p className="text-[11px] text-slate-500">{emp?.role}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/projects/${alloc.projectId}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {proj?.name ?? alloc.projectId}
                        </Link>
                        <p className="text-[11px] text-slate-500">
                          {proj?.code}
                          {alloc.roleOnProject ? ` · ${alloc.roleOnProject}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                        {alloc.effortPct}% ({pctToHours(alloc.effortPct, emp?.weeklyCapacityHours)}h/wk)
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">
                        {formatDateRange(alloc.startDate, alloc.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <AllocationStatusBadge status={alloc.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">
                        {formatRelativeTime(alloc.lastUpdatedAt, new Date())}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingAllocation(alloc);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AllocationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAllocation(null);
        }}
        existingAllocation={editingAllocation}
      />
    </div>
  );
}
