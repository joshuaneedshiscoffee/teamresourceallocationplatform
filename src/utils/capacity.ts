import type {
  Allocation,
  AvailabilityStatus,
  Conflict,
  Employee,
  ProficiencyLevel,
} from '@/types/teamspace';
import { addDays, parseIsoDate, toIsoDate } from './format';

export const STALE_AVAILABILITY_DAYS = 14;

/**
 * Checks whether two inclusive YYYY-MM-DD date ranges overlap.
 */
export function doDateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA <= endB && startB <= endA;
}

/**
 * Sums effortPct for all allocations of an employee active on a specific YYYY-MM-DD date.
 */
export function getEmployeeAllocationOnDate(
  employeeId: string,
  date: string,
  allocations: Allocation[],
  excludeAllocationId?: string
): number {
  return allocations
    .filter(
      (a) =>
        a.employeeId === employeeId &&
        a.id !== excludeAllocationId &&
        a.startDate <= date &&
        a.endDate >= date
    )
    .reduce((sum, a) => sum + a.effortPct, 0);
}

/**
 * Returns the peak (maximum) daily allocation percentage for an employee
 * across an inclusive date range [startDate, endDate].
 */
export function getEmployeePeakAllocationInRange(
  employeeId: string,
  startDate: string,
  endDate: string,
  allocations: Allocation[],
  excludeAllocationId?: string
): { peakPct: number; peakDate: string | null; overlappingAllocations: Allocation[] } {
  const relevant = allocations.filter(
    (a) =>
      a.employeeId === employeeId &&
      a.id !== excludeAllocationId &&
      doDateRangesOverlap(a.startDate, a.endDate, startDate, endDate)
  );

  if (relevant.length === 0) {
    return { peakPct: 0, peakDate: null, overlappingAllocations: [] };
  }

  // Evaluate at every boundary date within [startDate, endDate]
  const candidateDates = new Set<string>([startDate, endDate]);
  for (const alloc of relevant) {
    if (alloc.startDate >= startDate && alloc.startDate <= endDate) {
      candidateDates.add(alloc.startDate);
    }
    if (alloc.endDate >= startDate && alloc.endDate <= endDate) {
      candidateDates.add(alloc.endDate);
    }
  }

  let peakPct = 0;
  let peakDate: string | null = null;

  for (const d of candidateDates) {
    const dayTotal = relevant
      .filter((a) => a.startDate <= d && a.endDate >= d)
      .reduce((sum, a) => sum + a.effortPct, 0);
    if (dayTotal > peakPct) {
      peakPct = dayTotal;
      peakDate = d;
    }
  }

  return {
    peakPct,
    peakDate,
    overlappingAllocations: relevant,
  };
}

/**
 * Calculates remaining capacity percentage for an employee in a date range.
 * Only allocations active within [startDate, endDate] count towards capacity.
 */
export function getRemainingCapacityInRange(
  employee: Employee,
  startDate: string,
  endDate: string,
  allocations: Allocation[],
  excludeAllocationId?: string
): number {
  const { peakPct } = getEmployeePeakAllocationInRange(
    employee.id,
    startDate,
    endDate,
    allocations,
    excludeAllocationId
  );

  if (
    employee.leaveRange &&
    doDateRangesOverlap(startDate, endDate, employee.leaveRange.startDate, employee.leaveRange.endDate)
  ) {
    return 0;
  }

  return Math.max(0, employee.maxCapacityPct - peakPct);
}

/**
 * Checks if an employee's availability data is stale (> 14 days old) or unverified.
 */
