import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { DEMO_TODAY } from '@/data/mockData';
import { useTeamspace } from '@/hooks/useTeamspace';
import type { Allocation, AllocationStatus } from '@/types/teamspace';
import {
  findAlternativeCandidates,
  isAvailabilityStale,
  validateProposedAllocation,
} from '@/utils/capacity';
import { addDays, pctToHours } from '@/utils/format';

interface AllocationModalProps {
  open: boolean;
  onClose: () => void;
  existingAllocation?: Allocation | null;
  defaultEmployeeId?: string;
  defaultProjectId?: string;
}

export function AllocationModal({
  open,
  onClose,
  existingAllocation,
  defaultEmployeeId,
  defaultProjectId,
}: AllocationModalProps) {
  const {
    employees,
    projects,
    allocations,
    skills,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    isSaving,
  } = useTeamspace();

  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [effortPct, setEffortPct] = useState(50);
  const [startDate, setStartDate] = useState(DEMO_TODAY);
  const [endDate, setEndDate] = useState(addDays(DEMO_TODAY, 25));
  const [status, setStatus] = useState<AllocationStatus>('Confirmed');
  const [roleOnProject, setRoleOnProject] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (existingAllocation) {
      setEmployeeId(existingAllocation.employeeId);
      setProjectId(existingAllocation.projectId);
      setEffortPct(existingAllocation.effortPct);
      setStartDate(existingAllocation.startDate);
      setEndDate(existingAllocation.endDate);
      setStatus(existingAllocation.status);
      setRoleOnProject(existingAllocation.roleOnProject ?? '');
      setNotes(existingAllocation.notes ?? '');
    } else {
      setEmployeeId(defaultEmployeeId || employees[0]?.id || '');
      setProjectId(
        defaultProjectId ||
          projects.find((p) => p.status !== 'Completed')?.id ||
          projects[0]?.id ||
          ''
      );
      setEffortPct(50);
      setStartDate(DEMO_TODAY);
      setEndDate(addDays(DEMO_TODAY, 25));
      setStatus('Confirmed');
      setRoleOnProject('');
      setNotes('');
    }
  }, [open, existingAllocation, defaultEmployeeId, defaultProjectId, employees, projects]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === employeeId),
    [employees, employeeId]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const validation = useMemo(() => {
    if (!selectedEmployee) return null;
    return validateProposedAllocation({
      employee: selectedEmployee,
      effortPct: Number(effortPct) || 0,
      startDate,
      endDate,
      allocations,
      excludeAllocationId: existingAllocation?.id,
    });
  }, [selectedEmployee, effortPct, startDate, endDate, allocations, existingAllocation]);

  const isStale = useMemo(() => {
    if (!selectedEmployee) return false;
    return isAvailabilityStale(selectedEmployee, new Date(`${DEMO_TODAY}T12:00:00Z`));
  }, [selectedEmployee]);

  const alternativeCandidates = useMemo(() => {
    if (!selectedProject || !validation || validation.valid) return [];
    return findAlternativeCandidates({
      employees,
      allocations,
      requiredSkillIds: selectedProject.requiredSkills,
      startDate,
      endDate,
      neededEffortPct: Number(effortPct) || 25,
      excludeEmployeeId: employeeId,
      referenceDate: new Date(`${DEMO_TODAY}T12:00:00Z`),
    }).slice(0, 3);
  }, [
    selectedProject,
    validation,
    employees,
    allocations,
    startDate,
    endDate,
    effortPct,
    employeeId,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!employeeId || !projectId) {
      setSubmitError('Please select both an employee and a project.');
      return;
    }

    const result = existingAllocation
      ? await updateAllocation(existingAllocation.id, {
          employeeId,
          projectId,
          effortPct: Number(effortPct),
          startDate,
          endDate,
          status,
          roleOnProject,
          notes,
        })
      : await createAllocation({
          employeeId,
          projectId,
          effortPct: Number(effortPct),
          startDate,
          endDate,
          status,
          roleOnProject,
          notes,
        });

    if (!result.ok) {
      setSubmitError(result.error ?? 'Unable to save allocation.');
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!existingAllocation) return;
    await deleteAllocation(existingAllocation.id);
    onClose();
  };

  const skillNameMap = useMemo(
    () => new Map(skills.map((s) => [s.id, s.name])),
    [skills]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existingAllocation ? 'Edit Allocation' : 'Create Project Allocation'}
      description="All effort percentages are measured against a 40-hour working week baseline."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Project
            </label>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Employee
            </label>
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Effort (% of 40h/wk)
            </label>
            <Input
              type="number"
              min={5}
              max={100}
              step={5}
              value={effortPct}
              onChange={(e) => setEffortPct(Number(e.target.value))}
              required
            />
            <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
              Equals {pctToHours(Number(effortPct) || 0, selectedEmployee?.weeklyCapacityHours)}h / week
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Status
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as AllocationStatus)}
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Tentative">Tentative</option>
              <option value="Flagged">Flagged</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Role on Project (Optional)
            </label>
            <Input
              placeholder="e.g. Frontend Lead"
              value={roleOnProject}
              onChange={(e) => setRoleOnProject(e.target.value)}
            />
          </div>
        </div>

        {/* Real-time capacity & conflict preview */}
        {selectedEmployee && validation && (
          <div
            className={
              validation.valid
                ? 'rounded-md border border-slate-200 bg-slate-50 p-3 text-xs'
                : 'rounded-md border border-red-200 bg-red-50 p-3 text-xs'
            }
          >
            <div className="flex items-start gap-2">
              {validation.valid ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <div className="flex-1 space-y-1">
                <p className="font-medium text-slate-900">
                  {validation.valid
                    ? `Capacity check passed: ${validation.projectedPeakPct}% peak of ${selectedEmployee.maxCapacityPct}% max`
                    : 'Capacity conflict detected — save blocked'}
                </p>
                {!validation.valid && (
                  <p className="text-red-700">{validation.reason}</p>
                )}
                {validation.valid && (
                  <p className="text-slate-600 tabular-nums">
                    Existing peak in range: {validation.existingPeakPct}% · Proposed: +{effortPct}%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isStale && selectedEmployee && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">Unverified availability data</p>
              <p className="mt-0.5 text-amber-800">
                {selectedEmployee.name}&apos;s availability was last updated on{' '}
                {selectedEmployee.availabilityUpdatedAt.slice(0, 10)}. Confirm with their lead before treating this as final.
              </p>
            </div>
          </div>
        )}

        {/* Alternative candidates when blocked */}
        {alternativeCandidates.length > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-900">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Available alternative candidates with matching skills
            </div>
            <div className="space-y-1.5">
              {alternativeCandidates.map((cand) => (
                <div
                  key={cand.employee.id}
                  className="flex items-center justify-between rounded border border-blue-100 bg-white px-2.5 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {cand.employee.name}{' '}
                      <span className="font-normal text-slate-500">
                        · {cand.employee.role}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {cand.remainingCapacityPct}% free ({pctToHours(cand.remainingCapacityPct)}h/wk) · Matches{' '}
                      {cand.matchingSkillCount} required skill(s):{' '}
                      {cand.employee.skills
                        .filter((s) => selectedProject?.requiredSkills.includes(s.skillId))
                        .map((s) => skillNameMap.get(s.skillId))
                        .join(', ')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEmployeeId(cand.employee.id)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Notes (Optional)
          </label>
          <Textarea
            rows={2}
            placeholder="Context, deliverables, or handoff notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {submitError && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          {existingAllocation ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isSaving}
            >
              Remove Allocation
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSaving}
              disabled={validation ? !validation.valid : false}
            >
              {existingAllocation ? 'Save Changes' : 'Create Allocation'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
