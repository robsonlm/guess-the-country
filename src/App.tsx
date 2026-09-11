import { useState } from 'react';
import { AlertCircle, RefreshCw, Sparkles, Flame } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { Header } from './components/Header';
import { FlagCard } from './components/FlagCard';
import { ReverseFlagCard } from './components/ReverseFlagCard';
import { ChoiceButtons } from './components/ChoiceButtons';
import { LifelineBar } from './components/LifelineBar';
import { TimerBar } from './components/TimerBar';
import { ScoreBoard } from './components/ScoreBoard';
import { LastAnswerCard } from './components/LastAnswerCard';
import { MasteredFlagsTray } from './components/MasteredFlagsTray';
import { VictoryModal } from './components/VictoryModal';
import { GlobeVictoryModal } from './components/GlobeVictoryModal';
import { GlobeGameView } from './components/GlobeGameView';
import { AchievementsModal } from './components/AchievementsModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import './styles/App.css';

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isGlobeExploreOpen, setIsGlobeExploreOpen] = useState(false);

  const {
    settings,
    score,
    countries,
    currentRound,
    lastAnswer,
    solvedAlphas,
    solvedCountriesList,
    globeMistakes,
    achievements,
    achievementNotice,
    isGameComplete,
    isPaused,
    isLoading,
    isResolving,
    selectedOptionIndex,
    error,
    levelUpNotice,
    lifelineState,
    timeLeft,
    maxTime,
    localInfo,
    handleChoice,
    handleFinalThreeSubmit,
    updateSettings,
    resetScore,
    resumeGame,
    reSyncData,
    initCountries,
    onUseCapital,
    onUseFiftyFifty,
    onUseRegion,
  } = useGameState();

  const handleToggleSound = () => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const handleToggleMode = () => {
    const nextMode = settings.gameMode === 'globe' ? 'progressive' : 'globe';
    updateSettings({ gameMode: nextMode });
  };

  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="app-container">
      <Header
        currentStreak={score.currentStreak}
        level={currentRound?.level ?? 1}
        optionCount={currentRound?.optionCount ?? 2}
        settings={settings}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleMode={handleToggleMode}
      />

      {/* Achievement Unlocked Toast Notification */}
      {achievementNotice && (
        <div className="achievement-toast fade-in" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{achievementNotice.icon}</span>
            <span>
              Trophy Unlocked: <strong>{achievementNotice.title}</strong> — {achievementNotice.description}
            </span>
          </div>
        </div>
      )}

      {/* Level Up / Mode Switch Notification Banner */}
      {levelUpNotice && (
        <div className="level-up-toast fade-in" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Flame size={18} className="streak-flame" />
            <span>{levelUpNotice}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="error-banner fade-in" id="error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={initCountries}
            title="Retry"
            style={{ width: 32, height: 32 }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="state-container" id="loading">
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', fontWeight: 500 }}>
            Loading flags & 3D Earth data…
          </p>
        </div>
      )}

      {/* Active gameplay workspace */}
      {!isLoading && currentRound && !isGameComplete && (
        <main className="game-workspace">
          {/* Active Timer Bar in Blitz or Per-question modes */}
          {settings.timerMode !== 'none' && (
            <TimerBar timerMode={settings.timerMode} timeLeft={timeLeft} maxTime={maxTime} />
          )}

          {/* Render 3D Globe Mode OR Classic/Challenger Card Mode */}
          {settings.gameMode === 'globe' ? (
            <GlobeGameView
              targetCountry={currentRound.targetCountry}
              options={currentRound.options}
              onSelect={handleChoice}
              selectedOptionIndex={selectedOptionIndex}
              isResolving={isResolving}
              conqueredAlphas={solvedAlphas}
              totalCountriesCount={currentRound.totalCount}
              mistakesCount={globeMistakes}
              streak={score.currentStreak}
              lifelineState={lifelineState}
              onUseCapital={onUseCapital}
              onUseRegion={onUseRegion}
              disabled={isPaused}
              isFinalThree={currentRound.isFinalThree}
              finalThreeTargets={currentRound.finalThreeTargets}
              onFinalThreeSubmit={handleFinalThreeSubmit}
              continentFilter={settings.continentFilter}
              onSelectContinent={(continent) => updateSettings({ continentFilter: continent })}
            />
          ) : (
            <>
              {/* Question Display: Standard Flag Card OR Reverse Name Card */}
              {currentRound.questionType === 'name-to-flag' ? (
                <ReverseFlagCard targetCountry={currentRound.targetCountry} />
              ) : (
                <FlagCard targetCountry={currentRound.targetCountry} />
              )}

              {/* Lifelines Bar */}
              <LifelineBar
                lifelineState={lifelineState}
                disabled={isResolving || isPaused}
                onUseCapital={onUseCapital}
                onUseFiftyFifty={onUseFiftyFifty}
                onUseRegion={onUseRegion}
              />

              {/* Choice Buttons */}
              <ChoiceButtons
                options={currentRound.options}
                onSelect={handleChoice}
                selectedOptionIndex={selectedOptionIndex}
                isResolving={isResolving || isPaused}
                gameMode={settings.gameMode}
                questionType={currentRound.questionType}
                hiddenOptionIndices={lifelineState.hiddenOptionIndices}
              />

              {/* Last Answer Review */}
              <LastAnswerCard lastAnswer={lastAnswer} />

              {/* Score Board */}
              <ScoreBoard score={score} />
            </>
          )}

          {/* Mastered Flags Tray with Continent Tabs & Trophy Shelf */}
          <MasteredFlagsTray
            solvedCountries={solvedCountriesList}
            allCountries={countries}
            onOpenAchievements={() => setIsAchievementsOpen(true)}
            unlockedAchievementsCount={unlockedCount}
            totalAchievementsCount={achievements.length}
          />

          <footer
            style={{
              marginTop: '1rem',
              color: 'var(--text-dim)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Sparkles size={12} style={{ color: 'var(--primary-light)' }} />
            <span>
              Pro tip: Press [1] through [{currentRound.options.length}] on your keyboard to guess rapidly
            </span>
          </footer>
        </main>
      )}

      {/* 3-Consecutive-Timeout Pause Modal */}
      <PauseModal isOpen={isPaused} onResume={resumeGame} />

      {/* Victory Modal when all flags are conquered */}
      {isGameComplete && settings.gameMode === 'globe' && (
        <GlobeVictoryModal
          isOpen={!isGlobeExploreOpen}
          conqueredCount={solvedAlphas.length}
          totalCountries={countries.length}
          mistakesCount={globeMistakes}
          onPlayAgain={() => {
            setIsGlobeExploreOpen(false);
            resetScore();
          }}
          onExplore={() => setIsGlobeExploreOpen(true)}
        />
      )}

      {isGameComplete && settings.gameMode !== 'globe' && (
        <VictoryModal
          score={score}
          totalCountries={countries.length}
          onPlayAgain={resetScore}
        />
      )}

      {/* Trophy Shelf & Achievements Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        achievements={achievements}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        localInfo={localInfo}
        onSaveSettings={updateSettings}
        onResetScore={resetScore}
        onReSyncData={reSyncData}
      />
    </div>
  );
}

export default App;
