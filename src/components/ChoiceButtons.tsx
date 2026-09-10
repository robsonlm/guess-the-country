import React from 'react';
import { ChoiceOption, GameMode } from '../types/game';
import { getFlagUrl } from '../services/countriesApi';

interface ChoiceButtonsProps {
  options: ChoiceOption[];
  onSelect: (index: number) => void;
  selectedOptionIndex: number | null;
  isResolving: boolean;
  gameMode: GameMode;
  questionType?: 'flag-to-name' | 'name-to-flag';
  hiddenOptionIndices?: number[];
}

export const ChoiceButtons: React.FC<ChoiceButtonsProps> = ({
  options,
  onSelect,
  selectedOptionIndex,
  isResolving,
  gameMode,
  questionType = 'flag-to-name',
  hiddenOptionIndices = [],
}) => {
  const isReverseMode = questionType === 'name-to-flag';

  return (
    <div className={`choices-grid mode-${gameMode} ${isReverseMode ? 'reverse-flags-grid' : ''}`}>
      {options.map((option, index) => {
        const isSelected = selectedOptionIndex === index;
        const isHidden = hiddenOptionIndices.includes(index);
        let buttonStateClass = '';
        let showFlag = isReverseMode;

        if (isResolving) {
          if (isSelected) {
            buttonStateClass = option.isCorrect ? 'is-correct' : 'is-wrong';
            showFlag = true;
          } else if (option.isCorrect) {
            buttonStateClass = 'is-correct';
            showFlag = true;
          }
        }

        const flagSrc = option.country.flagUrl || getFlagUrl(option.country.alpha2);

        if (isHidden && !isResolving) {
          return (
            <div
              key={`${option.country.alpha2}-${index}`}
              className="choice-btn hidden-by-lifeline"
              aria-hidden="true"
            >
              <span className="choice-name" style={{ opacity: 0.25 }}>— 50/50 Removed —</span>
            </div>
          );
        }

        return (
          <button
            key={`${option.country.alpha2}-${index}`}
            id={`button${index + 1}`}
            type="button"
            className={`choice-btn ${buttonStateClass} ${isReverseMode ? 'choice-flag-card-btn' : ''}`}
            onClick={() => onSelect(index)}
            disabled={isResolving || isHidden}
            aria-label={`Choice ${index + 1}: ${option.name}`}
            data-correct={option.isCorrect ? 'true' : 'false'}
          >
            {isReverseMode ? (
              // Name-to-Flag choice presentation
              <div className="choice-flag-card-content">
                <div className="choice-flag-img-box">
                  <img src={flagSrc} alt={`Flag option ${index + 1}`} className="choice-card-flag-img" />
                </div>
                {isResolving && (
                  <span className="choice-flag-revealed-name fade-in">{option.name}</span>
                )}
              </div>
            ) : (
              // Flag-to-Name choice presentation
              <div className="choice-left-content">
                {showFlag && (
                  <img
                    src={flagSrc}
                    alt=""
                    className="choice-flag-icon pop-in"
                    loading="eager"
                  />
                )}
                <span className="choice-name">{option.name}</span>
              </div>
            )}

            <span className="choice-key" aria-hidden="true">
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
};
