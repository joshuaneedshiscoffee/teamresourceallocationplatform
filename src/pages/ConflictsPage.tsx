import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AllocationModal } from '@/components/AllocationModal';
import { ConflictSeverityBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTeamspace } from '@/hooks/useTeamspace';
import type { Allocation } from '@/types/teamspace';
import { formatDateRange, formatRelativeTime } from '@/utils/format';

export function ConflictsPage() {
  const {
    conflicts,
    employees,
    projects,
    allocations,
    workloadFlags,
    verifyAvailability,
    resolveWorkloadFlag,
  } = useTeamspace();

  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const allocationMap = useMemo(
    () => new Map(allocations.map((a) => [a.id, a])),
    [allocations]
  );

  const openFlags = workloadFlags.filter((f) => f.status !== 'Resolved');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Conflicts & Alerts</h2>
        <p className="text-xs text-slate-500">
          {conflicts.length} detected system conflict(s) · {openFlags.length} open employee workload flag(s)
        </p>
      </div>

      {/* Employee Workload Flags */}
      {openFlags.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50/60">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-700" />
              <CardTitle>Employee Workload Flags ({openFlags.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {openFlags.map((flag) => {
              const emp = employeeMap.get(flag.employeeId);
              const linkedAlloc = flag.allocationId
                ? allocationMap.get(flag.allocationId)
                : undefined;
              return (
                <div
                  key={flag.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {emp?.name ?? flag.employeeId}
                      </span>
                      <Badge variant="warning">{flag.status}</Badge>
                      <span className="text-[11px] text-slate-400">
                        Reported {formatRelativeTime(flag.createdAt, new Date())}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{flag.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {linkedAlloc && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingAllocation(linkedAlloc)}
                      >
                        Adjust Allocation
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        resolveWorkloadFlag(flag.id, 'Reviewed and adjusted plan')
                      }
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* System Detected Conflicts */}
      {conflicts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          title="No active capacity conflicts"
          description="All team members are within their 40h/week capacity baseline and availability is verified."
        />
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => {
            const emp = employeeMap.get(conflict.employeeId);
            const involvedAllocs = conflict.allocationIds
              .map((id) => allocationMap.get(id))
              .filter((a): a is Allocation => Boolean(a));

            return (
              <Card
                key={conflict.id}
                className={
                  conflict.severity === 'Critical'
                    ? 'border-red-200'
                    : 'border-amber-200'
                }
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <Avatar initials={emp?.avatarInitials ?? '??'} />
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/people/${conflict.employeeId}`}
                            className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                          >
                            {emp?.name ?? conflict.employeeId}
                          </Link>
                          <ConflictSeverityBadge severity={conflict.severity} />
                          <Badge variant="outline">{conflict.type}</Badge>
                        </div>
                        <p className="text-xs text-slate-600">{conflict.description}</p>
                      </div>
                    </div>

                    {conflict.type === 'Stale Availability' && emp && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => verifyAvailability(emp.id)}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Verify Availability
                      </Button>
                    )}
                  </div>

                  {involvedAllocs.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Involved Commitments
                      </p>
                      <div className="space-y-2">
                        {involvedAllocs.map((alloc) => {
                          const proj = projectMap.get(alloc.projectId);
                          return (
                            <div
                              key={alloc.id}
                              className="flex flex-col justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs sm:flex-row sm:items-center"
                            >
                              <div>
                                <span className="font-semibold text-slate-900">
                                  {proj?.code} · {proj?.name}
                                </span>
                                <span className="ml-2 text-slate-500 tabular-nums">
                                  {formatDateRange(alloc.startDate, alloc.endDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-900 tabular-nums">
                                  {alloc.effortPct}%
                                </span>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingAllocation(alloc)}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Adjust
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AllocationModal
        open={editingAllocation !== null}
        onClose={() => setEditingAllocation(null)}
        existingAllocation={editingAllocation}
      />
    </div>
  );
}
