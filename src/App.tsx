import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Placeholder from './components/Placeholder';
import Dashboard from './routes/Dashboard/Dashboard';
import GoalsList from './routes/Goals/GoalsList';
import GoalDetail from './routes/Goals/GoalDetail';

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/goals" element={<GoalsList />} />
        <Route path="/goals/:goalId" element={<GoalDetail />} />
        <Route path="/systems" element={<Placeholder title="Systems" />} />
        <Route path="/stats" element={<Placeholder title="Stats" />} />
        <Route path="/targets" element={<Placeholder title="Targets" />} />
        <Route path="/settings" element={<Placeholder title="Settings" />} />
        <Route path="/reflection" element={<Placeholder title="Weekly Reflection" />} />
        <Route path="*" element={<Placeholder title="Not found" note="Nothing lives at this URL." />} />
      </Routes>
    </div>
  );
}
