import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AllocationStatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select, Textarea } from '@/components/ui/Input';
import { DEMO_TODAY } from '@/data/mockData';
import { useTeamspace } from '@/hooks/useTeamspace';
import {
  getEmployeeAllocationOnDate,
  getEmployeePeakAllocationInRange,
} from '@/utils/capacity';
import { addDays, formatDateRange, pctToHours } from '@/utils/format';

export function MyCommitmentsPage() {
  const {
    activePersona,
    allocations,
    projects,
    workloadFlags,
    flagWorkload,
  } = useTeamspace();

  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const [reason, setReason] = useState('');

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const myAllocations = useMemo(() => {
    return allocations
      .filter((a) => a.employeeId === activePersona.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [allocations, activePersona.id]);

  const currentPct = getEmployeeAllocationOnDate(
    activePersona.id,
    DEMO_TODAY,
    allocations
  );
  const { peakPct } = getEmployeePeakAllocationInRange(
    activePersona.id,
    DEMO_TODAY,
    addDays(DEMO_TODAY, 28),
    allocations
  );
  const isOver = peakPct > activePersona.maxCapacityPct;

  const myFlags = workloadFlags.filter((f) => f.employeeId === activePersona.id);

  const handleSubmitFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    flagWorkload({
      employeeId: activePersona.id,
      allocationId: selectedAllocationId || undefined,
      reason,
    });
    setFlagModalOpen(false);
    setReason('');
    setSelectedAllocationId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            My Commitments · {activePersona.name}
          </h2>
          <p className="text-xs text-slate-500">
            {activePersona.role} · {activePersona.squad} · {activePersona.weeklyCapacityHours}h/wk baseline
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSelectedAllocationId(myAllocations[0]?.id ?? '');
            setFlagModalOpen(true);
          }}
        >
          <Flag className="h-4 w-4" />
          Flag Excessive or Incorrect Allocation
        </Button>
      </div>

      {/* Capacity Banner */}
      {isOver ? (
        <div className="flex flex-col justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                Over-capacity alert: {peakPct}% peak allocation over the next 4 weeks
              </p>
              <p className="mt-0.5 text-xs text-red-800">
                Your combined commitments exceed your {activePersona.maxCapacityPct}% ({activePersona.weeklyCapacityHours}h/wk) baseline. Flag an overlap to notify your project and engineering managers.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setSelectedAllocationId(myAllocations[1]?.id ?? myAllocations[0]?.id ?? '');
              setFlagModalOpen(true);
            }}
          >
            Flag Overlap
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Current week utilization is <strong>{currentPct}%</strong> (
            {pctToHours(currentPct, activePersona.weeklyCapacityHours)}h /{' '}
            {activePersona.weeklyCapacityHours}h). No over-capacity conflicts detected.
          </span>
        </div>
      )}

      {/* Commitments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Projects ({myAllocations.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {myAllocations.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="No active project commitments"
              description="You currently have 100% available capacity."
              className="border-0 bg-transparent"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-medium text-slate-500">
                    <th className="px-4 py-2.5">Project</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Dates</th>
                    <th className="px-4 py-2.5">Effort</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myAllocations.map((alloc) => {
                    const proj = projectMap.get(alloc.projectId);
                    return (
                      <tr key={alloc.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <Link
                            to={`/projects/${alloc.projectId}`}
                            className="font-semibold text-slate-900 hover:text-blue-600"
                          >
                            {proj?.name ?? alloc.projectId}
                          </Link>
                          <p className="text-[11px] text-slate-500">{proj?.code}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {alloc.roleOnProject ?? 'Contributor'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">
                          {formatDateRange(alloc.startDate, alloc.endDate)}
                        </td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                          {alloc.effortPct}% ({pctToHours(alloc.effortPct, activePersona.weeklyCapacityHours)}h/wk)
                        </td>
                        <td className="px-4 py-3">
                          <AllocationStatusBadge status={alloc.status} />
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

      {/* Submitted Flags */}
      {myFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Workload Flags ({myFlags.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {myFlags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between px-5 py-3 text-xs">
                <div>
                  <p className="font-medium text-slate-900">{flag.reason}</p>
                  {flag.resolutionNote && (
                    <p className="mt-0.5 text-slate-500">Resolution: {flag.resolutionNote}</p>
                  )}
                </div>
                <Badge variant={flag.status === 'Resolved' ? 'success' : 'warning'}>
                  {flag.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Flag Excessive or Incorrect Allocation"
        description="Notify your project manager and engineering manager to review your workload."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSubmitFlag} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Related Allocation (Optional)
            </label>
            <Select
              value={selectedAllocationId}
              onChange={(e) => setSelectedAllocationId(e.target.value)}
            >
              <option value="">General workload / multiple projects</option>
              {myAllocations.map((a) => {
                const proj = projectMap.get(a.projectId);
                return (
                  <option key={a.id} value={a.id}>
                    {proj?.code} · {proj?.name} ({a.effortPct}%)
                  </option>
                );
              })}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              What needs attention?
            </label>
            <Textarea
              required
              rows={3}
              placeholder="e.g. FinEdge (60%) and Horizon (70%) overlap for the next 3 weeks (130% total)."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFlagModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Submit Flag</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
