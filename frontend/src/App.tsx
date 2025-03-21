import './App.css'
import { Route, Routes } from 'react-router-dom'

import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StimPage from './pages/StimPage'
import { useState } from 'react'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [isAuth, setAuth] = useState(false);

  return (
    <div className="App box-border h-screen w-screen bg-stone-900">
      <Navbar isAuth={isAuth} setAuth={setAuth}/>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path="/get-started" element={<LoginPage setAuth={setAuth}/>} />
        <Route element={<ProtectedRoute isAuth={isAuth}/>}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="/stim" element={<StimPage />} />
        <Route path="/*" element={<LandingPage />} />
      </Routes>
    </div>
  )
}

export default App
