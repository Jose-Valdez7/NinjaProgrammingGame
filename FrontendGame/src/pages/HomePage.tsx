import { Link } from 'react-router-dom'
import { Play, Trophy, Settings, Info, BookOpen, Gamepad2 } from 'lucide-react'
import nivelesBg from '@/assets/images/backgrounds/fondo-niveles.png'
import katanaImg from '@/assets/images/icons/katanas.png'
import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/GameStore'
import { apiUrl, getAuthHeaders, authStorage } from '../config/env'
import { StorySequence } from '../components/StorySequence'
import logo from '@/assets/images/icons/logo.png'
import fondo from '@/assets/images/backgrounds/fondo.png'

export default function HomePage() {
  const [showStory, setShowStory] = useState(false);
  const [hasSeenStory, setHasSeenStory] = useState(false);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [maxLevelCompleted, setMaxLevelCompleted] = useState<number>(0);

  const { currentUser } = useGameStore();

  useEffect(() => {
    // Verificar si el usuario ya vio la historia en esta sesión
    const storySeen = sessionStorage.getItem('storySeen');
    if (!storySeen) {
      setIsLoadingStory(true);
      // Mostrar la historia automáticamente después de 2 segundos
      setTimeout(() => {
        setShowStory(true);
        setIsLoadingStory(false);
      }, 2000);
    } else {
      setHasSeenStory(true);
    }
  }, []);

  const handleStoryComplete = () => {
    setShowStory(false);
    setHasSeenStory(true);
    sessionStorage.setItem('storySeen', 'true');
  };

  const handleShowStory = () => {
    setIsLoadingStory(true);
    setTimeout(() => {
      setShowStory(true);
      setIsLoadingStory(false);
    }, 1000);
  };

  const loadUserProgress = useCallback(
    async (showLoader: boolean) => {
      const token = authStorage.getAccessToken();

      if (!currentUser || !token) {
        setMaxLevelCompleted(0);
        setProgressError(currentUser ? 'No se encontró un token activo. Inicia sesión nuevamente.' : null);
        if (showLoader) {
          setIsLoadingProgress(false);
        }
        return;
      }

      if (showLoader) {
        setIsLoadingProgress(true);
      }
      setProgressError(null);

      try {
        const response = await fetch(apiUrl('api/user/progress'), {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401) {
            setProgressError('Tu sesión expiró. Por favor, vuelve a iniciar sesión.');
            setMaxLevelCompleted(0);
            return;
          }
          const text = await response.text();
          throw new Error(text || 'Error al obtener el progreso');
        }

        const data = await response.json();
        setMaxLevelCompleted(Number(data?.maxLevelCompleted ?? 0));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'No se pudo cargar el progreso';
        setProgressError(message);
        setMaxLevelCompleted(0);
      } finally {
        if (showLoader) {
          setIsLoadingProgress(false);
        }
      }
    },
    [currentUser]
  );

  useEffect(() => {
    if (showLevels) {
      void loadUserProgress(true);
    }
  }, [showLevels, loadUserProgress]);

  useEffect(() => {
    if (!currentUser) {
      setMaxLevelCompleted(0);
      setProgressError(null);
      setIsLoadingProgress(false);
      return;
    }

    void loadUserProgress(false);
  }, [currentUser, loadUserProgress]);

  if (showStory) {
    return <StorySequence onComplete={handleStoryComplete} autoStart={true} />;
  }

  if (isLoadingStory) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundImage: `url(${fondo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0"></div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2 font-stick">Cargando Historia...</h2>
          <p className="text-gray-300 font-japanese">Preparando la aventura de JSON</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `url(${fondo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0"></div>
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        {/* Logo */}
        <div className="mb-12">
          <img src={logo} alt="Ninja 404 Logo" className="mx-auto h-80 w-auto mb-4 drop-shadow-[0_0_12px_rgba(0,0,0,0.6)]" />
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleShowStory}
              className="ninja-button inline-flex items-center gap-3 text-lg px-8 py-4"
            >
              <BookOpen size={24} />
              {hasSeenStory ? 'Ver Historia' : 'Ver Historia Nuevamente'}
            </button>
            
            <Link 
              to="/game" 
              className="ninja-button inline-flex items-center gap-3 text-lg px-8 py-4"
            >
              <Play size={24} />
              Jugar Ahora
            </Link>

            <button 
              onClick={() => setShowLevels(true)}
              className="ninja-button inline-flex items-center gap-3 text-lg px-8 py-4"
            >
              <Gamepad2 size={24} />
              Niveles
            </button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <Link 
              to="/ranking" 
              className="bg-black/50 hover:bg-black/70 text-white px-6 py-3 rounded-lg 
                         transition-all duration-300 flex items-center gap-2 font-stick"
            >
              <Trophy size={20} />
              Ranking
            </Link>
            
            <button 
              onClick={() => setShowHowTo(true)}
              className="bg-black/50 hover:bg-black/70 text-white px-6 py-3 rounded-lg 
                             transition-all duration-300 flex items-center gap-2 font-stick"
            >
              <Info size={20} />
              Cómo Jugar
            </button>
            
            <Link 
              to="/admin" 
              className="bg-black/50 hover:bg-black/70 text-white px-6 py-3 rounded-lg 
                         transition-all duration-300 flex items-center gap-2 font-stick"
            >
              <Settings size={20} />
              Admin
            </Link>
          </div>
        </div>

        {/* Level Modal */}
        {showLevels && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLevels(false)}
            ></div>
            <div
              className="relative z-10 w-full max-w-6xl mx-4 border border-white/10 rounded-3xl p-12 font-stick overflow-hidden"
            >
              <div
                className="absolute inset-0 bg-center bg-cover blur-md scale-105"
                style={{ backgroundImage: `url(${nivelesBg})` }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative">
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-4xl sm:text-5xl font-semibold text-white">15 Niveles de Desafío</h2>
                  <button 
                    onClick={() => setShowLevels(false)}
                    className="text-white/80 hover:text-white transition-colors px-6 py-3 rounded-xl text-lg"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-6 max-w-4xl mx-auto">
                  {Array.from({ length: 15 }, (_, i) => {
                    const levelNum = i + 1
                    // Si no hay progreso (0), solo el nivel 1 está desbloqueado
                    // Si hay progreso, los niveles hasta maxLevelCompleted + 1 están desbloqueados
                    const isUnlocked = maxLevelCompleted === 0 ? levelNum === 1 : levelNum <= maxLevelCompleted + 1
                    const isCompleted = levelNum <= maxLevelCompleted
                    const difficultyClass = i < 5 ? 'bg-green-600 hover:bg-green-700' : i < 10 ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'
                    
                    if (isUnlocked) {
                      return (
                        <Link
                          key={levelNum}
                          to="/game"
                          className={`w-24 h-24 rounded-3xl flex items-center justify-center font-bold font-stick text-white text-xl transition-colors ${
                            isCompleted ? 'bg-gray-600 border-2 border-white/30 ring-2 ring-white/20' : difficultyClass
                          }`}
                          title={isCompleted ? `Nivel ${levelNum} completado` : `Jugar nivel ${levelNum}`}
                        >
                          {levelNum}
                        </Link>
                      )
                    }
                    return (
                      <div
                        key={levelNum}
                        className="w-24 h-24 rounded-3xl relative flex items-center justify-center font-bold font-stick bg-gray-700/70 text-white/70 text-xl cursor-not-allowed select-none border border-white/10"
                        title="Bloqueado"
                        aria-label={`Nivel ${levelNum} bloqueado`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                          <img src={katanaImg} alt="katanas" aria-hidden className="w-14 h-14 sm:w-16 sm:h-16 opacity-90" />
                        </div>
                        {levelNum}
                      </div>
                    )
                  })}
                </div>
                {isLoadingProgress && (
                  <p className="text-center text-lg text-gray-300 mt-6">Cargando progreso...</p>
                )}
                {!isLoadingProgress && progressError && (
                  <p className="text-center text-lg text-red-400 mt-6">{progressError}</p>
                )}
                {!isLoadingProgress && !progressError && currentUser && (
                  <p className="text-center text-lg text-gray-300 mt-6">Niveles completados: {maxLevelCompleted}</p>
                )}
                {!currentUser && (
                  <p className="text-center text-lg text-gray-300 mt-6">Inicia sesión para guardar tu progreso.</p>
                )}
                <div className="border-t border-white/10 my-8"></div>
                <div className="flex justify-center gap-14 mt-10 text-lg sm:text-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-600 rounded"></div>
                    <span className="text-gray-300">Fácil (1-5)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-600 rounded"></div>
                    <span className="text-gray-300">Medio (6-10)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-600 rounded"></div>
                    <span className="text-gray-300">Difícil (11-15)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How To Play Modal */}
        {showHowTo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHowTo(false)}
            ></div>
            <div className="relative z-10 w-full max-w-xl mx-4 bg-black/40 border border-white/10 rounded-xl p-6 font-stick">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-white">Cómo Jugar</h2>
                <button 
                  onClick={() => setShowHowTo(false)}
                  className="text-white/80 hover:text-white transition-colors px-3 py-1 rounded"
                >
                  Cerrar
                </button>
              </div>
              <div className="text-gray-200 space-y-3 text-sm sm:text-base">
                <p>• Presiona “Jugar Ahora” para iniciar la aventura.</p>
                <p>• Completa los niveles del 1 al 15. La dificultad aumenta progresivamente.</p>
                <p>• Observa la historia para aprender pistas y mecánicas del juego.</p>
                <p>• Revisa el Ranking para comparar tu progreso con otros jugadores.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
