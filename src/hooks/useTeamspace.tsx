import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_TODAY, INITIAL_STATE } from '@/data/mockData';
import type {
  Activity,
  Allocation,
  AllocationStatus,
  Conflict,
  Employee,
  EmployeeSkill,
  ProficiencyLevel,
  TeamspaceState,
  WorkloadFlag,
} from '@/types/teamspace';
import { detectConflicts, validateProposedAllocation } from '@/utils/capacity';
import { useToast } from './useToast';

const STORAGE_KEY = 'teamspace_demo_state_v1';

interface CreateAllocationInput {
  employeeId: string;
  projectId: string;
  effortPct: number;
  startDate: string;
  endDate: string;
  status: AllocationStatus;
  roleOnProject?: string;
  notes?: string;
}

interface MutationResult {
  ok: boolean;
  error?: string;
}

interface TeamspaceContextValue extends TeamspaceState {
  activePersona: Employee;
  conflicts: Conflict[];
  isSaving: boolean;
  setActivePersona: (employeeId: string) => void;
  createAllocation: (input: CreateAllocationInput) => Promise<MutationResult>;
  updateAllocation: (
    id: string,
    updates: Partial<Omit<Allocation, 'id' | 'createdBy'>>
  ) => Promise<MutationResult>;
  deleteAllocation: (id: string) => Promise<void>;
  upsertEmployeeSkill: (
    employeeId: string,
    skillId: string,
    proficiency: ProficiencyLevel,
    notes?: string
  ) => void;
  removeEmployeeSkill: (employeeId: string, skillId: string) => void;
  verifyAvailability: (employeeId: string) => void;
  flagWorkload: (params: {
    employeeId: string;
    allocationId?: string;
    reason: string;
  }) => void;
  resolveWorkloadFlag: (flagId: string, resolutionNote: string) => void;
  resetDemoData: () => void;
}

const TeamspaceContext = createContext<TeamspaceContextValue | null>(null);

function loadInitialState(): TeamspaceState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as TeamspaceState;
    if (
      !parsed ||
      !Array.isArray(parsed.employees) ||
      !Array.isArray(parsed.projects) ||
      !Array.isArray(parsed.allocations)
    ) {
      return INITIAL_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_STATE;
  }
}

