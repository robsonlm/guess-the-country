import React from 'react';
import { CheckCircle2, XCircle, MapPin, ExternalLink, Globe, Landmark } from 'lucide-react';
import { LastAnswer } from '../types/game';
import { ProgressiveFlag } from './ProgressiveFlag';

interface LastAnswerCardProps {
  lastAnswer: LastAnswer | null;
}

export const LastAnswerCard: React.FC<LastAnswerCardProps> = ({ lastAnswer }) => {
  if (!lastAnswer) return null;

  const { country, isCorrect, selectedCountry } = lastAnswer;

  return (
    <div
      className={`last-answer-card fade-in ${isCorrect ? 'correct' : 'wrong'}`}
      role="status"
      aria-live="polite"
    >
      <div className="last-answer-info">
        <div className="last-answer-icon" aria-hidden="true">
          {isCorrect ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
        </div>
        <div className="last-answer-text">
          <span className="last-answer-title">
            {isCorrect ? 'Correct Answer Review:' : 'Incorrect Answer Review:'}
          </span>
          <div className="last-answer-country-row">
            {!isCorrect && selectedCountry && (
              <span className="last-answer-wrong-choice">
                You picked:
                <ProgressiveFlag
                  alpha2={selectedCountry.alpha2}
                  name={selectedCountry.name}
                  flagUrl={selectedCountry.flagUrl}
                  lowFlagUrl={selectedCountry.lowFlagUrl}
                  className="last-answer-flag-thumb"
                />
                <span className="last-answer-wrong-name">{selectedCountry.name}</span>
                <span className="last-answer-arrow">➔</span>
              </span>
            )}
            <span className="last-answer-correct-choice">
              <ProgressiveFlag
                alpha2={country.alpha2}
                name={country.name}
                flagUrl={country.flagUrl}
                lowFlagUrl={country.lowFlagUrl}
                className="last-answer-flag-thumb"
              />
              <span className="last-answer-name" id="last">
                {country.name}
              </span>
            </span>
          </div>

          {/* Geographical metadata clues */}
          <div className="last-answer-geo-tags">
            {country.capital && (
              <span className="geo-tag">
                <Landmark size={12} /> Capital: {country.capital}
              </span>
            )}
            {country.region && (
              <span className="geo-tag">
                <Globe size={12} /> {country.subregion || country.region}
              </span>
            )}
          </div>
        </div>
      </div>

      {country.mapUrl && (
        <a
          id="last-answer"
          className="last-answer-link"
          href={country.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`View ${country.name} on Google Maps`}
        >
          <MapPin size={15} />
          <span>Explore Map</span>
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
};
