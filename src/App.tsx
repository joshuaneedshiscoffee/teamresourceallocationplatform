import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TeamspaceProvider } from '@/hooks/useTeamspace';
import { ToastProvider } from '@/hooks/useToast';
import { AppShell } from '@/layouts/AppShell';
import { AllocationsPage } from '@/pages/AllocationsPage';
import { CapacityPlannerPage } from '@/pages/CapacityPlannerPage';
import { ConflictsPage } from '@/pages/ConflictsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmployeeProfilePage } from '@/pages/EmployeeProfilePage';
import { MyCommitmentsPage } from '@/pages/MyCommitmentsPage';
import { PeoplePage } from '@/pages/PeoplePage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ProjectsPage } from '@/pages/ProjectsPage';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <TeamspaceProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/planner" element={<CapacityPlannerPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/people/:id" element={<EmployeeProfilePage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/allocations" element={<AllocationsPage />} />
              <Route path="/conflicts" element={<ConflictsPage />} />
              <Route path="/commitments" element={<MyCommitmentsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </TeamspaceProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
