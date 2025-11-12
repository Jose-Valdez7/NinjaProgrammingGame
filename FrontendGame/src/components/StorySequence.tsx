import React, { useState, useEffect, useRef } from 'react';
import { SkipForward, RotateCcw, Play, Pause } from 'lucide-react';
import videoJSON from '@/assets/images/history/video_JSON.mp4';
import fondo from '@/assets/images/backgrounds/fondo.png';
import krakeLogo from '@/assets/images/ui/Krake evolution Oscuro.png';
import movilisLogo from '@/assets/images/ui/Movilis.png';

const fullStory = `NINJA 404

Había una vez un joven programador llamado JSON, JSON era un apasionado por los ninjas y le gustaba imaginar que es un ninja, un dia se propuso a hacer un juego hiperrealista, como JSON sabia programar no le tardo mas de unos 2 meses, en cuanto probo el juego se dio cuenta que al momento de la ejecucion, tenia muchos bugs y errores, entonces se le ocurrio la maravillosa idea de entrar dentro del codigo, el hace varios meses atras estaba programando un juego con realidad aumentada utilizando las gafas de realidad virtual, cuando JSON entro al codigo vio los errores mas facil y los corrigio sin ningun problema, al momento de ejecutarlo se olvido que seguia con las gafas de realidad virtual puestas y lo ejecuto, vio que no habia ningun error y se propuso en probarlo al otro día, pero ¡Oh, sorpresa!, no podia salir del juego hasta que lo complete, aunque se veía un escenario espantoso, JSON estaba feliz ya que porfin cumpliria su sueño de ser ninja, pero el no sabia lo que le esperaba... En cuanto empezo el primer nivel no se podía mover, ya que necesitaba que alguien mas lo ayude, entonces llamo a su mejor amigo de Internet MICHIHACKER, juntos deberan completar el juego para que JSON vuelva a la vida real.`;

interface StorySequenceProps {
  onComplete?: () => void;
  autoStart?: boolean;
}

export const StorySequence: React.FC<StorySequenceProps> = ({ onComplete, autoStart = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullStory, setShowFullStory] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const resetStory = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skipToEnd = () => {
    if (onComplete) onComplete();
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (onComplete) onComplete();
  };

  // Auto-start si está habilitado
  useEffect(() => {
    if (autoStart && videoRef.current) {
      setTimeout(() => {
        videoRef.current?.play();
        setIsPlaying(true);
      }, 1000);
    }
  }, [autoStart]);

  if (showFullStory) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${fondo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="bg-black/90 backdrop-blur-sm rounded-2xl p-8 max-w-4xl w-full border border-purple-500/30 animate-fadeIn">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              NINJA 404
            </h1>
            <p className="text-gray-300 text-lg">La Historia Completa</p>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-6 mb-6 animate-slideUp">
            <p className="text-white text-lg leading-relaxed whitespace-pre-line">
              {fullStory}
            </p>
          </div>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowFullStory(false)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold hover:scale-105"
            >
              Ver Historia Visual
            </button>
            {onComplete && (
              <button
                onClick={onComplete}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 font-semibold hover:scale-105"
              >
                Comenzar Juego
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden w-screen h-screen"
      style={{
        backgroundImage: `url(${fondo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background Animation */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
      
      {/* Main Content */}
      <div className="relative w-full h-full flex flex-col">
        {/* Header - Overlay */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 animate-fadeInDown">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse drop-shadow-lg font-stick">
            NINJA 404
          </h1>
        </div>

        {/* Full Screen Video with Logos */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
          {/* Left Logo - Krake */}
          <div className="absolute left-4 md:left-20 z-20 flex items-center justify-center">
            <img 
              src={krakeLogo} 
              alt="Krake Evolution" 
              className="h-24 md:h-32 lg:h-40 object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Center Video */}
          <div className="flex-1 h-full flex items-center justify-center px-20 md:px-32 lg:px-40">
            <video
              ref={videoRef}
              src={videoJSON}
              className="w-full h-full object-contain"
              onEnded={handleVideoEnd}
              playsInline
            />
          </div>

          {/* Right Logo - Movilis */}
          <div className="absolute right-4 md:right-8 z-20 flex items-center justify-center">
            <img 
              src={movilisLogo} 
              alt="Movilis" 
              className="h-24 md:h-32 lg:h-40 object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
          
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        </div>

        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col justify-between p-6">
          {/* Top Controls */}
          <div className="flex justify-between items-start">
            {/* Skip Button */}
            <button
              onClick={skipToEnd}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-300 hover:scale-105 flex items-center gap-2 backdrop-blur-sm"
            >
              <SkipForward size={16} />
              Omitir Historia
            </button>

            {/* Play/Pause Control */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="p-3 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-all duration-300 hover:scale-110"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
            </div>
          </div>

          {/* Bottom Content */}
          <div className="space-y-6">
            {/* Story Title */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl p-6 border border-purple-400/50 transition-all duration-500 max-w-4xl mx-auto animate-slideInRight">
              <div className="text-center">
                <h3 className="text-white text-2xl font-semibold mb-2 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent font-japanese-serif">
                  NINJA 404
                </h3>
                <p className="text-white text-sm leading-relaxed animate-fadeIn font-japanese">
                  La historia de JSON y su aventura en el código
                </p>
              </div>
            </div>

            {/* Additional Actions */}
            <div className="flex justify-center gap-3">
              <button
                onClick={resetStory}
                className="px-4 py-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <RotateCcw size={16} />
                Reiniciar
              </button>
              
              <button
                onClick={() => setShowFullStory(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105"
              >
                Historia Completa
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
