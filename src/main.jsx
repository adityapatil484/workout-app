import db from './db/db.js'
import { seedExerciseLibrary } from './db/seed.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

db.open()
  .then(() => seedExerciseLibrary())
  .catch((err) => console.error('Failed to open db:', err))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