export function isAvailabilityStale(
  employee: Employee,
  referenceDate: Date = new Date()
): boolean {
  if (!employee.availabilityVerified) return true;
  const updated = new Date(employee.availabilityUpdatedAt);
  const diffDays = (referenceDate.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > STALE_AVAILABILITY_DAYS;
}

/**
 * Determines an employee's availability status on a given YYYY-MM-DD date.
 */
export function getEmployeeAvailabilityStatus(
  employee: Employee,
  date: string,
  allocations: Allocation[],
  referenceDate: Date = new Date()
): AvailabilityStatus {
  if (
    employee.leaveRange &&
    date >= employee.leaveRange.startDate &&
    date <= employee.leaveRange.endDate
  ) {
    return 'On Leave';
  }

  const pct = getEmployeeAllocationOnDate(employee.id, date, allocations);
  if (pct > employee.maxCapacityPct) return 'Overloaded';
  if (isAvailabilityStale(employee, referenceDate)) return 'Unverified';
  if (pct === employee.maxCapacityPct) return 'At Capacity';
  if (pct > 0) return 'Partially Booked';
  return 'Available';
}

/**
 * Validates whether a proposed allocation would exceed the employee's max capacity (100%)
 * or overlap approved leave.
 */
export function validateProposedAllocation(params: {
  employee: Employee;
  effortPct: number;
  startDate: string;
  endDate: string;
  allocations: Allocation[];
  excludeAllocationId?: string;
}): {
  valid: boolean;
  reason?: string;
  projectedPeakPct: number;
  existingPeakPct: number;
  overlappingAllocations: Allocation[];
} {
  const { employee, effortPct, startDate, endDate, allocations, excludeAllocationId } = params;

  if (!startDate || !endDate || startDate > endDate) {
    return {
      valid: false,
      reason: 'End date must be on or after the start date.',
      projectedPeakPct: 0,
      existingPeakPct: 0,
      overlappingAllocations: [],
    };
  }

  if (effortPct <= 0 || effortPct > 100) {
    return {
      valid: false,
      reason: 'Effort percentage must be between 1% and 100%.',
      projectedPeakPct: 0,
      existingPeakPct: 0,
      overlappingAllocations: [],
    };
  }

  if (
    employee.leaveRange &&
    doDateRangesOverlap(startDate, endDate, employee.leaveRange.startDate, employee.leaveRange.endDate)
  ) {
    return {
      valid: false,
      reason: `${employee.name} has approved leave from ${employee.leaveRange.startDate} to ${employee.leaveRange.endDate}.`,
      projectedPeakPct: effortPct,
      existingPeakPct: 0,
      overlappingAllocations: [],
    };
  }

  const { peakPct: existingPeakPct, peakDate, overlappingAllocations } =
    getEmployeePeakAllocationInRange(
      employee.id,
      startDate,
      endDate,
      allocations,
      excludeAllocationId
    );

  const projectedPeakPct = existingPeakPct + effortPct;

  if (projectedPeakPct > employee.maxCapacityPct) {
    return {
      valid: false,
      reason: `Exceeds ${employee.name}'s ${employee.maxCapacityPct}% capacity (${projectedPeakPct}% peak${
        peakDate ? ` on ${peakDate}` : ''
      } across ${overlappingAllocations.length + 1} commitments).`,
      projectedPeakPct,
      existingPeakPct,
      overlappingAllocations,
    };
  }

  return {
    valid: true,
    projectedPeakPct,
    existingPeakPct,
    overlappingAllocations,
  };
}

/**
 * Detects all active conflicts across the organization:
 * - Over-Capacity (> maxCapacityPct)
 * - Leave Overlap
 * - Stale Availability
 */
export function detectConflicts(
  employees: Employee[],
  allocations: Allocation[],
  referenceDate: Date = new Date()
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const emp of employees) {
    const empAllocs = allocations.filter((a) => a.employeeId === emp.id);

    // 1. Check Over-Capacity across all allocation boundary dates
    if (empAllocs.length > 0) {
      const dates = Array.from(
        new Set(empAllocs.flatMap((a) => [a.startDate, a.endDate]))
      ).sort();

      let maxPct = 0;
      let conflictStart = '';
      let conflictEnd = '';
      const involvedIds = new Set<string>();

      for (const d of dates) {
        const activeOnDay = empAllocs.filter((a) => a.startDate <= d && a.endDate >= d);
        const total = activeOnDay.reduce((s, a) => s + a.effortPct, 0);
        if (total > emp.maxCapacityPct) {
          if (total > maxPct) maxPct = total;
          if (!conflictStart || d < conflictStart) conflictStart = d;
          if (!conflictEnd || d > conflictEnd) conflictEnd = d;
          activeOnDay.forEach((a) => involvedIds.add(a.id));
        }
      }

      if (maxPct > emp.maxCapacityPct) {
        conflicts.push({
          id: `conflict-over-${emp.id}`,
          type: 'Over-Capacity',
          severity: 'Critical',
          employeeId: emp.id,
          allocationIds: Array.from(involvedIds),
          peakAllocationPct: maxPct,
          overlapStartDate: conflictStart,
          overlapEndDate: conflictEnd,
          description: `${emp.name} is allocated at ${maxPct}% (exceeds ${emp.maxCapacityPct}% baseline) between ${conflictStart} and ${conflictEnd}.`,
        });
      }
    }

    // 2. Check Leave Overlap
    if (emp.leaveRange) {
      const leaveOverlaps = empAllocs.filter((a) =>
        doDateRangesOverlap(
          a.startDate,
          a.endDate,
          emp.leaveRange!.startDate,
          emp.leaveRange!.endDate
        )
      );
      if (leaveOverlaps.length > 0) {
        conflicts.push({
          id: `conflict-leave-${emp.id}`,
          type: 'Leave Overlap',
          severity: 'Critical',
          employeeId: emp.id,
          allocationIds: leaveOverlaps.map((a) => a.id),
          peakAllocationPct: leaveOverlaps.reduce((s, a) => s + a.effortPct, 0),
          overlapStartDate: emp.leaveRange.startDate,
          overlapEndDate: emp.leaveRange.endDate,
          description: `${emp.name} has ${leaveOverlaps.length} allocation(s) overlapping approved leave (${emp.leaveRange.startDate} – ${emp.leaveRange.endDate}).`,
        });
      }
    }

    // 3. Check Stale Availability
    if (isAvailabilityStale(emp, referenceDate)) {
      const today = toIsoDate(referenceDate);
      conflicts.push({
        id: `conflict-stale-${emp.id}`,
        type: 'Stale Availability',
        severity: 'Warning',
        employeeId: emp.id,
        allocationIds: empAllocs.map((a) => a.id),
        peakAllocationPct: getEmployeeAllocationOnDate(emp.id, today, allocations),
        overlapStartDate: today,
        overlapEndDate: addDays(today, 14),
        description: `${emp.name}'s availability has not been verified recently (last updated ${emp.availabilityUpdatedAt.slice(0, 10)}).`,
      });
    }
  }

  return conflicts.sort((a, b) => {
    if (a.severity === b.severity) return b.peakAllocationPct - a.peakAllocationPct;
    return a.severity === 'Critical' ? -1 : 1;
  });
}

