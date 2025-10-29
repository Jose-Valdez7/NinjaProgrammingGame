import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, SkipForward, RotateCcw } from 'lucide-react';

// Importar todas las imágenes de la historia
import image1 from '@/assets/images/history/1.png';
import image2 from '@/assets/images/history/2.png';
import image3 from '@/assets/images/history/3.png';
import image5 from '@/assets/images/history/5.png';
import image6 from '@/assets/images/history/6.png';
import image7 from '@/assets/images/history/7.png';

const storyImages = [image1, image2, image3, image5, image6, image7];

const storyParts = [
  "Había una vez un joven programador llamado Debian, Debian era un apasionado por los ninjas y le gustaba imaginar que era uno, un dia se propuso a hacer un juego hiperrealista, como Debian sabia programar no le tardo mas de unos 2 meses.",
  "En cuanto probo el juego se dio cuenta que al momento de la ejecucion, tenia muchos bugs y errores, entonces se le ocurrio la maravillosa idea de entrar dentro del codigo.",
  "El hace varios meses atras estaba programando un juego con realidad aumentada utilizando las gafas de realidad virtual, cuando Debian entro al codigo vio los errores mas facil y los corrigio sin ningun problema.",
  "Al momento de ejecutarlo se olvido que seguia con las gafas de realidad virtual puestas y lo ejecuto, vio que no habia ningun error y se propuso en probarlo al otro día.",
  "Pero ¡Oh, sorpresa!, no podia salir del juego hasta que lo complete, aunque se veía un escenario espantoso, Debian estaba feliz ya que porfin cumpliria su sueño de ser ninja, pero el no sabia lo que le esperaba... En cuanto empezo el primer nivel no se podía mover, ya que necesitaba que alguien mas lo ayude.",
  "Entonces llamo a su mejor amigo de Internet MICHIHACKER, juntos deberan completar el juego para que Debian vuelva a la vida real."
];

const fullStory = `NINJA 404

Había una vez un joven programador llamado Debian, Debian era un apasionado por los ninjas y le gustaba imaginar que es un ninja, un dia se propuso a hacer un juego hiperrealista, como Debian sabia programar no le tardo mas de unos 2 meses, en cuanto probo el juego se dio cuenta que al momento de la ejecucion, tenia muchos bugs y errores, entonces se le ocurrio la maravillosa idea de entrar dentro del codigo, el hace varios meses atras estaba programando un juego con realidad aumentada utilizando las gafas de realidad virtual, cuando Debian entro al codigo vio los errores mas facil y los corrigio sin ningun problema, al momento de ejecutarlo se olvido que seguia con las gafas de realidad virtual puestas y lo ejecuto, vio que no habia ningun error y se propuso en probarlo al otro día, pero ¡Oh, sorpresa!, no podia salir del juego hasta que lo complete, aunque se veía un escenario espantoso, Debian estaba feliz ya que porfin cumpliria su sueño de ser ninja, pero el no sabia lo que le esperaba... En cuanto empezo el primer nivel no se podía mover, ya que necesitaba que alguien mas lo ayude, entonces llamo a su mejor amigo de Internet MICHIHACKER, juntos deberan completar el juego para que Debian vuelva a la vida real.`;

interface StorySequenceProps {
  onComplete?: () => void;
  autoStart?: boolean;
}

export const StorySequence: React.FC<StorySequenceProps> = ({ onComplete, autoStart = false }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [showFullStory, setShowFullStory] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const nextImage = () => {
    if (currentImage < storyImages.length - 1 && !isTransitioning && !isTyping) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImage(currentImage + 1);
        setIsTransitioning(false);
        // Esperar un poco antes de empezar a escribir la nueva historia
        setTimeout(() => {
          typeText(storyParts[currentImage + 1]);
        }, 300);
      }, 500);
    } else if (currentImage === storyImages.length - 1) {
      setIsPlaying(false);
      if (onComplete) onComplete();
    }
  };

  const prevImage = () => {
    if (currentImage > 0 && !isTransitioning && !isTyping) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImage(currentImage - 1);
        setIsTransitioning(false);
        // Esperar un poco antes de empezar a escribir la nueva historia
        setTimeout(() => {
          typeText(storyParts[currentImage - 1]);
        }, 300);
      }, 500);
    }
  };

  const resetStory = () => {
    setCurrentImage(0);
    setIsPlaying(false);
    setIsTransitioning(false);
    setDisplayedText('');
  };

  const typeText = (text: string, callback?: () => void) => {
    setIsTyping(true);
    setDisplayedText('');
    let index = 0;
    
    const typeInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        if (callback) callback();
      }
    }, 30); // Velocidad de escritura: 30ms por letra
  };

  const skipToEnd = () => {
    if (onComplete) onComplete();
  };

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentImage < storyImages.length - 1 && !isTyping) {
      interval = setInterval(() => {
        nextImage();
      }, 6000); // Cambia de imagen cada 6 segundos (más tiempo para leer)
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentImage, isTyping]);

  // Mostrar texto inicial con efecto de escritura
  useEffect(() => {
    if (currentImage === 0) {
      setTimeout(() => {
        typeText(storyParts[0]);
      }, 1000);
    }
  }, [currentImage]);

  // Auto-start si está habilitado
  useEffect(() => {
    if (autoStart) {
      setTimeout(() => {
        setIsPlaying(true);
      }, 2000);
    }
  }, [autoStart]);

  if (showFullStory) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 background-overlay">
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
    <div className="fixed inset-0 z-50 overflow-hidden background-overlay">
      {/* Background Animation */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
      
      {/* Main Content */}
      <div className="relative h-full flex flex-col">
        {/* Header - Overlay */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 animate-fadeInDown">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse drop-shadow-lg font-stick">
            NINJA 404
          </h1>
        </div>

        {/* Full Screen Image */}
        <div className="flex-1 relative">
          <div className={`absolute inset-0 transition-all duration-500 ${
            isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}>
            <img
              src={storyImages[currentImage]}
              alt={`Historia ${currentImage + 1}`}
              className="w-full h-full object-cover animate-zoomIn"
            />
            
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
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

            {/* Navigation Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={prevImage}
                disabled={currentImage === 0 || isTransitioning}
                className="p-3 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110"
              >
                <ChevronLeft size={24} />
              </button>
              
              <button
                onClick={nextImage}
                disabled={currentImage === storyImages.length - 1 || isTransitioning}
                className="p-3 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* Bottom Content */}
          <div className="space-y-6">
            {/* Story Box with Glass Effect */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl p-6 border border-purple-400/50 transition-all duration-500 max-w-4xl mx-auto animate-slideInRight">
              <div className="text-center">
                <h3 className="text-white text-lg font-semibold mb-4 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent font-japanese-serif">
                  NINJA 404 - Parte {currentImage + 1}
                </h3>
                <p className="text-white text-sm leading-relaxed animate-fadeIn text-left font-japanese">
                  {displayedText}
                  {isTyping && <span className="typing-cursor text-purple-400">|</span>}
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

            {/* Image Counter */}
            <div className="text-center">
              <span className="text-gray-400 text-sm bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                {currentImage + 1} de {storyImages.length}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
