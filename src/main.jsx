import db from './db/db.js'
import { seedExerciseLibrary } from './db/seed.js'
import { runMigrations } from './db/migrations.js'
import generatePlan from './lib/planGenerator.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

db.open()
  .then(() => seedExerciseLibrary())
  .then(() => runMigrations())
  .catch((err) => console.error('Failed to open db:', err))

if (import.meta.env.DEV) {
  window.db = db;
  window.generatePlan = generatePlan;
  console.log('[dev] window.db and window.generatePlan exposed for console debugging');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
