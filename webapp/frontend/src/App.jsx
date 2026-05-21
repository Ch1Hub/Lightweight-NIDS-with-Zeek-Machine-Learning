import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import OfflineAnalysis from './pages/OfflineAnalysis'
import LiveCapture from './pages/LiveCapture'
import Alerts from './pages/Alerts'
import Models from './pages/Models'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/offline" element={<OfflineAnalysis />} />
          <Route path="/live" element={<LiveCapture />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/models" element={<Models />} />
        </Routes>
      </main>
    </div>
  )
}
