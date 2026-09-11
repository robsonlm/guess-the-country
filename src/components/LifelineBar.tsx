import React from 'react';
import { Lightbulb, Scissors, Info } from 'lucide-react';
import { LifelineState } from '../types/game';

interface LifelineBarProps {
  lifelineState: LifelineState;
  disabled: boolean;
  onUseCapital: () => void;
  onUseFiftyFifty: () => void;
}

export const LifelineBar: React.FC<LifelineBarProps> = ({
  lifelineState,
  disabled,
  onUseCapital,
  onUseFiftyFifty,
}) => {
  const { capitalCredits, capitalUsedOnCurrentRound, fiftyFiftyUsed, activeHintText } = lifelineState;
  const isCapitalDisabled = disabled || capitalCredits <= 0 || capitalUsedOnCurrentRound;

  return (
    <div className="lifelines-container">
      <div className="lifelines-row">
        <span className="lifelines-label">Ask The Atlas:</span>

        <div className="lifelines-buttons">
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

          <button
            type="button"
            className={`lifeline-btn ${fiftyFiftyUsed ? 'used' : ''}`}
            onClick={onUseFiftyFifty}
            disabled={disabled || fiftyFiftyUsed}
            title={fiftyFiftyUsed ? '50/50 lifeline used' : 'Eliminate half of the incorrect choices'}
          >
            <Scissors size={14} />
            <span>50/50</span>
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
