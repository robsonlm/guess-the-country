import React from 'react';
import { Lightbulb, Scissors, Compass, Info } from 'lucide-react';
import { LifelineState } from '../types/game';

interface LifelineBarProps {
  lifelineState: LifelineState;
  disabled: boolean;
  onUseCapital: () => void;
  onUseFiftyFifty: () => void;
  onUseRegion: () => void;
}

export const LifelineBar: React.FC<LifelineBarProps> = ({
  lifelineState,
  disabled,
  onUseCapital,
  onUseFiftyFifty,
  onUseRegion,
}) => {
  const { capitalUsed, fiftyFiftyUsed, regionUsed, activeHintText } = lifelineState;

  return (
    <div className="lifelines-container">
      <div className="lifelines-row">
        <span className="lifelines-label">Ask The Atlas:</span>

        <div className="lifelines-buttons">
          <button
            type="button"
            className={`lifeline-btn ${capitalUsed ? 'used' : ''}`}
            onClick={onUseCapital}
            disabled={disabled || capitalUsed}
            title={capitalUsed ? 'Capital hint used' : 'Reveal capital city clue'}
          >
            <Lightbulb size={14} />
            <span>Capital</span>
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

          <button
            type="button"
            className={`lifeline-btn ${regionUsed ? 'used' : ''}`}
            onClick={onUseRegion}
            disabled={disabled || regionUsed}
            title={regionUsed ? 'Region clue used' : 'Reveal continent & subregion clue'}
          >
            <Compass size={14} />
            <span>Region</span>
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
