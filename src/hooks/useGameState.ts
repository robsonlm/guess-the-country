import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Country,
  GameScore,
  LastAnswer,
  Round,
  UserSettings,
  ChoiceOption,
  GameMode,
  ContinentFilter,
  USRegionFilter,
  GameEdition,
  TimerMode,
  LifelineState,
  Achievement,
} from '../types/game';
import {
  loadScore,
  saveScore,
  loadSettings,
  saveSettings,
  loadCountries,
  forceRefreshLocalData,
  getLocalDataInfo,
  loadSolvedCountryAlphas,
  saveSolvedCountryAlphas,
  loadGlobeMistakes,
  saveGlobeMistakes,
  clearGameProgress,
  getFlagUrl,
} from '../services/countriesApi';
import { loadAchievements, checkNewAchievements } from '../services/achievements';
import { getNeighboringCountries } from '../services/countriesGeo';
import { getLastPlayerName, setLastPlayerName } from '../services/leaderboard';
import { useSoundEffects } from './useSoundEffects';
import { getCurrentRoute, navigateToRoute } from '../utils/router';
import {
  preloadAllGameResources,
  preloadUpcomingQuestionsFlags,
  preloadEditionFlags,
  preloadImage,
  startBackgroundPrewarm,
} from '../services/resourcePreloader';

const INITIAL_LIFELINES: LifelineState = {
  capitalCredits: 1,
  capitalUsedOnCurrentRound: false,
  fiftyFiftyCredits: 1,
  fiftyFiftyUsedOnCurrentRound: false,
  fiftyFiftyUsed: false,
  hiddenOptionIndices: [],
  activeHintText: null,
};

