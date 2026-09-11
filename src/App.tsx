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
import { LeaderboardModal } from './components/LeaderboardModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import './styles/App.css';

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isGlobeExploreOpen, setIsGlobeExploreOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [recentLeaderboardEntryId, setRecentLeaderboardEntryId] = useState<string | null>(null);

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
    gameElapsedSeconds,
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
  } = useGameState();

  const handleToggleSound = () => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const handleToggleMode = () => {
    let nextMode: 'globe' | 'flag-to-name' | 'name-to-flag' = 'globe';
    if (settings.gameMode === 'globe') nextMode = 'flag-to-name';
    else if (settings.gameMode === 'flag-to-name') nextMode = 'name-to-flag';
    else nextMode = 'globe';
    updateSettings({ gameMode: nextMode });
  };

  const handleOpenLeaderboard = (entryId?: string) => {
    setRecentLeaderboardEntryId(entryId || null);
    setIsLeaderboardOpen(true);
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
        onOpenLeaderboard={() => handleOpenLeaderboard()}
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
          {/* Active Timer Bar in 10s Timed mode */}
          {settings.timerMode !== 'relaxed' && (
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
              marginTop: '0.15rem',
              color: 'var(--text-dim)',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              flexShrink: 0,
            }}
          >
            <Sparkles size={11} style={{ color: 'var(--primary-light)' }} />
            <span>
              Pro tip: Press [1] through [{currentRound.options.length}] on keyboard to guess rapidly
            </span>
          </footer>
        </main>
      )}

      {/* 3-Consecutive-Timeout Pause Modal */}
      <PauseModal isOpen={isPaused} onResume={resumeGame} />

      {/* Victory Modal when all flags are conquered (Globe Mode) */}
      {isGameComplete && settings.gameMode === 'globe' && (
        <GlobeVictoryModal
          isOpen={!isGlobeExploreOpen}
          conqueredCount={solvedAlphas.length}
          totalCountries={countries.length}
          mistakesCount={globeMistakes}
          timeElapsedSeconds={gameElapsedSeconds}
          bestStreak={score.bestStreak}
          continentFilter={settings.continentFilter}
          timerMode={settings.timerMode}
          onPlayAgain={() => {
            setIsGlobeExploreOpen(false);
            resetScore();
          }}
          onExplore={() => setIsGlobeExploreOpen(true)}
          onOpenLeaderboard={handleOpenLeaderboard}
          onSubmitSuccess={resetScore}
        />
      )}

      {/* Victory Modal when all flags are conquered (Cards Mode) */}
      {isGameComplete && settings.gameMode !== 'globe' && (
        <VictoryModal
          score={score}
          totalCountries={countries.length}
          timeElapsedSeconds={gameElapsedSeconds}
          gameMode={settings.gameMode}
          continentFilter={settings.continentFilter}
          timerMode={settings.timerMode}
          onPlayAgain={resetScore}
          onOpenLeaderboard={handleOpenLeaderboard}
          onSubmitSuccess={resetScore}
        />
      )}

      {/* Global Hall of Fame & Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        recentSubmittedEntryId={recentLeaderboardEntryId}
        defaultGameMode={settings.gameMode}
        defaultContinent={settings.continentFilter}
        defaultTimerMode={settings.timerMode}
      />

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
