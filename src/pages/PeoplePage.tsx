import { useMemo, useState } from 'react';
import { ArrowUpDown, CalendarPlus, Search, ShieldAlert, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AllocationModal } from '@/components/AllocationModal';
import { AvailabilityBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import { DEMO_TODAY } from '@/data/mockData';
import { useTeamspace } from '@/hooks/useTeamspace';
import type { AvailabilityStatus } from '@/types/teamspace';
import { cn } from '@/utils/cn';
import {
  getEmployeeAllocationOnDate,
  getEmployeeAvailabilityStatus,
  isAvailabilityStale,
} from '@/utils/capacity';
import { pctToHours } from '@/utils/format';

type SortField = 'name' | 'allocation' | 'role';

export function PeoplePage() {
  const { employees, skills, allocations } = useTeamspace();

  const [query, setQuery] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AvailabilityStatus>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [allocateForEmployeeId, setAllocateForEmployeeId] = useState<string | null>(null);

  const skillMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  const enriched = useMemo(() => {
    const refDate = new Date(`${DEMO_TODAY}T12:00:00Z`);
    return employees.map((emp) => {
      const currentPct = getEmployeeAllocationOnDate(emp.id, DEMO_TODAY, allocations);
      const status = getEmployeeAvailabilityStatus(emp, DEMO_TODAY, allocations, refDate);
      const stale = isAvailabilityStale(emp, refDate);
      return { emp, currentPct, status, stale };
    });
  }, [employees, allocations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = enriched.filter(({ emp, status }) => {
      const matchesQuery =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.squad.toLowerCase().includes(q);
      if (!matchesQuery) return false;

      if (selectedSkillId && !emp.skills.some((s) => s.skillId === selectedSkillId)) {
        return false;
      }

      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.emp.name.localeCompare(b.emp.name);
      else if (sortField === 'role') cmp = a.emp.role.localeCompare(b.emp.role);
      else cmp = a.currentPct - b.currentPct;
      return sortAsc ? cmp : -cmp;
    });
  }, [enriched, query, selectedSkillId, statusFilter, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">People Directory</h2>
          <p className="text-xs text-slate-500">
            {filtered.length} of {employees.length} team members · Current week utilization (40h baseline)
          </p>
        </div>
        <Button onClick={() => setAllocateForEmployeeId(employees[0]?.id ?? '')}>
          <CalendarPlus className="h-4 w-4" />
          Assign to Project
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, or squad..."
              className="pl-9"
            />
          </div>

          <Select
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
            aria-label="Filter by skill"
          >
            <option value="">All Skills</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category})
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'ALL' | AvailabilityStatus)
            }
            aria-label="Filter by availability"
          >
            <option value="ALL">All Availability</option>
            <option value="Available">Available</option>
            <option value="Partially Booked">Partially Booked</option>
            <option value="At Capacity">At Capacity</option>
            <option value="Overloaded">Overloaded</option>
            <option value="Unverified">Unverified / Stale</option>
            <option value="On Leave">On Leave</option>
          </Select>
        </div>

        {(query || selectedSkillId || statusFilter !== 'ALL') && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
            <span>Active filters:</span>
            {selectedSkillId && (
              <Badge variant="blue">
                Skill: {skillMap.get(selectedSkillId)?.name}
                <button
                  type="button"
                  onClick={() => setSelectedSkillId('')}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== 'ALL' && (
              <Badge variant="neutral">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="ml-1 hover:text-slate-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedSkillId('');
                setStatusFilter('ALL');
              }}
              className="font-medium text-blue-600 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </Card>

      {/* People Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="No matching team members"
          description="Try broadening your search query, skill filter, or availability status."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery('');
                setSelectedSkillId('');
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
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Employee <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('role')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Role & Squad <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Skills</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('allocation')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Current Load <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ emp, currentPct, status, stale }) => {
                  const isOver = currentPct > emp.maxCapacityPct;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link
                          to={`/people/${emp.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <Avatar initials={emp.avatarInitials} />
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-blue-600">
                              {emp.name}
                            </p>
                            <p className="text-xs text-slate-500">{emp.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-800">{emp.role}</p>
                        <p className="text-xs text-slate-500">{emp.squad}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {emp.skills.slice(0, 3).map((es) => (
                            <Badge key={es.skillId} variant="outline">
                              {skillMap.get(es.skillId)?.name ?? es.skillId}
                            </Badge>
                          ))}
                          {emp.skills.length > 3 && (
                            <Badge variant="neutral">+{emp.skills.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <AvailabilityBadge status={status} />
                          {stale && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                              <ShieldAlert className="h-3 w-3" />
                              Updated {emp.availabilityUpdatedAt.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-xs tabular-nums">
                            <span
                              className={cn(
                                'font-semibold',
                                isOver ? 'text-red-700' : 'text-slate-900'
                              )}
                            >
                              {currentPct}%
                            </span>
                            <span className="text-slate-500">
                              {pctToHours(currentPct, emp.weeklyCapacityHours)}h /{' '}
                              {emp.weeklyCapacityHours}h
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                isOver
                                  ? 'bg-red-600'
                                  : currentPct >= emp.maxCapacityPct
                                    ? 'bg-slate-600'
                                    : 'bg-blue-600'
                              )}
                              style={{ width: `${Math.min(100, currentPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link to={`/people/${emp.id}`}>
                            <Button variant="ghost" size="sm">
                              Profile
                            </Button>
                          </Link>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setAllocateForEmployeeId(emp.id)}
                          >
                            Allocate
                          </Button>
                        </div>
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
        open={allocateForEmployeeId !== null}
        onClose={() => setAllocateForEmployeeId(null)}
        defaultEmployeeId={allocateForEmployeeId ?? undefined}
      />
    </div>
  );
}
