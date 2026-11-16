import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarPlus, FolderKanban } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AllocationModal } from '@/components/AllocationModal';
import { AllocationStatusBadge, ProjectStatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTeamspace } from '@/hooks/useTeamspace';
import type { Allocation } from '@/types/teamspace';
import { formatDateRange, pctToHours } from '@/utils/format';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, employees, allocations, skills } = useTeamspace();

  const project = projects.find((p) => p.id === id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );
  const skillMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  if (!project) {
    return (
      <EmptyState
        icon={<FolderKanban className="h-5 w-5" />}
        title="Project not found"
        description="The requested project does not exist."
        action={
          <Link to="/projects">
            <Button variant="secondary">Back to Projects</Button>
          </Link>
        }
      />
    );
  }

  const manager = employeeMap.get(project.managerId);
  const projectAllocations = allocations
    .filter((a) => a.projectId === project.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const totalWeeklyHours = projectAllocations.reduce(
    (sum, a) => sum + pctToHours(a.effortPct),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>
        <Button
          onClick={() => {
            setEditingAllocation(null);
            setModalOpen(true);
          }}
        >
          <CalendarPlus className="h-4 w-4" />
          Assign Member
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <h2 className="text-lg font-semibold text-slate-900">
                  {project.name}
                </h2>
                <ProjectStatusBadge status={project.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {project.code} · Client: {project.client} · Timeline:{' '}
                <span className="tabular-nums">
                  {formatDateRange(project.startDate, project.endDate)}
                </span>
              </p>
            </div>

            <div className="text-xs text-slate-600 sm:text-right">
              <p>
                Project Manager:{' '}
                <span className="font-semibold text-slate-900">
                  {manager?.name ?? 'Unassigned'}
                </span>
              </p>
              <p className="mt-0.5 tabular-nums text-slate-500">
                Total staffed: {totalWeeklyHours}h/week across {projectAllocations.length} allocation(s)
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-700">{project.description}</p>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Required skills:</span>
            {project.requiredSkills.map((sid) => (
              <Badge key={sid} variant="blue">
                {skillMap.get(sid)?.name ?? sid}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Team ({projectAllocations.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {projectAllocations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No team members assigned to this project yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-medium text-slate-500">
                    <th className="px-4 py-2.5">Team Member</th>
                    <th className="px-4 py-2.5">Project Role</th>
                    <th className="px-4 py-2.5">Dates</th>
                    <th className="px-4 py-2.5">Effort</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectAllocations.map((alloc) => {
                    const emp = employeeMap.get(alloc.employeeId);
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
                        <td className="px-4 py-3 text-slate-700">
                          {alloc.roleOnProject ?? 'Contributor'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">
                          {formatDateRange(alloc.startDate, alloc.endDate)}
                        </td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                          {alloc.effortPct}% ({pctToHours(alloc.effortPct, emp?.weeklyCapacityHours)}h/wk)
                        </td>
                        <td className="px-4 py-3">
                          <AllocationStatusBadge status={alloc.status} />
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
          )}
        </CardContent>
      </Card>

      <AllocationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAllocation(null);
        }}
        existingAllocation={editingAllocation}
        defaultProjectId={project.id}
      />
    </div>
  );
}
