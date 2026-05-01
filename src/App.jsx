import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProfileGate from './components/ProfileGate';
import Onboarding from './pages/Onboarding';
import Today from './pages/Today';
import Plan from './pages/Plan';
import LogSession from './pages/LogSession';
import LogExercise from './pages/LogExercise';
import LogSummary from './pages/LogSummary';
import History from './pages/History';
import Progress from './pages/Progress';
import Exercises from './pages/Exercises';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import About from './pages/About';
import ExerciseDetail from './pages/ExerciseDetail';
import PlanDay from './pages/PlanDay';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route element={<ProfileGate />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<Layout />}>
            <Route path="/today" element={<Today />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/log/:sessionId" element={<LogSession />} />
          <Route path="/log/:sessionId/exercise/:exerciseId" element={<LogExercise />} />
          <Route path="/log/:sessionId/summary" element={<LogSummary />} />
          <Route path="/history" element={<History />} />
          <Route path="/plan/day/:dayIndex" element={<PlanDay />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:exerciseId" element={<ExerciseDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
