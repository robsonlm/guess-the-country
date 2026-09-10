import React, { useState, useEffect } from 'react';
import { Flag } from 'lucide-react';
import { Country } from '../types/game';
import { getFlagUrl } from '../services/countriesApi';

interface FlagCardProps {
  targetCountry: Country;
}

export const FlagCard: React.FC<FlagCardProps> = ({ targetCountry }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState('');

  useEffect(() => {
    setIsLoaded(false);
    const primaryUrl = targetCountry.flagUrl || getFlagUrl(targetCountry.alpha2);
    setImgSrc(primaryUrl);
  }, [targetCountry.alpha2, targetCountry.flagUrl]);

  const handleImageError = () => {
    // Fallback to flags.restcountries.com if flagcdn fails
    const fallbackUrl = `https://flags.restcountries.com/v5/w320/${targetCountry.alpha2.toLowerCase()}.png`;
    if (imgSrc !== fallbackUrl) {
      setImgSrc(fallbackUrl);
    }
  };

  return (
    <div className="flag-card pop-in" id="game-area">
      <div className="flag-header-tag">
        <Flag size={14} />
        <span>Identify This Country Flag</span>
      </div>

      <div className="flag-image-wrapper">
        {!isLoaded && <div className="flag-skeleton" />}
        <img
          id="flag"
          key={targetCountry.alpha2}
          src={imgSrc}
          alt={`National flag to guess`}
          className="flag-image"
          style={{ opacity: isLoaded ? 1 : 0 }}
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError}
        />
      </div>
    </div>
  );
};
