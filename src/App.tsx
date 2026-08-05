import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Placeholder from './components/Placeholder';
import Dashboard from './routes/Dashboard/Dashboard';
import GoalsList from './routes/Goals/GoalsList';
import GoalDetail from './routes/Goals/GoalDetail';
import Systems from './routes/Systems/Systems';
import Stats from './routes/Stats/Stats';
import Targets from './routes/Targets/Targets';
import ContextsSettings from './routes/Settings/ContextsSettings';
import Reflection from './routes/Reflection/Reflection';
import Calendar from './routes/Calendar/Calendar';

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/goals" element={<GoalsList />} />
        <Route path="/goals/:goalId" element={<GoalDetail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/systems" element={<Systems />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/targets" element={<Targets />} />
        <Route path="/settings" element={<ContextsSettings />} />
        <Route path="/reflection" element={<Reflection />} />
        <Route path="*" element={<Placeholder title="Not found" note="Nothing lives at this URL." />} />
      </Routes>
    </div>
  );
}
