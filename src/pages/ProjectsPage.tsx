import { useMemo, useState } from 'react';
import { CalendarPlus, FolderKanban, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AllocationModal } from '@/components/AllocationModal';
import { ProjectStatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import { useTeamspace } from '@/hooks/useTeamspace';
import type { ProjectStatus } from '@/types/teamspace';
import { formatDateRange } from '@/utils/format';

export function ProjectsPage() {
  const { projects, employees, allocations, skills } = useTeamspace();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [assignProjectId, setAssignProjectId] = useState<string | null>(null);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );
  const skillMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, query, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          <p className="text-xs text-slate-500">
            {filtered.length} of {projects.length} projects · Track timelines, managers, and staffed headcount
          </p>
        </div>
        <Button
          onClick={() =>
            setAssignProjectId(
              projects.find((p) => p.status !== 'Completed')?.id ?? projects[0]?.id ?? ''
            )
          }
        >
          <CalendarPlus className="h-4 w-4" />
          Assign Member
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by project name, code, or client..."
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ProjectStatus)}
            aria-label="Filter by project status"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="At Risk">At Risk</option>
            <option value="Planning">Planning</option>
            <option value="Completed">Completed</option>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title="No matching projects"
          description="Try adjusting your search query or status filter."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery('');
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
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Project Manager</th>
                  <th className="px-4 py-3">Timeline</th>
                  <th className="px-4 py-3">Required Skills</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((proj) => {
                  const manager = employeeMap.get(proj.managerId);
                  const projAllocs = allocations.filter((a) => a.projectId === proj.id);
                  const uniqueEmployees = new Set(projAllocs.map((a) => a.employeeId)).size;

                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link
                          to={`/projects/${proj.id}`}
                          className="group flex items-start gap-2.5"
                        >
                          <span
                            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: proj.color }}
                          />
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-blue-600">
                              {proj.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {proj.code} · {proj.client}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <ProjectStatusBadge status={proj.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {manager ? (
                          <Link
                            to={`/people/${manager.id}`}
                            className="font-medium hover:text-blue-600"
                          >
                            {manager.name}
                          </Link>
                        ) : (
                          'Unassigned'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate-600">
                        {formatDateRange(proj.startDate, proj.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {proj.requiredSkills.slice(0, 3).map((sid) => (
                            <Badge key={sid} variant="outline">
                              {skillMap.get(sid)?.name ?? sid}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 tabular-nums">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {uniqueEmployees}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link to={`/projects/${proj.id}`}>
                            <Button variant="ghost" size="sm">
                              Details
                            </Button>
                          </Link>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setAssignProjectId(proj.id)}
                          >
                            Staff
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
        open={assignProjectId !== null}
        onClose={() => setAssignProjectId(null)}
        defaultProjectId={assignProjectId ?? undefined}
      />
    </div>
  );
}
