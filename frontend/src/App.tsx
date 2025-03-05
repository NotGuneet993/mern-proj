import './App.css'
import { Route, Routes } from 'react-router-dom'

import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Navbar />

      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path="/get-started" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </div>
  )
}

export default App
