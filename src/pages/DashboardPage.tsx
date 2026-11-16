import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  FolderKanban,
  Gauge,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AllocationModal } from '@/components/AllocationModal';
import { ConflictSeverityBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DEMO_TODAY } from '@/data/mockData';
import { useTeamspace } from '@/hooks/useTeamspace';
import {
  computeWeeklyCapacitySeries,
  getEmployeeAllocationOnDate,
} from '@/utils/capacity';
import { formatRelativeTime } from '@/utils/format';

export function DashboardPage() {
  const { employees, projects, allocations, conflicts, activities, activePersona } =
    useTeamspace();
  const [modalOpen, setModalOpen] = useState(false);

  const metrics = useMemo(() => {
    const activeProjectsCount = projects.filter(
      (p) => p.status === 'Active' || p.status === 'At Risk'
    ).length;

    let sumAllocation = 0;
    let overCapacityCount = 0;

    for (const emp of employees) {
      const pct = getEmployeeAllocationOnDate(emp.id, DEMO_TODAY, allocations);
      sumAllocation += pct;
      if (pct > emp.maxCapacityPct) overCapacityCount++;
    }

    const avgAllocation = employees.length
      ? Math.round(sumAllocation / employees.length)
      : 0;

    return {
      totalEmployees: employees.length,
      activeProjectsCount,
      avgAllocation,
      overCapacityCount,
    };
  }, [employees, projects, allocations]);

  const weeklySeries = useMemo(() => {
    return computeWeeklyCapacitySeries(employees, allocations, DEMO_TODAY, 8);
  }, [employees, allocations]);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Welcome back, {activePersona.name.split(' ')[0]}
          </h2>
          <p className="text-xs text-slate-500">
            8-week organization capacity snapshot starting Nov 16, 2026 · 40h/wk baseline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/planner">
            <Button variant="secondary" size="md">
              Open Capacity Planner
            </Button>
          </Link>
          <Button size="md" onClick={() => setModalOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Create Allocation
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Employees</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
                {metrics.totalEmployees}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Across 6 squads</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Active Projects</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
                {metrics.activeProjectsCount}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {projects.length} total tracked
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-blue-600">
              <FolderKanban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Average Allocation</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
                {metrics.avgAllocation}%
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Current week utilization
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-600">
              <Gauge className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            metrics.overCapacityCount > 0 ? 'border-red-200 bg-red-50/30' : undefined
          }
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Over Capacity</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
                {metrics.overCapacityCount}
              </p>
              <Link
                to="/conflicts"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-red-700 hover:underline"
              >
                Review conflicts <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Team Capacity Overview Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Team Capacity Overview (Next 8 Weeks)</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Average allocated vs. remaining team capacity per week
              </p>
            </div>
            <Link
              to="/planner"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View timeline
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklySeries}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="allocatedPct"
                    name="Allocated %"
                    stackId="cap"
                    fill="#2563eb"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="availablePct"
                    name="Available %"
                    stackId="cap"
                    fill="#e2e8f0"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Allocation Conflicts */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation Conflicts</CardTitle>
            <Link
              to="/conflicts"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Manage ({conflicts.length})
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {conflicts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No active conflicts detected.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {conflicts.slice(0, 4).map((conflict) => {
                  const emp = employeeMap.get(conflict.employeeId);
                  return (
                    <div key={conflict.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar initials={emp?.avatarInitials ?? '??'} size="sm" />
                          <div>
                            <Link
                              to={`/people/${conflict.employeeId}`}
                              className="text-xs font-semibold text-slate-900 hover:text-blue-600"
                            >
                              {emp?.name ?? 'Unknown'}
                            </Link>
                            <p className="text-[11px] text-slate-500">{conflict.type}</p>
                          </div>
                        </div>
                        <ConflictSeverityBadge severity={conflict.severity} />
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        {conflict.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Allocation Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Allocation Activity</CardTitle>
          <Link
            to="/allocations"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            All allocations
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {activities.slice(0, 6).map((act) => (
              <div
                key={act.id}
                className="flex flex-col justify-between gap-1 px-5 py-3 sm:flex-row sm:items-center"
              >
                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">{act.actorName}</span>{' '}
                  <span>{act.summary}</span>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                  {formatRelativeTime(act.timestamp, new Date(`${DEMO_TODAY}T12:00:00Z`))}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AllocationModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
