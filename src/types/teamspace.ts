export type RoleType =
  | 'Engineering Manager'
  | 'Project Manager'
  | 'Software Developer'
  | 'Senior Software Engineer'
  | 'Product Designer'
  | 'QA Engineer'
  | 'DevOps Engineer'
  | 'Data Engineer';

export type SkillCategory =
  | 'Frontend'
  | 'Backend'
  | 'Cloud & DevOps'
  | 'Data & ML'
  | 'Design & UX'
  | 'QA & Testing';

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type AvailabilityStatus =
  | 'Available'
  | 'Partially Booked'
  | 'At Capacity'
  | 'Overloaded'
  | 'On Leave'
  | 'Unverified';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

export interface EmployeeSkill {
  skillId: string;
  proficiency: ProficiencyLevel;
  notes?: string;
  updatedBy: string;
  updatedAt: string; // ISO date string
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  squad: string;
  /** Baseline weekly capacity in hours (40h = 100%) */
  weeklyCapacityHours: number;
  /** Max permitted allocation % (usually 100, or 80 for part-time) */
  maxCapacityPct: number;
  skills: EmployeeSkill[];
  /** ISO timestamp of when availability was last confirmed */
  availabilityUpdatedAt: string;
  /** Whether availability has been verified by a lead/employee recently */
  availabilityVerified: boolean;
  /** Optional approved leave window */
  leaveRange?: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    reason: string;
  };
  avatarInitials: string;
  isPersona?: boolean;
}

export type ProjectStatus = 'Active' | 'Planning' | 'At Risk' | 'Completed';

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  status: ProjectStatus;
  managerId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description: string;
  requiredSkills: string[]; // skillIds
  color: string; // restrained accent hex for timeline blocks
}

export type AllocationStatus = 'Confirmed' | 'Tentative' | 'Flagged';

export interface Allocation {
  id: string;
  employeeId: string;
  projectId: string;
  effortPct: number; // e.g., 50 = 50% of 40h = 20h/week
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: AllocationStatus;
  roleOnProject?: string;
  notes?: string;
  createdBy: string;
  lastUpdatedAt: string; // ISO timestamp
}

export type ConflictSeverity = 'Critical' | 'Warning';

export type ConflictType = 'Over-Capacity' | 'Stale Availability' | 'Leave Overlap';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  employeeId: string;
  allocationIds: string[];
  peakAllocationPct: number;
  overlapStartDate: string;
  overlapEndDate: string;
  description: string;
}

export type WorkloadFlagStatus = 'Open' | 'Under Review' | 'Resolved';

export interface WorkloadFlag {
  id: string;
  employeeId: string;
  allocationId?: string;
  reportedBy: string;
  reason: string;
  status: WorkloadFlagStatus;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export type ActivityType =
  | 'allocation_created'
  | 'allocation_updated'
  | 'allocation_deleted'
  | 'skill_updated'
  | 'workload_flagged'
  | 'availability_verified'
  | 'conflict_resolved';

export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  targetEmployeeId?: string;
  targetProjectId?: string;
  summary: string;
  timestamp: string; // ISO timestamp
}

export interface TeamspaceState {
  employees: Employee[];
  projects: Project[];
  skills: Skill[];
  allocations: Allocation[];
  workloadFlags: WorkloadFlag[];
  activities: Activity[];
  activePersonaId: string;
  lastSyncedAt: string;
}
