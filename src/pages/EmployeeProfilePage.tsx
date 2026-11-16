import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AllocationModal } from '@/components/AllocationModal';
import {
  AllocationStatusBadge,
  AvailabilityBadge,
} from '@/components/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import { DEMO_TODAY } from '@/data/mockData';
import { useTeamspace } from '@/hooks/useTeamspace';
import type { Allocation, ProficiencyLevel } from '@/types/teamspace';
import {
  getEmployeeAllocationOnDate,
  getEmployeeAvailabilityStatus,
  isAvailabilityStale,
} from '@/utils/capacity';
import { formatDateRange, pctToHours } from '@/utils/format';

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const {
    employees,
    projects,
    skills,
    allocations,
    upsertEmployeeSkill,
    removeEmployeeSkill,
    verifyAvailability,
  } = useTeamspace();

  const employee = employees.find((e) => e.id === id);

  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [skillIdInput, setSkillIdInput] = useState(skills[0]?.id ?? '');
  const [proficiencyInput, setProficiencyInput] =
    useState<ProficiencyLevel>('Intermediate');
  const [skillNotesInput, setSkillNotesInput] = useState('');

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const skillMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  if (!employee) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Employee not found"
        description="This employee record does not exist in the current workspace."
        action={
          <Link to="/people">
            <Button variant="secondary">Back to People Directory</Button>
          </Link>
        }
      />
    );
  }

  const refDate = new Date(`${DEMO_TODAY}T12:00:00Z`);
  const currentPct = getEmployeeAllocationOnDate(employee.id, DEMO_TODAY, allocations);
  const status = getEmployeeAvailabilityStatus(employee, DEMO_TODAY, allocations, refDate);
  const stale = isAvailabilityStale(employee, refDate);
  const empAllocations = allocations
    .filter((a) => a.employeeId === employee.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const handleSaveSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillIdInput) return;
    upsertEmployeeSkill(employee.id, skillIdInput, proficiencyInput, skillNotesInput);
    setSkillModalOpen(false);
    setSkillNotesInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/people"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to People Directory
        </Link>
        <Button
          onClick={() => {
            setEditingAllocation(null);
            setAllocModalOpen(true);
          }}
        >
          <CalendarPlus className="h-4 w-4" />
          Assign to Project
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar initials={employee.avatarInitials} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {employee.name}
                </h2>
                <AvailabilityBadge status={status} />
              </div>
              <p className="text-xs text-slate-600">
                {employee.role} · {employee.squad} · {employee.email}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                Capacity baseline: {employee.weeklyCapacityHours}h/week ({employee.maxCapacityPct}% max) ·
                Current load: <strong className="text-slate-900">{currentPct}%</strong> (
                {pctToHours(currentPct, employee.weeklyCapacityHours)}h/wk)
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            {stale ? (
              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>
                  Availability unverified since {employee.availabilityUpdatedAt.slice(0, 10)}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => verifyAvailability(employee.id)}
                >
                  Verify Now
                </Button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Availability verified ({employee.availabilityUpdatedAt.slice(0, 10)})
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Skills Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Profile</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSkillModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add / Update
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {employee.skills.length === 0 ? (
              <p className="p-5 text-xs text-slate-500">No skills recorded yet.</p>
            ) : (
              employee.skills.map((es) => {
                const skill = skillMap.get(es.skillId);
                return (
                  <div
                    key={es.skillId}
                    className="flex items-start justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {skill?.name ?? es.skillId}
                        </span>
                        <Badge variant="blue">{es.proficiency}</Badge>
                      </div>
                      {es.notes && (
                        <p className="mt-1 text-xs text-slate-600">{es.notes}</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-400">
                        Updated by {es.updatedBy} on {es.updatedAt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmployeeSkill(employee.id, es.skillId)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      title="Remove skill"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Project Allocations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Commitments ({empAllocations.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {empAllocations.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">
                No project allocations assigned.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-medium text-slate-500">
                      <th className="px-4 py-2.5">Project</th>
                      <th className="px-4 py-2.5">Dates</th>
                      <th className="px-4 py-2.5">Effort</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {empAllocations.map((alloc) => {
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
                            <p className="text-[11px] text-slate-500">
                              {alloc.roleOnProject ?? proj?.code}
                            </p>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-600">
                            {formatDateRange(alloc.startDate, alloc.endDate)}
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                            {alloc.effortPct}% ({pctToHours(alloc.effortPct)}h/wk)
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
                                setAllocModalOpen(true);
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
      </div>

      <AllocationModal
        open={allocModalOpen}
        onClose={() => {
          setAllocModalOpen(false);
          setEditingAllocation(null);
        }}
        existingAllocation={editingAllocation}
        defaultEmployeeId={employee.id}
      />

      <Dialog
        open={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        title="Add or Update Skill"
        description={`Maintain ${employee.name}'s searchable skill profile.`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveSkill} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Skill
            </label>
            <Select
              value={skillIdInput}
              onChange={(e) => setSkillIdInput(e.target.value)}
            >
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Proficiency Level
            </label>
            <Select
              value={proficiencyInput}
              onChange={(e) =>
                setProficiencyInput(e.target.value as ProficiencyLevel)
              }
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Proficiency Note (Optional)
            </label>
            <Input
              placeholder="e.g. Led 2 production migrations"
              value={skillNotesInput}
              onChange={(e) => setSkillNotesInput(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSkillModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Skill</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