const PROFICIENCY_SCORE: Record<ProficiencyLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
};

/**
 * Searches employees by required skill IDs and optional query string.
 */
export function searchEmployeesBySkills(
  employees: Employee[],
  requiredSkillIds: string[],
  searchQuery = ''
): Employee[] {
  const q = searchQuery.trim().toLowerCase();
  return employees.filter((emp) => {
    const matchesQuery =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.squad.toLowerCase().includes(q);
    if (!matchesQuery) return false;

    if (requiredSkillIds.length === 0) return true;
    const empSkillIds = new Set(emp.skills.map((s) => s.skillId));
    return requiredSkillIds.every((id) => empSkillIds.has(id));
  });
}

export interface AlternativeCandidate {
  employee: Employee;
  remainingCapacityPct: number;
  currentPeakPct: number;
  matchingSkillCount: number;
  proficiencyScore: number;
  isStale: boolean;
}

/**
 * Finds and ranks alternative candidates who have matching skills and available capacity
 * in the requested [startDate, endDate] window.
 */
export function findAlternativeCandidates(params: {
  employees: Employee[];
  allocations: Allocation[];
  requiredSkillIds: string[];
  startDate: string;
  endDate: string;
  neededEffortPct: number;
  excludeEmployeeId?: string;
  referenceDate?: Date;
}): AlternativeCandidate[] {
  const {
    employees,
    allocations,
    requiredSkillIds,
    startDate,
    endDate,
    neededEffortPct,
    excludeEmployeeId,
    referenceDate = new Date(),
  } = params;

  const candidates: AlternativeCandidate[] = [];

  for (const emp of employees) {
    if (emp.id === excludeEmployeeId) continue;

    const remainingCapacityPct = getRemainingCapacityInRange(
      emp,
      startDate,
      endDate,
      allocations
    );
    if (remainingCapacityPct < neededEffortPct) continue;

    const matchingSkills = emp.skills.filter((s) =>
      requiredSkillIds.length === 0 ? true : requiredSkillIds.includes(s.skillId)
    );
    if (requiredSkillIds.length > 0 && matchingSkills.length === 0) continue;

    const { peakPct } = getEmployeePeakAllocationInRange(
      emp.id,
      startDate,
      endDate,
      allocations
    );
    const proficiencyScore = matchingSkills.reduce(
      (sum, s) => sum + PROFICIENCY_SCORE[s.proficiency],
      0
    );

    candidates.push({
      employee: emp,
      remainingCapacityPct,
      currentPeakPct: peakPct,
      matchingSkillCount: matchingSkills.length,
      proficiencyScore,
      isStale: isAvailabilityStale(emp, referenceDate),
    });
  }

  return candidates.sort((a, b) => {
    // Prefer verified availability first
    if (a.isStale !== b.isStale) return a.isStale ? 1 : -1;
    // Prefer more matching skills
    if (a.matchingSkillCount !== b.matchingSkillCount) {
      return b.matchingSkillCount - a.matchingSkillCount;
    }
    // Prefer higher proficiency
    if (a.proficiencyScore !== b.proficiencyScore) {
      return b.proficiencyScore - a.proficiencyScore;
    }
    // Prefer more remaining capacity
    return b.remainingCapacityPct - a.remainingCapacityPct;
  });
}

/**
 * Computes weekly team utilization points for the Capacity Overview chart.
 */
export function computeWeeklyCapacitySeries(
  employees: Employee[],
  allocations: Allocation[],
  startMonday: string,
  weeks = 8
): Array<{
  weekLabel: string;
  weekStart: string;
  allocatedPct: number;
  availablePct: number;
  overAllocatedCount: number;
}> {
  const totalEmployees = employees.length || 1;
  const series = [];

  for (let i = 0; i < weeks; i++) {
    const weekStart = addDays(startMonday, i * 7);
    const weekMid = addDays(weekStart, 2); // Wednesday snapshot for weekly load
    const d = parseIsoDate(weekStart);
    const weekLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let sumPct = 0;
    let overCount = 0;

    for (const emp of employees) {
      const pct = getEmployeeAllocationOnDate(emp.id, weekMid, allocations);
      sumPct += pct;
      if (pct > emp.maxCapacityPct) overCount++;
    }

    const avgAllocated = Math.round(sumPct / totalEmployees);
    series.push({
      weekLabel,
      weekStart,
      allocatedPct: avgAllocated,
      availablePct: Math.max(0, 100 - avgAllocated),
      overAllocatedCount: overCount,
    });
  }

  return series;
}
