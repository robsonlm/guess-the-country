import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { Country } from '../types/game';

interface ReverseFlagCardProps {
  targetCountry: Country;
}

export const ReverseFlagCard: React.FC<ReverseFlagCardProps> = ({ targetCountry }) => {
  return (
    <div className="reverse-flag-card pop-in">
      <div className="flag-header-tag">
        <Compass size={14} />
        <span>Find The National Flag For</span>
      </div>

      <div className="reverse-country-container">
        <h2 className="reverse-country-name">{targetCountry.name}</h2>
        {targetCountry.capital && (
          <p className="reverse-country-clue">
            Capital: <strong>{targetCountry.capital}</strong> • Region: <strong>{targetCountry.region}</strong>
          </p>
        )}
      </div>

      <div className="reverse-subtext">
        <Sparkles size={13} style={{ color: 'var(--primary-light)' }} />
        <span>Select the correct flag from the options below</span>
      </div>
    </div>
  );
};
