import { Link } from 'react-router-dom'
import { Play, Trophy, Settings, Info } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ninja-dark via-ninja-purple to-ninja-blue flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Logo and Title */}
        <div className="mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 font-game">
            🥷 NINJA ENERGY QUEST
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Programa tu camino hacia la victoria. Controla al ninja con comandos de código 
            y atraviesa desafíos cada vez más complejos.
          </p>
        </div>

        {/* Game Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-white mb-2">Energía y Estrategia</h3>
            <p className="text-gray-400 text-sm">
              Recoge energía antes de cruzar la puerta. Planifica tu ruta cuidadosamente.
            </p>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-lg font-semibold text-white mb-2">Programación Visual</h3>
            <p className="text-gray-400 text-sm">
              Usa comandos como D3, I2, S1 para mover tu ninja por la cuadrícula.
            </p>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold text-white mb-2">Competencia Global</h3>
            <p className="text-gray-400 text-sm">
              Compite con otros jugadores por el menor tiempo y comandos usados.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link 
            to="/game" 
            className="ninja-button inline-flex items-center gap-3 text-lg px-8 py-4"
          >
            <Play size={24} />
            Jugar Ahora
          </Link>
          
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <Link 
              to="/ranking" 
              className="bg-black/50 hover:bg-black/70 text-white px-6 py-3 rounded-lg 
                         transition-all duration-300 flex items-center gap-2"
            >
              <Trophy size={20} />
              Ranking
            </Link>
            
            <button className="bg-black/50 hover:bg-black/70 text-white px-6 py-3 rounded-lg 
                             transition-all duration-300 flex items-center gap-2">
              <Info size={20} />
              Cómo Jugar
            </button>
            
            <Link 
              to="/admin" 
              className="bg-black/50 hover:bg-black/70 text-white px-6 py-3 rounded-lg 
                         transition-all duration-300 flex items-center gap-2"
            >
              <Settings size={20} />
              Admin
            </Link>
          </div>
        </div>

        {/* Level Preview */}
        <div className="mt-16 bg-black/20 backdrop-blur-sm rounded-lg p-8 border border-white/10">
          <h2 className="text-2xl font-semibold text-white mb-6">15 Niveles de Desafío</h2>
          <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
            {Array.from({ length: 15 }, (_, i) => (
              <div 
                key={i + 1}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center font-bold
                  ${i < 5 ? 'bg-green-600' : i < 10 ? 'bg-yellow-600' : 'bg-red-600'}
                  text-white text-sm
                `}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-gray-300">Fácil (1-5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span className="text-gray-300">Medio (6-10)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-gray-300">Difícil (11-15)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-gray-500 text-sm">
          <p>Desarrollado con ❤️ usando React, Pixi.js y TypeScript</p>
        </div>
      </div>
    </div>
  )
}
