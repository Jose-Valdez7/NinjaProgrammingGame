import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GameProvider } from './store/GameStore'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RankingPage from './pages/RankingPage'
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <GameProvider>
      <Router>
        <div className="min-h-screen bg-ninja-dark">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </div>
      </Router>
    </GameProvider>
  )
}

export default App