export function TeamspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TeamspaceState>(loadInitialState);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }, [state]);

  const activePersona = useMemo(() => {
    return (
      state.employees.find((e) => e.id === state.activePersonaId) ?? state.employees[0]
    );
  }, [state.employees, state.activePersonaId]);

  const conflicts = useMemo(() => {
    return detectConflicts(state.employees, state.allocations, new Date(`${DEMO_TODAY}T12:00:00Z`));
  }, [state.employees, state.allocations]);

  const appendActivity = (
    prev: TeamspaceState,
    activity: Omit<Activity, 'id' | 'timestamp'>
  ): Activity[] => {
    const next: Activity = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    return [next, ...prev.activities].slice(0, 40);
  };

  const setActivePersona = useCallback(
    (employeeId: string) => {
      const emp = state.employees.find((e) => e.id === employeeId);
      if (!emp) return;
      setState((prev) => ({ ...prev, activePersonaId: employeeId }));
      toast({
        title: `Switched demo profile to ${emp.name}`,
        description: `${emp.role} · ${emp.squad}`,
        variant: 'info',
      });
    },
    [state.employees, toast]
  );

  const createAllocation = useCallback(
    async (input: CreateAllocationInput): Promise<MutationResult> => {
      setIsSaving(true);
      await new Promise((r) => setTimeout(r, 180));

      const employee = state.employees.find((e) => e.id === input.employeeId);
      const project = state.projects.find((p) => p.id === input.projectId);
      if (!employee || !project) {
        setIsSaving(false);
        return { ok: false, error: 'Selected employee or project was not found.' };
      }

      const validation = validateProposedAllocation({
        employee,
        effortPct: input.effortPct,
        startDate: input.startDate,
        endDate: input.endDate,
        allocations: state.allocations,
      });

      if (!validation.valid) {
        setIsSaving(false);
        toast({
          title: 'Allocation blocked',
          description: validation.reason,
          variant: 'error',
        });
        return { ok: false, error: validation.reason };
      }

      const nowIso = new Date().toISOString();
      const newAllocation: Allocation = {
        id: `alloc-${Date.now()}`,
        employeeId: input.employeeId,
        projectId: input.projectId,
        effortPct: input.effortPct,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
        roleOnProject: input.roleOnProject?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        createdBy: activePersona.name,
        lastUpdatedAt: nowIso,
      };

      setState((prev) => ({
        ...prev,
        allocations: [newAllocation, ...prev.allocations],
        lastSyncedAt: nowIso,
        activities: appendActivity(prev, {
          type: 'allocation_created',
          actorId: activePersona.id,
          actorName: activePersona.name,
          targetEmployeeId: employee.id,
          targetProjectId: project.id,
          summary: `Assigned ${employee.name} to ${project.name} at ${input.effortPct}% (${input.startDate} – ${input.endDate}).`,
        }),
      }));

      setIsSaving(false);
      toast({
        title: 'Allocation saved',
        description: `${employee.name} assigned to ${project.name} (${input.effortPct}%).`,
        variant: 'success',
      });
      return { ok: true };
    },
    [state.employees, state.projects, state.allocations, activePersona, toast]
  );

  const updateAllocation = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Allocation, 'id' | 'createdBy'>>
    ): Promise<MutationResult> => {
      setIsSaving(true);
      await new Promise((r) => setTimeout(r, 180));

      const existing = state.allocations.find((a) => a.id === id);
      if (!existing) {
        setIsSaving(false);
        return { ok: false, error: 'Allocation not found.' };
      }

      const merged = { ...existing, ...updates };
      const employee = state.employees.find((e) => e.id === merged.employeeId);
      const project = state.projects.find((p) => p.id === merged.projectId);
      if (!employee || !project) {
        setIsSaving(false);
        return { ok: false, error: 'Employee or project not found.' };
      }

      const validation = validateProposedAllocation({
        employee,
        effortPct: merged.effortPct,
        startDate: merged.startDate,
        endDate: merged.endDate,
        allocations: state.allocations,
        excludeAllocationId: id,
      });

      if (!validation.valid) {
        setIsSaving(false);
        toast({
          title: 'Update blocked',
          description: validation.reason,
          variant: 'error',
        });
        return { ok: false, error: validation.reason };
      }

      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        allocations: prev.allocations.map((a) =>
          a.id === id ? { ...merged, lastUpdatedAt: nowIso } : a
        ),
        lastSyncedAt: nowIso,
        activities: appendActivity(prev, {
          type: 'allocation_updated',
          actorId: activePersona.id,
          actorName: activePersona.name,
          targetEmployeeId: employee.id,
          targetProjectId: project.id,
          summary: `Updated ${employee.name} on ${project.name} to ${merged.effortPct}% (${merged.startDate} – ${merged.endDate}).`,
        }),
      }));

      setIsSaving(false);
      toast({
        title: 'Allocation updated',
        description: `${employee.name} on ${project.name} updated to ${merged.effortPct}%.`,
        variant: 'success',
      });
      return { ok: true };
    },
    [state.allocations, state.employees, state.projects, activePersona, toast]
  );

  const deleteAllocation = useCallback(
    async (id: string) => {
      setIsSaving(true);
      await new Promise((r) => setTimeout(r, 150));

      const existing = state.allocations.find((a) => a.id === id);
      if (!existing) {
        setIsSaving(false);
        return;
      }

      const employee = state.employees.find((e) => e.id === existing.employeeId);
      const project = state.projects.find((p) => p.id === existing.projectId);
      const nowIso = new Date().toISOString();

      setState((prev) => ({
        ...prev,
        allocations: prev.allocations.filter((a) => a.id !== id),
        lastSyncedAt: nowIso,
        activities: appendActivity(prev, {
          type: 'allocation_deleted',
          actorId: activePersona.id,
          actorName: activePersona.name,
          targetEmployeeId: existing.employeeId,
          targetProjectId: existing.projectId,
          summary: `Removed ${employee?.name ?? 'employee'} from ${project?.name ?? 'project'} (${existing.effortPct}%).`,
        }),
      }));

      setIsSaving(false);
      toast({
        title: 'Allocation removed',
        description: `${employee?.name ?? 'Employee'} unassigned from ${project?.name ?? 'project'}.`,
        variant: 'info',
      });
    },
    [state.allocations, state.employees, state.projects, activePersona, toast]
  );

  const upsertEmployeeSkill = useCallback(
    (
      employeeId: string,
      skillId: string,
      proficiency: ProficiencyLevel,
      notes?: string
    ) => {
      const emp = state.employees.find((e) => e.id === employeeId);
      const skill = state.skills.find((s) => s.id === skillId);
      if (!emp || !skill) return;

      const nowIso = new Date().toISOString();
      const updatedSkill: EmployeeSkill = {
        skillId,
        proficiency,
        notes: notes?.trim() || undefined,
        updatedBy: activePersona.name,
        updatedAt: nowIso.slice(0, 10),
      };

      setState((prev) => ({
        ...prev,
        lastSyncedAt: nowIso,
        employees: prev.employees.map((e) => {
          if (e.id !== employeeId) return e;
          const exists = e.skills.some((s) => s.skillId === skillId);
          return {
            ...e,
            skills: exists
              ? e.skills.map((s) => (s.skillId === skillId ? updatedSkill : s))
              : [...e.skills, updatedSkill],
          };
        }),
        activities: appendActivity(prev, {
          type: 'skill_updated',
          actorId: activePersona.id,
          actorName: activePersona.name,
          targetEmployeeId: employeeId,
          summary: `Updated ${emp.name}'s ${skill.name} skill (${proficiency}).`,
        }),
      }));

      toast({
        title: 'Skill profile updated',
        description: `${skill.name} (${proficiency}) saved for ${emp.name}.`,
        variant: 'success',
      });
    },
    [state.employees, state.skills, activePersona, toast]
  );

  const removeEmployeeSkill = useCallback(
    (employeeId: string, skillId: string) => {
      const emp = state.employees.find((e) => e.id === employeeId);
      const skill = state.skills.find((s) => s.id === skillId);
      if (!emp || !skill) return;

      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        lastSyncedAt: nowIso,
        employees: prev.employees.map((e) =>
          e.id === employeeId
            ? { ...e, skills: e.skills.filter((s) => s.skillId !== skillId) }
            : e
        ),
        activities: appendActivity(prev, {
          type: 'skill_updated',
          actorId: activePersona.id,
          actorName: activePersona.name,
          targetEmployeeId: employeeId,
          summary: `Removed ${skill.name} from ${emp.name}'s skill profile.`,
        }),
      }));

      toast({
        title: 'Skill removed',
        description: `${skill.name} removed from ${emp.name}'s profile.`,
        variant: 'info',
      });
    },
    [state.employees, state.skills, activePersona, toast]
  );

  const verifyAvailability = useCallback(
    (employeeId: string) => {
      const emp = state.employees.find((e) => e.id === employeeId);
      if (!emp) return;

      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        lastSyncedAt: nowIso,
        employees: prev.employees.map((e) =>
          e.id === employeeId
            ? { ...e, availabilityVerified: true, availabilityUpdatedAt: nowIso }
            : e
        ),
        activities: appendActivity(prev, {
          type: 'availability_verified',
          actorId: activePersona.id,
          actorName: activePersona.name,
          targetEmployeeId: employeeId,
          summary: `Verified current availability for ${emp.name}.`,
        }),
      }));

      toast({
        title: 'Availability verified',
        description: `${emp.name}'s availability is now marked current.`,
        variant: 'success',
      });
    },
    [state.employees, activePersona, toast]
  );

  const flagWorkload = useCallback(
    ({
      employeeId,
      allocationId,
      reason,
    }: {
      employeeId: string;
      allocationId?: string;
      reason: string;
    }) => {
      const emp = state.employees.find((e) => e.id === employeeId);
      if (!emp) return;

      const nowIso = new Date().toISOString();
      const newFlag: WorkloadFlag = {
        id: `flag-${Date.now()}`,
        employeeId,
        allocationId,
        reportedBy: activePersona.name,
        reason: reason.trim(),
        status: 'Open',
        createdAt: nowIso,
      };

      setState((prev) => ({
        ...prev,
        lastSyncedAt: nowIso,
        workloadFlags: [newFlag, ...prev.workloadFlags],
        allocations: allocationId
          ? prev.allocations.map((a) =>
              a.id === allocationId ? { ...a, status: 'Flagged', lastUpdatedAt: nowIso } : a
            )
          : prev.allocations,
        activities: appendActivity(prev, {
          type: 'workload_flagged',
          actorId: activePersona.id,
          actorName: activePersona.name,
          targetEmployeeId: employeeId,
          summary: `${activePersona.name} flagged workload for ${emp.name}: "${reason.trim()}"`,
        }),
      }));

      toast({
        title: 'Workload flag submitted',
        description: 'Project and engineering managers have been notified.',
        variant: 'warning',
      });
    },
    [state.employees, activePersona, toast]
  );

  const resolveWorkloadFlag = useCallback(
    (flagId: string, resolutionNote: string) => {
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        lastSyncedAt: nowIso,
        workloadFlags: prev.workloadFlags.map((f) =>
          f.id === flagId
            ? {
                ...f,
                status: 'Resolved',
                resolvedAt: nowIso,
                resolutionNote: resolutionNote.trim() || 'Resolved by manager',
              }
            : f
        ),
        activities: appendActivity(prev, {
          type: 'conflict_resolved',
          actorId: activePersona.id,
          actorName: activePersona.name,
          summary: `Resolved workload flag (${resolutionNote.trim() || 'adjusted allocation'}).`,
        }),
      }));

      toast({
        title: 'Flag marked resolved',
        variant: 'success',
      });
    },
    [activePersona, toast]
  );

  const resetDemoData = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
    toast({
      title: 'Demo data reset',
      description: 'All allocations, skills, and flags restored to baseline.',
      variant: 'info',
    });
  }, [toast]);

  return (
    <TeamspaceContext.Provider
      value={{
        ...state,
        activePersona,
        conflicts,
        isSaving,
        setActivePersona,
        createAllocation,
        updateAllocation,
        deleteAllocation,
        upsertEmployeeSkill,
        removeEmployeeSkill,
        verifyAvailability,
        flagWorkload,
        resolveWorkloadFlag,
        resetDemoData,
      }}
    >
      {children}
    </TeamspaceContext.Provider>
  );
}

export function useTeamspace() {
  const ctx = useContext(TeamspaceContext);
  if (!ctx) {
    throw new Error('useTeamspace must be used within a TeamspaceProvider');
  }
  return ctx;
}
