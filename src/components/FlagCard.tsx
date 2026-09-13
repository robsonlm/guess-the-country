import React from 'react';
import { Flag } from 'lucide-react';
import { Country } from '../types/game';
import { ProgressiveFlag } from './ProgressiveFlag';

interface FlagCardProps {
  targetCountry: Country;
}

export const FlagCard: React.FC<FlagCardProps> = ({ targetCountry }) => {
  return (
    <div className="flag-card pop-in" id="game-area">
      <div className="flag-header-tag">
        <Flag size={14} />
        <span>Identify This Country Flag</span>
      </div>

      <div className="flag-image-wrapper">
        <ProgressiveFlag
          id="flag"
          key={targetCountry.alpha2}
          alpha2={targetCountry.alpha2}
          name={targetCountry.name}
          flagUrl={targetCountry.flagUrl}
          lowFlagUrl={targetCountry.lowFlagUrl}
          className="flag-image"
          alt="National flag to guess"
        />
      </div>
    </div>
  );
};
