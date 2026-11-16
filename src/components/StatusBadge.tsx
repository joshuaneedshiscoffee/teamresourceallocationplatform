import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type {
  AllocationStatus,
  AvailabilityStatus,
  ConflictSeverity,
  ProjectStatus,
} from '@/types/teamspace';

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  switch (status) {
    case 'Available':
      return <Badge variant="success">Available</Badge>;
    case 'Partially Booked':
      return <Badge variant="blue">Partially Booked</Badge>;
    case 'At Capacity':
      return <Badge variant="neutral">At Capacity</Badge>;
    case 'Overloaded':
      return (
        <Badge variant="danger">
          <AlertTriangle className="h-3 w-3" />
          Overloaded
        </Badge>
      );
    case 'On Leave':
      return (
        <Badge variant="warning">
          <Clock className="h-3 w-3" />
          On Leave
        </Badge>
      );
    case 'Unverified':
      return (
        <Badge variant="warning">
          <ShieldAlert className="h-3 w-3" />
          Unverified
        </Badge>
      );
  }
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  switch (status) {
    case 'Active':
      return <Badge variant="blue">Active</Badge>;
    case 'Planning':
      return <Badge variant="neutral">Planning</Badge>;
    case 'At Risk':
      return <Badge variant="danger">At Risk</Badge>;
    case 'Completed':
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
  }
}

export function AllocationStatusBadge({ status }: { status: AllocationStatus }) {
  switch (status) {
    case 'Confirmed':
      return <Badge variant="success">Confirmed</Badge>;
    case 'Tentative':
      return <Badge variant="neutral">Tentative</Badge>;
    case 'Flagged':
      return <Badge variant="danger">Flagged</Badge>;
  }
}

export function ConflictSeverityBadge({ severity }: { severity: ConflictSeverity }) {
  return severity === 'Critical' ? (
    <Badge variant="danger">Critical</Badge>
  ) : (
    <Badge variant="warning">Warning</Badge>
  );
}