export function useGameState(isExternalModalOpen: boolean = false, isAdmin: boolean = false) {
  const [settings, setSettingsState] = useState<UserSettings>(loadSettings);
  const [score, setScore] = useState<GameScore>(() => loadScore(loadSettings().edition));
  const [countries, setCountries] = useState<Country[]>([]);
  const [solvedAlphas, setSolvedAlphas] = useState<string[]>(() => loadSolvedCountryAlphas(loadSettings().edition));
  const [globeMistakes, setGlobeMistakes] = useState<number>(() => loadGlobeMistakes(loadSettings().edition));
  const [achievements, setAchievements] = useState<Achievement[]>(loadAchievements);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [lastAnswer, setLastAnswer] = useState<LastAnswer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('local');
  const [levelUpNotice, setLevelUpNotice] = useState<string | null>(null);
  const [achievementNotice, setAchievementNotice] = useState<Achievement | null>(null);
  const [isGameComplete, setIsGameComplete] = useState<boolean>(false);
  const [lifelineState, setLifelineState] = useState<LifelineState>(INITIAL_LIFELINES);
  const [gameElapsedSeconds, setGameElapsedSeconds] = useState<number>(0);

  // Preloader state: blocks timer countdown until all 3D textures, polygons, and flags are ready
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [preloadProgress, setPreloadProgress] = useState<number>(0);
  const [preloadStage, setPreloadStage] = useState<string>('Preparing Expedition...');

  // Player Name and Game Start Flow (asked when game starts)
  const [currentPlayerName, setCurrentPlayerName] = useState<string>(getLastPlayerName);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(() => getCurrentRoute() === 'play');
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);

  // Composite modal active state (any modal pauses timer and gameplay)
  const isModalActive = isExternalModalOpen || isStartModalOpen || isPaused || isGameComplete;

  // Synchronize browser URL navigation (popstate & hashchange)
  useEffect(() => {
    const handleLocationChange = () => {
      const currentRoute = getCurrentRoute();
      if (currentRoute === 'play') {
        setIsGameStarted(true);
      } else {
        setIsGameStarted(false);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Timer state (10s per flag in 'timed' mode, untimed in 'relaxed')
  const [timeLeft, setTimeLeft] = useState<number>(settings.timerMode === 'timed' ? 10 : 0);
  const timerIntervalRef = useRef<any>(null);
  const consecutiveTimeoutsRef = useRef<number>(0);

  // Active gameplay elapsed time ticker (only runs when game has started, preloading is finished, and no modal is open)
  useEffect(() => {
    if (!isGameStarted || isPreloading || isLoading || isPaused || isGameComplete || isModalActive || !currentRound) return;

    const interval = setInterval(() => {
      setGameElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameStarted, isPreloading, isLoading, isPaused, isGameComplete, isModalActive, currentRound]);

  // Stable references
  const lastTargetAlphaRef = useRef<string>('');
  const countriesRef = useRef<Country[]>([]);
  const solvedAlphasRef = useRef<string[]>(solvedAlphas);
  const globeMistakesRef = useRef<number>(globeMistakes);
  const settingsRef = useRef<UserSettings>(settings);
  const scoreRef = useRef<GameScore>(score);
  const isResolvingRef = useRef<boolean>(false);
  const achievementsRef = useRef<Achievement[]>(achievements);
  const isGameStartedRef = useRef<boolean>(isGameStarted);
  const adminRef = useRef<boolean>(isAdmin);
  const currentPlayerNameRef = useRef<string>(currentPlayerName);
  const currentRoundRef = useRef<Round | null>(currentRound);

  countriesRef.current = countries;
  solvedAlphasRef.current = solvedAlphas;
  globeMistakesRef.current = globeMistakes;
  settingsRef.current = settings;
  isGameStartedRef.current = isGameStarted;
  scoreRef.current = score;
  isResolvingRef.current = isResolving;
  achievementsRef.current = achievements;
  adminRef.current = isAdmin;
  currentPlayerNameRef.current = currentPlayerName;
  currentRoundRef.current = currentRound;

  // Real-time synchronization when admin mode is activated
  useEffect(() => {
    adminRef.current = isAdmin;
    const isEffectiveAdmin =
      isAdmin ||
      currentPlayerName.toUpperCase() === 'ADMIN' ||
      currentPlayerName.toUpperCase() === 'ADMINMODE';

    if (
      isEffectiveAdmin &&
      currentRound &&
      !currentRound.isFinalThree &&
      currentRound.options &&
      currentRound.options.length >= 2
    ) {
      const correctIdx = currentRound.options.findIndex((o) => o.isCorrect);
      if (correctIdx !== 1 && correctIdx !== -1) {
        const newOptions = [...currentRound.options];
        const [correctOpt] = newOptions.splice(correctIdx, 1);
        newOptions.splice(1, 0, correctOpt);
        setCurrentRound((prev) => (prev ? { ...prev, options: newOptions } : null));
      }
    }
  }, [isAdmin, currentPlayerName, currentRound]);

  const { playCorrect, playWrong, playStreakMilestone, playLifeline } = useSoundEffects(settings.soundEnabled);

  const preloadFlag = (country?: Country) => {
    if (!country) return;
    const low = country.lowFlagUrl || getFlagUrl(country.alpha2, 'low');
    const high = country.flagUrl || getFlagUrl(country.alpha2, 'high');
    if (low) preloadImage(low, 2500);
    if (high) preloadImage(high, 4000);
  };

  const calculateDifficulty = (mode: GameMode) => {
    if (mode === 'globe') return { optionCount: 3, level: 1 };
    // For 'flag-to-name' and 'name-to-flag', standard 4 options
    return { optionCount: 4, level: 1 };
  };

  // Generate round
  const generateRound = useCallback(
    (
      countryList: Country[],
      currentSettings: UserSettings,
      _streak: number,
      solvedList: string[]
    ) => {
      if (!countryList || countryList.length === 0) return;

      // Filter by continent or US region if active
      let pool = countryList;
      if (currentSettings.edition === 'us-states') {
        if (currentSettings.usRegionFilter && currentSettings.usRegionFilter !== 'all') {
          pool = countryList.filter((c) => c.region === currentSettings.usRegionFilter);
        }
      } else if (currentSettings.continentFilter !== 'all') {
        pool = countryList.filter((c) => c.region === currentSettings.continentFilter);
      }
      if (pool.length === 0) pool = countryList;

      const solvedSet = new Set(solvedList);
      const unsolvedPool = pool.filter((c) => !solvedSet.has(c.alpha2));

      // Victory condition
      if (unsolvedPool.length === 0) {
        setIsGameComplete(true);
        setCurrentRound(null);
        setSelectedOptionIndex(null);
        setIsResolving(false);
        return;
      }

      setIsGameComplete(false);
      const { optionCount, level } = calculateDifficulty(currentSettings.gameMode);

      // Determine question style directly from the 3 game modes
      const qType: 'flag-to-name' | 'name-to-flag' =
        currentSettings.gameMode === 'name-to-flag' ? 'name-to-flag' : 'flag-to-name';

      // Special Globe Mode Final 3 Showdown condition (when 3 or fewer countries remain)
      if (currentSettings.gameMode === 'globe' && unsolvedPool.length <= 3) {
        const finalThreeTargets = [...unsolvedPool];
        finalThreeTargets.forEach((c) => preloadFlag(c));

        const isEffectiveAdmin =
          adminRef.current ||
          isAdmin ||
          currentPlayerNameRef.current?.toUpperCase() === 'ADMIN' ||
          currentPlayerNameRef.current?.toUpperCase() === 'ADMINMODE';

        const options: ChoiceOption[] = finalThreeTargets.map((c) => ({
          name: c.name,
          isCorrect: true,
          country: c,
        }));

        if (!isEffectiveAdmin) {
          for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
          }
        }

        setSelectedOptionIndex(null);
        setIsResolving(false);
        setLifelineState((prev) => ({
          ...prev,
          capitalUsedOnCurrentRound: false,
          fiftyFiftyUsedOnCurrentRound: false,
          hiddenOptionIndices: [],
          activeHintText: null,
        }));

        if (currentSettings.timerMode === 'timed') {
          setTimeLeft(10);
        } else {
          setTimeLeft(0);
        }

        setCurrentRound({
          targetCountry: finalThreeTargets[0],
          options,
          level,
          optionCount: finalThreeTargets.length,
          remainingCount: unsolvedPool.length,
          totalCount: pool.length,
          questionType: 'flag-to-name',
          isFinalThree: true,
          finalThreeTargets,
        });
        return;
      }

      let targetIdx: number;
      let attempts = 0;
      do {
        targetIdx = Math.floor(Math.random() * unsolvedPool.length);
        attempts++;
      } while (
        unsolvedPool[targetIdx].alpha2 === lastTargetAlphaRef.current &&
        attempts < 10 &&
        unsolvedPool.length > 1
      );

      const targetCountry = unsolvedPool[targetIdx];
      lastTargetAlphaRef.current = targetCountry.alpha2;

      preloadFlag(targetCountry);

      // Pick distractor countries
      let distractors: Country[] = [];

      if (currentSettings.gameMode === 'globe') {
        // In globe mode, pick authentic neighboring & regional countries STRICTLY from UNSOLVED pool
        // This ensures flags of already guessed right countries are never shown
        const distractorCandidates = unsolvedPool.filter((c) => c.alpha2 !== targetCountry.alpha2);
        distractors = getNeighboringCountries(targetCountry, distractorCandidates, optionCount - 1);
        distractors.forEach((c) => preloadFlag(c));
      } else {
        // Classic / progressive random distractors
        const usedAlphas = new Set<string>([targetCountry.alpha2]);
        while (distractors.length < optionCount - 1 && distractors.length < countryList.length - 1) {
          const randIdx = Math.floor(Math.random() * countryList.length);
          const candidate = countryList[randIdx];
          if (!usedAlphas.has(candidate.alpha2)) {
            usedAlphas.add(candidate.alpha2);
            distractors.push(candidate);
            preloadFlag(candidate);
          }
        }
      }

      let options: ChoiceOption[] = [
        { name: targetCountry.name, isCorrect: true, country: targetCountry },
        ...distractors.map((c) => ({ name: c.name, isCorrect: false, country: c })),
      ];

      const isEffectiveAdmin =
        adminRef.current ||
        isAdmin ||
        currentPlayerNameRef.current?.toUpperCase() === 'ADMIN' ||
        currentPlayerNameRef.current?.toUpperCase() === 'ADMINMODE';

      if (isEffectiveAdmin) {
        // Admin Test Mode: ALWAYS place the correct answer on the 2nd position (index 1 / Key [2])
        if (options.length >= 2) {
          const correctOption = options[0];
          const firstDistractor = options[1];
          const otherDistractors = options.slice(2);
          options = [firstDistractor, correctOption, ...otherDistractors];
        }
      } else {
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
      }

      setSelectedOptionIndex(null);
      setIsResolving(false);
      setLifelineState((prev) => ({
        ...prev,
        capitalUsedOnCurrentRound: false,
        fiftyFiftyUsedOnCurrentRound: false,
        hiddenOptionIndices: [],
        activeHintText: null,
      }));

      // Reset per-question timer
      if (currentSettings.timerMode === 'timed') {
        setTimeLeft(10);
      } else {
        setTimeLeft(0);
      }

      setCurrentRound({
        targetCountry,
        options,
        level,
        optionCount,
        remainingCount: unsolvedPool.length,
        totalCount: pool.length,
        questionType: qType,
        isFinalThree: false,
      });

      // Lookahead: Preload all flags for the next 6 questions in the background
      const nextRemaining = unsolvedPool.filter((c) => c.alpha2 !== targetCountry.alpha2);
      preloadUpcomingQuestionsFlags(nextRemaining, countryList, currentSettings.gameMode, 6).catch(() => {});
    },
    []
  );

  // Lifelines
  const onUseCapital = useCallback(() => {
    if (
      settingsRef.current.gameMode === 'name-to-flag' ||
      currentRound?.questionType === 'name-to-flag' ||
      lifelineState.capitalCredits <= 0 ||
      lifelineState.capitalUsedOnCurrentRound ||
      !currentRound ||
      isResolving ||
      isPaused ||
      isModalActive
    ) {
      return;
    }
    playLifeline();
    const isState = settingsRef.current.edition === 'us-states';
    const cap = currentRound.targetCountry.capital || 'Capital not recorded';
    const cluePrefix = isState ? '🏛️ State Capital Clue' : '🏛️ Capital Clue';
    setLifelineState((prev) => ({
      ...prev,
      capitalCredits: Math.max(0, prev.capitalCredits - 1),
      capitalUsedOnCurrentRound: true,
      activeHintText: `${cluePrefix}: The capital is "${cap}"`,
    }));
  }, [lifelineState.capitalCredits, lifelineState.capitalUsedOnCurrentRound, currentRound, isResolving, isPaused, isModalActive, playLifeline]);

  const onUseFiftyFifty = useCallback(() => {
    if (
      lifelineState.fiftyFiftyCredits <= 0 ||
      lifelineState.fiftyFiftyUsedOnCurrentRound ||
      !currentRound ||
      isResolving ||
      isPaused ||
      isModalActive
    ) {
      return;
    }
    playLifeline();

    const wrongIndices = currentRound.options
      .map((opt, idx) => (!opt.isCorrect ? idx : -1))
      .filter((idx) => idx !== -1);

    // Eliminate half of the total choices:
    // With 4 choices (1 correct, 3 wrong), eliminate 2 wrong choices (leaving 1 correct and 1 wrong -> 50/50).
    const totalOptions = currentRound.options.length;
    const countToRemove = Math.min(
      wrongIndices.length,
      Math.max(1, Math.floor(totalOptions / 2))
    );

    // Shuffle wrong choices so eliminated options are randomized
    const shuffledWrong = [...wrongIndices].sort(() => Math.random() - 0.5);
    const toHide = shuffledWrong.slice(0, countToRemove);

    setLifelineState((prev) => ({
      ...prev,
      fiftyFiftyCredits: Math.max(0, prev.fiftyFiftyCredits - 1),
      fiftyFiftyUsedOnCurrentRound: true,
      fiftyFiftyUsed: true,
      hiddenOptionIndices: toHide,
      activeHintText: `✂️ 50/50: Eliminated half of the choices! (${Math.max(0, prev.fiftyFiftyCredits - 1)} left)`,
    }));
  }, [
    lifelineState.fiftyFiftyCredits,
    lifelineState.fiftyFiftyUsedOnCurrentRound,
    currentRound,
    isResolving,
    isPaused,
    isModalActive,
    playLifeline,
  ]);

  // Load countries/states once on mount or when switching edition
  const initCountries = useCallback(async (forcedEdition?: GameEdition, updatedSettings?: UserSettings) => {
    setIsLoading(true);
    setError(null);
    try {
      const activeSettings = updatedSettings || settingsRef.current;
      const edition = forcedEdition || activeSettings.edition || 'world';
      const res = await loadCountries(edition);
      setCountries(res.countries);
      countriesRef.current = res.countries;
      setDataSource(res.source);

      // Restore edition-specific progress
      const currentSolved = loadSolvedCountryAlphas(edition);
      setSolvedAlphas(currentSolved);
      solvedAlphasRef.current = currentSolved;

      const restoredScore = loadScore(edition);
      setScore(restoredScore);
      scoreRef.current = restoredScore;

      const restoredMistakes = loadGlobeMistakes(edition);
      setGlobeMistakes(restoredMistakes);
      globeMistakesRef.current = restoredMistakes;

      let pool = res.countries;
      if (edition === 'us-states') {
        if (activeSettings.usRegionFilter && activeSettings.usRegionFilter !== 'all') {
          pool = res.countries.filter((c) => c.region === activeSettings.usRegionFilter);
        }
      } else if (activeSettings.continentFilter !== 'all') {
        pool = res.countries.filter((c) => c.region === activeSettings.continentFilter);
      }
      const unsolved = pool.filter((c) => !currentSolved.includes(c.alpha2));

      if (currentSolved.length > 0 && unsolved.length === 0) {
        // Clear cached progress so the game starts a clean new expedition
        clearGameProgress(edition);
        setSolvedAlphas([]);
        saveSolvedCountryAlphas([], edition);
        setGlobeMistakes(0);
        saveGlobeMistakes(0, edition);
        const emptyScore: GameScore = { right: 0, wrong: 0, total: 0, currentStreak: 0, bestStreak: 0 };
        setScore(emptyScore);
        saveScore(emptyScore, edition);
        setIsGameComplete(false);
        setGameElapsedSeconds(0);
        generateRound(res.countries, activeSettings, 0, []);
      } else {
        generateRound(
          res.countries,
          activeSettings,
          restoredScore.currentStreak,
          currentSolved
        );
      }

      // Proactively warm all flags for the loaded edition in the background
      preloadEditionFlags(res.countries).catch(() => {});
      startBackgroundPrewarm(edition, res.countries);

      // If user refreshed directly on #play, ensure preloader syncs before starting timer
      if (getCurrentRoute() === 'play') {
        setIsPreloading(true);
        setPreloadProgress(15);
        setPreloadStage('Synchronizing Geographical Telemetry...');
        preloadAllGameResources(
          currentRoundRef.current,
          activeSettings.gameMode,
          (p) => {
            setPreloadProgress(p.percent);
            setPreloadStage(p.stage);
          },
          { unsolvedPool: unsolved, countryList: res.countries },
          activeSettings.edition || 'world'
        )
          .catch(() => {})
          .finally(() => {
            setIsPreloading(false);
            if (activeSettings.timerMode === 'timed') {
              setTimeLeft(10);
            }
          });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load local territory data');
    } finally {
      setIsLoading(false);
    }
  }, [generateRound]);

  // Reset Score & Mastery
  const resetScore = useCallback((promptNewName: boolean = false) => {
    const currentEdition = settingsRef.current.edition || 'world';
    clearGameProgress(currentEdition);
    const emptyScore: GameScore = { right: 0, wrong: 0, total: 0, currentStreak: 0, bestStreak: 0 };
    setScore(emptyScore);
    saveScore(emptyScore, currentEdition);
    setSolvedAlphas([]);
    saveSolvedCountryAlphas([], currentEdition);
    setGlobeMistakes(0);
    saveGlobeMistakes(0, currentEdition);
    setLastAnswer(null);
    setLevelUpNotice(null);
    setLifelineState(INITIAL_LIFELINES);
    setIsGameComplete(false);
    setIsPaused(false);
    setGameElapsedSeconds(0);
    consecutiveTimeoutsRef.current = 0;

    if (promptNewName) {
      setIsGameStarted(false);
      setIsStartModalOpen(true);
    }

    if (settingsRef.current.timerMode === 'timed') setTimeLeft(10);
    else setTimeLeft(0);

    if (countriesRef.current.length > 0) {
      generateRound(countriesRef.current, settingsRef.current, 0, []);
    }
  }, [generateRound]);

  // Update Settings: restarts game from 0 if game mode / timer / region changed
  const updateSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setSettingsState((prev) => {
        const updated = { ...prev, ...newSettings };
        saveSettings(updated);

        // Apply theme immediately to document element
        if (updated.theme) {
          document.documentElement.setAttribute('data-theme', updated.theme);
        }

        const editionChanged = newSettings.edition !== undefined && newSettings.edition !== prev.edition;

        if (editionChanged) {
          initCountries(newSettings.edition, updated);
          return updated;
        }

        const gameTypeChanged =
          (newSettings.gameMode !== undefined && newSettings.gameMode !== prev.gameMode) ||
          (newSettings.timerMode !== undefined && newSettings.timerMode !== prev.timerMode) ||
          (newSettings.continentFilter !== undefined && newSettings.continentFilter !== prev.continentFilter) ||
          (newSettings.usRegionFilter !== undefined && newSettings.usRegionFilter !== prev.usRegionFilter);

        const currentEdition = updated.edition || 'world';

        if (gameTypeChanged) {
          // Restart game from 0
          const emptyScore: GameScore = { right: 0, wrong: 0, total: 0, currentStreak: 0, bestStreak: 0 };
          setScore(emptyScore);
          saveScore(emptyScore, currentEdition);
          setSolvedAlphas([]);
          saveSolvedCountryAlphas([], currentEdition);
          setGlobeMistakes(0);
          saveGlobeMistakes(0, currentEdition);
          setLastAnswer(null);
          if (isGameStartedRef.current) {
            setLevelUpNotice('🔄 Game restarted from 0 for the selected settings.');
            setTimeout(() => setLevelUpNotice(null), 3000);
          }
          setLifelineState(INITIAL_LIFELINES);
          setIsGameComplete(false);
          setIsPaused(false);
          setGameElapsedSeconds(0);
          consecutiveTimeoutsRef.current = 0;

          if (updated.timerMode === 'timed') setTimeLeft(10);
          else setTimeLeft(0);

          if (countriesRef.current.length > 0) {
            generateRound(countriesRef.current, updated, 0, []);
          }
        } else {
          if (updated.timerMode === 'timed') setTimeLeft(10);
          else setTimeLeft(0);

          generateRound(
            countriesRef.current,
            updated,
            scoreRef.current.currentStreak,
            solvedAlphasRef.current
          );
        }

        return updated;
      });
    },
    [generateRound, initCountries]
  );

  // Resume game from paused state
  const resumeGame = useCallback(() => {
    setIsPaused(false);
    consecutiveTimeoutsRef.current = 0;
    setIsResolving(false);
    setSelectedOptionIndex(null);
    if (settingsRef.current.timerMode === 'timed') setTimeLeft(10);
    else setTimeLeft(0);

    generateRound(
      countriesRef.current,
      settingsRef.current,
      scoreRef.current.currentStreak,
      solvedAlphasRef.current
    );
  }, [generateRound]);

  // Apply theme on load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const reSyncData = useCallback(async () => {
    setIsLoading(true);
    try {
      const updated = await forceRefreshLocalData();
      setCountries(updated);
      setDataSource('downloaded');
      generateRound(
        updated,
        settingsRef.current,
        scoreRef.current.currentStreak,
        solvedAlphasRef.current
      );
    } catch (err: any) {
      setError(err.message || 'Failed to re-sync data');
    } finally {
      setIsLoading(false);
    }
  }, [generateRound]);

  const triggerConfetti = useCallback((isGrand = false) => {
    try {
      confetti({
        particleCount: isGrand ? 160 : 90,
        spread: isGrand ? 100 : 75,
        origin: { y: isGrand ? 0.45 : 0.55 },
        colors: ['#2a9d8f', '#e9c46a', '#e76f51', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      });
    } catch {
      // safe
    }
  }, []);

  // Answer handler
  const handleChoice = useCallback(
    (index: number) => {
      if (isResolvingRef.current || isPaused || isModalActive || !currentRound || index < 0 || index >= currentRound.options.length) {
        return;
      }

      // Reset consecutive timeouts on active choice
      consecutiveTimeoutsRef.current = 0;

      const chosenOption = currentRound.options[index];
      const isCorrect = chosenOption.isCorrect;
      const targetAlpha = currentRound.targetCountry.alpha2;

      setIsResolving(true);
      setSelectedOptionIndex(index);

      if (isCorrect) playCorrect();
      else playWrong();

      const currentEdition = settingsRef.current.edition || 'world';
      const prevSolved = solvedAlphasRef.current;
      let nextSolved = prevSolved;
      if (isCorrect && !prevSolved.includes(targetAlpha)) {
        nextSolved = [...prevSolved, targetAlpha];
        setSolvedAlphas(nextSolved);
        saveSolvedCountryAlphas(nextSolved, currentEdition);
      }

      if (!isCorrect) {
        const nextMistakes = globeMistakesRef.current + 1;
        setGlobeMistakes(nextMistakes);
        saveGlobeMistakes(nextMistakes, currentEdition);
      }

      const prevScore = scoreRef.current;
      const nextRight = isCorrect ? prevScore.right + 1 : prevScore.right;
      const nextWrong = isCorrect ? prevScore.wrong : prevScore.wrong + 1;
      const nextTotal = prevScore.total + 1;
      const nextStreak = isCorrect ? prevScore.currentStreak + 1 : 0;
      const nextBest = Math.max(prevScore.bestStreak, nextStreak);

      const newScore: GameScore = {
        right: nextRight,
        wrong: nextWrong,
        total: nextTotal,
        currentStreak: nextStreak,
        bestStreak: nextBest,
      };

      setScore(newScore);
      saveScore(newScore, currentEdition);

      // Check achievements
      const { updatedList, newlyUnlocked } = checkNewAchievements(
        achievementsRef.current,
        newScore,
        nextSolved,
        countriesRef.current
      );
      if (newlyUnlocked.length > 0) {
        setAchievements(updatedList);
        setAchievementNotice(newlyUnlocked[0]);
        setTimeout(() => setAchievementNotice(null), 4000);
      }

      setLastAnswer({
        country: currentRound.targetCountry,
        isCorrect,
        selectedName: chosenOption.name,
        selectedCountry: chosenOption.country,
      });

      // Victory check
      if (isCorrect && nextSolved.length === countriesRef.current.length && countriesRef.current.length > 0) {
        playStreakMilestone();
        triggerConfetti(true);
        setTimeout(() => {
          setIsGameComplete(true);
          setIsResolving(false);
        }, 500);
        return;
      }

      if (isCorrect && nextStreak > 0 && nextStreak % 5 === 0) {
        playStreakMilestone();
        triggerConfetti(false);

        const isGlobe = settingsRef.current.gameMode === 'globe';

        if (isGlobe) {
          // Award +1 Capital Clue Credit in Globe mode
          setLifelineState((prev) => ({
            ...prev,
            capitalCredits: prev.capitalCredits + 1,
          }));
          setLevelUpNotice(`🔥 ${nextStreak} Conquered in a Row! • +1 Capital Clue Credit 🏛️`);
        } else if (settingsRef.current.gameMode === 'name-to-flag') {
          // For name-to-flag: Capital is removed, only 50/50 lifeline is used
          setLifelineState((prev) => ({
            ...prev,
            fiftyFiftyCredits: prev.fiftyFiftyCredits + 1,
          }));
          setLevelUpNotice(`🔥 Streak ${nextStreak}! • +1 50/50 Credit ✂️`);
        } else {
          // For flag-to-name: Award +1 to Atlas lifelines (both 50/50 and Capital)
          setLifelineState((prev) => ({
            ...prev,
            capitalCredits: prev.capitalCredits + 1,
            fiftyFiftyCredits: prev.fiftyFiftyCredits + 1,
          }));
          setLevelUpNotice(`🔥 Streak ${nextStreak}! • +1 Atlas Credits (50/50 ✂️ & Capital 🏛️)`);
        }
        setTimeout(() => setLevelUpNotice(null), 3200);
      } else if (!isCorrect && prevScore.currentStreak >= 5) {
        const isGlobe = settingsRef.current.gameMode === 'globe';
        const resetNotice = isGlobe
          ? `Streak ended at ${prevScore.currentStreak}. Keep conquering!`
          : `Streak ended at ${prevScore.currentStreak}. Keep going!`;
        setLevelUpNotice(resetNotice);
        setTimeout(() => setLevelUpNotice(null), 2500);
      }

      setTimeout(() => {
        generateRound(
          countriesRef.current,
          settingsRef.current,
          nextStreak,
          nextSolved
        );
      }, 550);
    },
    [currentRound, isPaused, isModalActive, playCorrect, playWrong, playStreakMilestone, triggerConfetti, generateRound]
  );

  // Handle Timeout (when timer hits 0 in Per-Question mode)
  const handleTimeout = useCallback(() => {
    if (isResolvingRef.current || !currentRound || isPaused || isModalActive) return;

    consecutiveTimeoutsRef.current += 1;
    const timeouts = consecutiveTimeoutsRef.current;

    setIsResolving(true);
    setSelectedOptionIndex(-1); // -1 indicates timed out (reveals correct answer in green)

    playWrong();

    const prevScore = scoreRef.current;
    const nextWrong = prevScore.wrong + 1;
    const nextTotal = prevScore.total + 1;

    const currentEdition = settingsRef.current.edition || 'world';
    const nextMistakes = globeMistakesRef.current + 1;
    setGlobeMistakes(nextMistakes);
    saveGlobeMistakes(nextMistakes, currentEdition);

    const newScore: GameScore = {
      right: prevScore.right,
      wrong: nextWrong,
      total: nextTotal,
      currentStreak: 0,
      bestStreak: prevScore.bestStreak,
    };

    setScore(newScore);
    saveScore(newScore, currentEdition);

    setLastAnswer({
      country: currentRound.targetCountry,
      isCorrect: false,
      selectedName: 'Time expired (No guess)',
    });

    // Check if 3 consecutive timeouts occurred -> Auto pause
    if (timeouts >= 3) {
      setIsPaused(true);
      setLevelUpNotice('⏸️ Game paused after 3 consecutive missed timers.');
      setTimeout(() => setLevelUpNotice(null), 3000);
      return;
    }

    setLevelUpNotice('⏱️ Time expired! Flag marked as incorrect.');
    setTimeout(() => setLevelUpNotice(null), 2200);

    // Refresh and advance to next round after feedback pause
    setTimeout(() => {
      generateRound(
        countriesRef.current,
        settingsRef.current,
        0,
        solvedAlphasRef.current
      );
    }, 700);
  }, [currentRound, isPaused, isModalActive, playWrong, generateRound]);

  // Timer countdown hook (10s per flag in 'timed' mode, strictly pauses during preloading and modals)
  useEffect(() => {
    if (!isGameStarted || isPreloading || settings.timerMode === 'relaxed' || isGameComplete || isLoading || isPaused || isModalActive) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 10s timer expired
          handleTimeout();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [isGameStarted, isPreloading, settings.timerMode, isGameComplete, isLoading, isPaused, isModalActive, currentRound, handleTimeout]);

  // Initial load strictly once
  useEffect(() => {
    initCountries();
  }, []);

  // Handle Final 3 Showdown submission
  const handleFinalThreeSubmit = useCallback(
    (assignments: Record<string, string>): { success: boolean; results: Record<string, boolean> } => {
      if (isResolvingRef.current || isPaused || isModalActive || !currentRound || !currentRound.finalThreeTargets) {
        return { success: false, results: {} };
      }

      const targets = currentRound.finalThreeTargets;
      const results: Record<string, boolean> = {};
      let wrongCount = 0;

      targets.forEach((t) => {
        const isMatch = assignments[t.alpha2] === t.alpha2;
        results[t.alpha2] = isMatch;
        if (!isMatch) wrongCount++;
      });

      const isAllCorrect = wrongCount === 0;
      const currentEdition = settingsRef.current.edition || 'world';

      if (isAllCorrect) {
        setIsResolving(true);
        playCorrect();
        playStreakMilestone();
        triggerConfetti(true);

        const prevSolved = solvedAlphasRef.current;
        const nextSolved = Array.from(new Set([...prevSolved, ...targets.map((t) => t.alpha2)]));
        setSolvedAlphas(nextSolved);
        saveSolvedCountryAlphas(nextSolved, currentEdition);

        const prevScore = scoreRef.current;
        const addedCount = targets.length;
        const nextStreak = prevScore.currentStreak + addedCount;
        const newScore: GameScore = {
          right: prevScore.right + addedCount,
          wrong: prevScore.wrong,
          total: prevScore.total + addedCount,
          currentStreak: nextStreak,
          bestStreak: Math.max(prevScore.bestStreak, nextStreak),
        };
        setScore(newScore);
        saveScore(newScore, currentEdition);

        // Check achievements
        const { updatedList, newlyUnlocked } = checkNewAchievements(
          achievementsRef.current,
          newScore,
          nextSolved,
          countriesRef.current
        );
        if (newlyUnlocked.length > 0) {
          setAchievements(updatedList);
          setAchievementNotice(newlyUnlocked[0]);
          setTimeout(() => setAchievementNotice(null), 4000);
        }

        setTimeout(() => {
          setIsGameComplete(true);
          setIsResolving(false);
        }, 700);

        return { success: true, results };
      } else {
        playWrong();
        const nextMistakes = globeMistakesRef.current + wrongCount;
        setGlobeMistakes(nextMistakes);
        saveGlobeMistakes(nextMistakes, currentEdition);

        const prevScore = scoreRef.current;
        const newScore: GameScore = {
          right: prevScore.right,
          wrong: prevScore.wrong + wrongCount,
          total: prevScore.total + wrongCount,
          currentStreak: 0,
          bestStreak: prevScore.bestStreak,
        };
        setScore(newScore);
        saveScore(newScore, currentEdition);

        return { success: false, results };
      }
    },
    [currentRound, isPaused, isModalActive, playCorrect, playWrong, playStreakMilestone, triggerConfetti]
  );

  // Keyboard shortcut listener (only when game has started, preloading is done, and no modal is active)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        !isGameStarted ||
        isPreloading ||
        isResolving ||
        !currentRound ||
        currentRound.isFinalThree ||
        isLoading ||
        isGameComplete ||
        isPaused ||
        isModalActive
      )
        return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= currentRound.options.length) {
        handleChoice(keyNum - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameStarted, isResolving, currentRound, isLoading, isGameComplete, isPaused, isModalActive, handleChoice]);

  // Start Game and Player Setup callbacks
  const startGame = useCallback((
    playerName?: string,
    config?: {
      edition?: GameEdition;
      mode?: GameMode;
      continent?: ContinentFilter;
      usRegion?: USRegionFilter;
      timer?: TimerMode;
    }
  ) => {
    if (playerName && playerName.trim()) {
      const trimmed = playerName.trim();
      setCurrentPlayerName(trimmed);
      setLastPlayerName(trimmed);
      currentPlayerNameRef.current = trimmed;
    }
    if (config) {
      updateSettings({
        ...(config.edition ? { edition: config.edition } : {}),
        ...(config.mode ? { gameMode: config.mode } : {}),
        ...(config.continent ? { continentFilter: config.continent } : {}),
        ...(config.usRegion ? { usRegionFilter: config.usRegion } : {}),
        ...(config.timer ? { timerMode: config.timer } : {}),
      });
    }
    setGameElapsedSeconds(0);
    setIsGameStarted(true);
    setIsStartModalOpen(false);
    navigateToRoute('play');

    // Freeze timer at 10 and initiate resource preloading
    setIsPreloading(true);
    setPreloadProgress(10);
    setPreloadStage('Preparing Expedition...');
    if (settingsRef.current.timerMode === 'timed') {
      setTimeLeft(10);
    } else {
      setTimeLeft(0);
    }

    const effectiveMode = config?.mode || settingsRef.current.gameMode;
    const effectiveEdition = config?.edition || settingsRef.current.edition || 'world';
    const effectiveContinent = config?.continent || settingsRef.current.continentFilter;
    const effectiveUsRegion = config?.usRegion || settingsRef.current.usRegionFilter || 'all';

    let pool = countriesRef.current;
    if (effectiveEdition === 'us-states') {
      if (effectiveUsRegion !== 'all') {
        pool = countriesRef.current.filter((c) => c.region === effectiveUsRegion);
      }
    } else if (effectiveContinent !== 'all') {
      pool = countriesRef.current.filter((c) => c.region === effectiveContinent);
    }
    if (pool.length === 0) pool = countriesRef.current;

    const solvedSet = new Set(solvedAlphasRef.current);
    const unsolvedPool = pool.filter((c) => !solvedSet.has(c.alpha2));

    preloadAllGameResources(
      currentRoundRef.current,
      effectiveMode,
      (p) => {
        setPreloadProgress(p.percent);
        setPreloadStage(p.stage);
      },
      { unsolvedPool, countryList: countriesRef.current },
      settingsRef.current.edition || 'world'
    )
      .catch((err) => {
        console.warn('Resource preloading warning:', err);
      })
      .finally(() => {
        setIsPreloading(false);
        if (settingsRef.current.timerMode === 'timed') {
          setTimeLeft(10);
        }
      });
  }, [updateSettings]);

  const navigateToHome = useCallback(() => {
    setIsGameStarted(false);
    setIsStartModalOpen(false);
    navigateToRoute('home');
  }, []);

  const openStartModal = useCallback(() => {
    setIsStartModalOpen(true);
  }, []);

  const closeStartModal = useCallback(() => {
    setIsStartModalOpen(false);
  }, []);

  const solvedCountriesList = countries.filter((c) => solvedAlphas.includes(c.alpha2));

  return {
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
    setIsGameComplete,
    isPaused,
    isLoading,
    isPreloading,
    preloadProgress,
    preloadStage,
    isResolving,
    selectedOptionIndex,
    error,
    dataSource,
    levelUpNotice,
    lifelineState,
    timeLeft,
    gameElapsedSeconds,
    maxTime: 10,
    localInfo: getLocalDataInfo(settings.edition),
    isGameStarted,
    isStartModalOpen,
    currentPlayerName,
    startGame,
    navigateToHome,
    openStartModal,
    closeStartModal,
    setCurrentPlayerName,
    handleChoice,
    handleFinalThreeSubmit,
    updateSettings,
    resetScore,
    resumeGame,
    reSyncData,
    initCountries,
    onUseCapital,
    onUseFiftyFifty,
  };
}

