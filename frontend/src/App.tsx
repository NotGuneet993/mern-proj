import './App.css'
import { Route, Routes } from 'react-router-dom'

import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StimPage from './pages/StimPage'

function App() {
  return (
    <div className="App box-border h-screen w-screen bg-stone-900">
      <Navbar />
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path="/get-started" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stim" element={<StimPage />} />
      </Routes>
    </div>
  )
}

export default App
