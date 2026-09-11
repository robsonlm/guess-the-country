import React from 'react';
import { Lightbulb, Scissors, Info } from 'lucide-react';
import { LifelineState } from '../types/game';

interface LifelineBarProps {
  lifelineState: LifelineState;
  disabled: boolean;
  questionType?: 'flag-to-name' | 'name-to-flag';
  onUseCapital: () => void;
  onUseFiftyFifty: () => void;
}

export const LifelineBar: React.FC<LifelineBarProps> = ({
  lifelineState,
  disabled,
  questionType,
  onUseCapital,
  onUseFiftyFifty,
}) => {
  const {
    capitalCredits,
    capitalUsedOnCurrentRound,
    fiftyFiftyCredits,
    fiftyFiftyUsedOnCurrentRound,
    activeHintText,
  } = lifelineState;
  const isCapitalDisabled = disabled || capitalCredits <= 0 || capitalUsedOnCurrentRound;
  const isFiftyFiftyDisabled = disabled || fiftyFiftyCredits <= 0 || fiftyFiftyUsedOnCurrentRound;
  const showCapital = questionType !== 'name-to-flag';

  return (
    <div className="lifelines-container">
      <div className="lifelines-row">
        <span className="lifelines-label">Ask The Atlas:</span>

        <div className="lifelines-buttons">
          {showCapital && (
            <button
              type="button"
              className={`lifeline-btn ${capitalCredits <= 0 || capitalUsedOnCurrentRound ? 'used' : ''}`}
              onClick={onUseCapital}
              disabled={isCapitalDisabled}
              title={
                capitalUsedOnCurrentRound
                  ? 'Capital clue already used for this round'
                  : capitalCredits <= 0
                  ? 'No capital credits remaining (earn +1 every 5 correct answers in a row)'
                  : `Reveal capital city clue (${capitalCredits} credit${capitalCredits > 1 ? 's' : ''} available)`
              }
            >
              <Lightbulb size={14} />
              <span>Capital ({capitalCredits})</span>
            </button>
          )}

          <button
            type="button"
            className={`lifeline-btn ${fiftyFiftyCredits <= 0 || fiftyFiftyUsedOnCurrentRound ? 'used' : ''}`}
            onClick={onUseFiftyFifty}
            disabled={isFiftyFiftyDisabled}
            title={
              fiftyFiftyUsedOnCurrentRound
                ? '50/50 lifeline already used for this round'
                : fiftyFiftyCredits <= 0
                ? 'No 50/50 credits remaining (earn +1 every 5 correct answers in a row)'
                : `Eliminate half of the incorrect choices (${fiftyFiftyCredits} credit${fiftyFiftyCredits > 1 ? 's' : ''} available)`
            }
          >
            <Scissors size={14} />
            <span>50/50 ({fiftyFiftyCredits})</span>
          </button>
        </div>
      </div>

      {activeHintText && (
        <div className="hint-banner fade-in">
          <Info size={16} className="hint-icon" />
          <span>{activeHintText}</span>
        </div>
      )}
    </div>
  );
};
