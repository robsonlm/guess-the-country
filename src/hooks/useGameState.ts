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
} from '../services/countriesApi';
import { loadAchievements, checkNewAchievements } from '../services/achievements';
import { getNeighboringCountries } from '../services/countriesGeo';
import { useSoundEffects } from './useSoundEffects';

const INITIAL_LIFELINES: LifelineState = {
  capitalUsed: false,
  fiftyFiftyUsed: false,
  regionUsed: false,
  hiddenOptionIndices: [],
  activeHintText: null,
};

export function useGameState() {
  const [settings, setSettingsState] = useState<UserSettings>(loadSettings);
  const [score, setScore] = useState<GameScore>(loadScore);
  const [countries, setCountries] = useState<Country[]>([]);
  const [solvedAlphas, setSolvedAlphas] = useState<string[]>(loadSolvedCountryAlphas);
  const [globeMistakes, setGlobeMistakes] = useState<number>(loadGlobeMistakes);
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

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(settings.timerMode === 'blitz' ? 60 : 10);
  const timerIntervalRef = useRef<any>(null);
  const consecutiveTimeoutsRef = useRef<number>(0);

  // Active gameplay elapsed time ticker
  useEffect(() => {
    if (isLoading || isPaused || isGameComplete || !currentRound) return;

    const interval = setInterval(() => {
      setGameElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, isPaused, isGameComplete, currentRound]);

  // Stable references
  const lastTargetAlphaRef = useRef<string>('');
  const countriesRef = useRef<Country[]>([]);
  const solvedAlphasRef = useRef<string[]>(solvedAlphas);
  const globeMistakesRef = useRef<number>(globeMistakes);
  const settingsRef = useRef<UserSettings>(settings);
  const scoreRef = useRef<GameScore>(score);
  const isResolvingRef = useRef<boolean>(false);
  const achievementsRef = useRef<Achievement[]>(achievements);

  countriesRef.current = countries;
  solvedAlphasRef.current = solvedAlphas;
  globeMistakesRef.current = globeMistakes;
  settingsRef.current = settings;
  scoreRef.current = score;
  isResolvingRef.current = isResolving;
  achievementsRef.current = achievements;

  const { playCorrect, playWrong, playStreakMilestone, playLifeline } = useSoundEffects(settings.soundEnabled);

  const preloadFlag = (url?: string) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  };

  const calculateDifficulty = (mode: GameMode, streak: number) => {
    if (mode === 'globe') return { optionCount: 3, level: 1 };
    if (mode === 'classic') return { optionCount: 2, level: 1 };
    if (mode === 'challenger') return { optionCount: 4, level: 2 };
    const level = 1 + Math.floor(streak / 5);
    const optionCount = Math.min(2 + Math.floor(streak / 5) * 2, 10);
    return { optionCount, level };
  };

  // Generate round
  const generateRound = useCallback(
    (
      countryList: Country[],
      currentSettings: UserSettings,
      streak: number,
      solvedList: string[]
    ) => {
      if (!countryList || countryList.length === 0) return;

      // Filter by continent if active
      let pool = countryList;
      if (currentSettings.continentFilter !== 'all') {
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
      const { optionCount, level } = calculateDifficulty(currentSettings.gameMode, streak);

      // Determine question style
      let qType: 'flag-to-name' | 'name-to-flag' = 'flag-to-name';
      if (currentSettings.questionType === 'name-to-flag') {
        qType = 'name-to-flag';
      } else if (currentSettings.questionType === 'mixed') {
        qType = Math.random() > 0.5 ? 'flag-to-name' : 'name-to-flag';
      }

      // Special Globe Mode Final 3 Showdown condition (when 3 or fewer countries remain)
      if (currentSettings.gameMode === 'globe' && unsolvedPool.length <= 3) {
        const finalThreeTargets = [...unsolvedPool];
        finalThreeTargets.forEach((c) => preloadFlag(c.flagUrl));

        const options: ChoiceOption[] = finalThreeTargets.map((c) => ({
          name: c.name,
          isCorrect: true,
          country: c,
        }));

        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }

        setSelectedOptionIndex(null);
        setIsResolving(false);
        setLifelineState((prev) => ({
          ...prev,
          hiddenOptionIndices: [],
          activeHintText: null,
        }));

        if (currentSettings.timerMode === 'per-question') {
          setTimeLeft(10);
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

      preloadFlag(targetCountry.flagUrl);

      // Pick distractor countries
      let distractors: Country[] = [];

      if (currentSettings.gameMode === 'globe') {
        // In globe mode, pick authentic neighboring & regional countries STRICTLY from UNSOLVED pool
        // This ensures flags of already guessed right countries are never shown
        const distractorCandidates = unsolvedPool.filter((c) => c.alpha2 !== targetCountry.alpha2);
        distractors = getNeighboringCountries(targetCountry, distractorCandidates, optionCount - 1);
        distractors.forEach((c) => preloadFlag(c.flagUrl));
      } else {
        // Classic / progressive random distractors
        const usedAlphas = new Set<string>([targetCountry.alpha2]);
        while (distractors.length < optionCount - 1 && distractors.length < countryList.length - 1) {
          const randIdx = Math.floor(Math.random() * countryList.length);
          const candidate = countryList[randIdx];
          if (!usedAlphas.has(candidate.alpha2)) {
            usedAlphas.add(candidate.alpha2);
            distractors.push(candidate);
            preloadFlag(candidate.flagUrl);
          }
        }
      }

      let options: ChoiceOption[] = [
        { name: targetCountry.name, isCorrect: true, country: targetCountry },
        ...distractors.map((c) => ({ name: c.name, isCorrect: false, country: c })),
      ];

      if (currentSettings.adminTestMode) {
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
        hiddenOptionIndices: [],
        activeHintText: null,
      }));

      // Reset per-question timer
      if (currentSettings.timerMode === 'per-question') {
        setTimeLeft(10);
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
    },
    []
  );

  // Lifelines
  const onUseCapital = useCallback(() => {
    if (lifelineState.capitalUsed || !currentRound || isResolving || isPaused) return;
    playLifeline();
    const cap = currentRound.targetCountry.capital || 'Capital not recorded';
    setLifelineState((prev) => ({
      ...prev,
      capitalUsed: true,
      activeHintText: `🏛️ Capital Clue: The capital is "${cap}"`,
    }));
  }, [lifelineState.capitalUsed, currentRound, isResolving, isPaused, playLifeline]);

  const onUseFiftyFifty = useCallback(() => {
    if (lifelineState.fiftyFiftyUsed || !currentRound || isResolving || isPaused) return;
    playLifeline();
    const wrongIndices = currentRound.options
      .map((opt, idx) => (!opt.isCorrect ? idx : -1))
      .filter((idx) => idx !== -1);

    const countToRemove = Math.max(1, Math.floor(wrongIndices.length / 2));
    const toHide = wrongIndices.slice(0, countToRemove);

    setLifelineState((prev) => ({
      ...prev,
      fiftyFiftyUsed: true,
      hiddenOptionIndices: toHide,
      activeHintText: '✂️ 50/50: Removed half of the incorrect choices!',
    }));
  }, [lifelineState.fiftyFiftyUsed, currentRound, isResolving, isPaused, playLifeline]);

  const onUseRegion = useCallback(() => {
    if (lifelineState.regionUsed || !currentRound || isResolving || isPaused) return;
    playLifeline();
    const reg = currentRound.targetCountry.subregion || currentRound.targetCountry.region;
    setLifelineState((prev) => ({
      ...prev,
      regionUsed: true,
      activeHintText: `🌐 Region Clue: Located in "${reg}"`,
    }));
  }, [lifelineState.regionUsed, currentRound, isResolving, isPaused, playLifeline]);

  // Reset Score & Mastery
  const resetScore = useCallback(() => {
    clearGameProgress();
    const emptyScore: GameScore = { right: 0, wrong: 0, total: 0, currentStreak: 0, bestStreak: 0 };
    setScore(emptyScore);
    saveScore(emptyScore);
    setSolvedAlphas([]);
    saveSolvedCountryAlphas([]);
    setGlobeMistakes(0);
    saveGlobeMistakes(0);
    setLastAnswer(null);
    setLevelUpNotice(null);
    setLifelineState(INITIAL_LIFELINES);
    setIsGameComplete(false);
    setIsPaused(false);
    setGameElapsedSeconds(0);
    consecutiveTimeoutsRef.current = 0;

    if (settingsRef.current.timerMode === 'blitz') setTimeLeft(60);
    else if (settingsRef.current.timerMode === 'per-question') setTimeLeft(10);

    if (countriesRef.current.length > 0) {
      generateRound(countriesRef.current, settingsRef.current, 0, []);
    }
  }, [generateRound]);

  // Update Settings: restarts game from 0 if game type / mode / format / timer changed
  const updateSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setSettingsState((prev) => {
        const updated = { ...prev, ...newSettings };
        saveSettings(updated);

        // Apply theme immediately to document element
        if (updated.theme) {
          document.documentElement.setAttribute('data-theme', updated.theme);
        }

        const gameTypeChanged =
          (newSettings.gameMode !== undefined && newSettings.gameMode !== prev.gameMode) ||
          (newSettings.questionType !== undefined && newSettings.questionType !== prev.questionType) ||
          (newSettings.timerMode !== undefined && newSettings.timerMode !== prev.timerMode) ||
          (newSettings.continentFilter !== undefined && newSettings.continentFilter !== prev.continentFilter);

        if (gameTypeChanged) {
          // Restart game from 0
          const emptyScore: GameScore = { right: 0, wrong: 0, total: 0, currentStreak: 0, bestStreak: 0 };
          setScore(emptyScore);
          saveScore(emptyScore);
          setSolvedAlphas([]);
          saveSolvedCountryAlphas([]);
          setGlobeMistakes(0);
          saveGlobeMistakes(0);
          setLastAnswer(null);
          setLevelUpNotice('🔄 Game restarted from 0 for the new game mode.');
          setTimeout(() => setLevelUpNotice(null), 3000);
          setLifelineState(INITIAL_LIFELINES);
          setIsGameComplete(false);
          setIsPaused(false);
          setGameElapsedSeconds(0);
          consecutiveTimeoutsRef.current = 0;

          if (updated.timerMode === 'blitz') setTimeLeft(60);
          else if (updated.timerMode === 'per-question') setTimeLeft(10);
          else setTimeLeft(0);

          if (countriesRef.current.length > 0) {
            generateRound(countriesRef.current, updated, 0, []);
          }
        } else {
          if (updated.timerMode === 'blitz') setTimeLeft(60);
          else if (updated.timerMode === 'per-question') setTimeLeft(10);

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
    [generateRound]
  );

  // Resume game from paused state
  const resumeGame = useCallback(() => {
    setIsPaused(false);
    consecutiveTimeoutsRef.current = 0;
    setIsResolving(false);
    setSelectedOptionIndex(null);
    if (settingsRef.current.timerMode === 'blitz') setTimeLeft(60);
    else if (settingsRef.current.timerMode === 'per-question') setTimeLeft(10);

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

  // Load countries once on mount
  const initCountries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loadCountries();
      setCountries(res.countries);
      setDataSource(res.source);

      // Check if previous session was already completed (e.g. user refreshed after victory)
      const currentSolved = solvedAlphasRef.current;
      const continent = settingsRef.current.continentFilter;
      const pool =
        continent === 'all'
          ? res.countries
          : res.countries.filter((c) => c.region === continent);
      const unsolved = pool.filter((c) => !currentSolved.includes(c.alpha2));

      if (currentSolved.length > 0 && unsolved.length === 0) {
        // Clear cached progress so the game starts a clean new expedition
        clearGameProgress();
        setSolvedAlphas([]);
        saveSolvedCountryAlphas([]);
        setGlobeMistakes(0);
        saveGlobeMistakes(0);
        const emptyScore: GameScore = { right: 0, wrong: 0, total: 0, currentStreak: 0, bestStreak: 0 };
        setScore(emptyScore);
        saveScore(emptyScore);
        setIsGameComplete(false);
        setGameElapsedSeconds(0);
        generateRound(res.countries, settingsRef.current, 0, []);
      } else {
        generateRound(
          res.countries,
          settingsRef.current,
          scoreRef.current.currentStreak,
          solvedAlphasRef.current
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load local country data');
    } finally {
      setIsLoading(false);
    }
  }, [generateRound]);

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
      if (isResolvingRef.current || isPaused || !currentRound || index < 0 || index >= currentRound.options.length) {
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

      const prevSolved = solvedAlphasRef.current;
      let nextSolved = prevSolved;
      if (isCorrect && !prevSolved.includes(targetAlpha)) {
        nextSolved = [...prevSolved, targetAlpha];
        setSolvedAlphas(nextSolved);
        saveSolvedCountryAlphas(nextSolved);
      }

      if (!isCorrect) {
        const nextMistakes = globeMistakesRef.current + 1;
        setGlobeMistakes(nextMistakes);
        saveGlobeMistakes(nextMistakes);
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
      saveScore(newScore);

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

        const nextOptionsCount = Math.min(2 + Math.floor(nextStreak / 5) * 2, 10);
        const newLvl = 1 + Math.floor(nextStreak / 5);
        setLevelUpNotice(`🔥 Streak ${nextStreak}! Level ${newLvl} unlocked (${nextOptionsCount} choices)`);
        setTimeout(() => setLevelUpNotice(null), 3200);
      } else if (!isCorrect && prevScore.currentStreak >= 5) {
        setLevelUpNotice(`Difficulty reset to 2 choices`);
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
    [currentRound, isPaused, playCorrect, playWrong, playStreakMilestone, triggerConfetti, generateRound]
  );

  // Handle Timeout (when timer hits 0 in Per-Question mode)
  const handleTimeout = useCallback(() => {
    if (isResolvingRef.current || !currentRound || isPaused) return;

    consecutiveTimeoutsRef.current += 1;
    const timeouts = consecutiveTimeoutsRef.current;

    setIsResolving(true);
    setSelectedOptionIndex(-1); // -1 indicates timed out (reveals correct answer in green)

    playWrong();

    const prevScore = scoreRef.current;
    const nextWrong = prevScore.wrong + 1;
    const nextTotal = prevScore.total + 1;

    const nextMistakes = globeMistakesRef.current + 1;
    setGlobeMistakes(nextMistakes);
    saveGlobeMistakes(nextMistakes);

    const newScore: GameScore = {
      right: prevScore.right,
      wrong: nextWrong,
      total: nextTotal,
      currentStreak: 0,
      bestStreak: prevScore.bestStreak,
    };

    setScore(newScore);
    saveScore(newScore);

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
  }, [currentRound, isPaused, playWrong, generateRound]);

  // Timer countdown hook
  useEffect(() => {
    if (settings.timerMode === 'none' || isGameComplete || isLoading || isPaused) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (settings.timerMode === 'blitz') {
            clearInterval(timerIntervalRef.current);
            setIsGameComplete(true);
            return 0;
          } else {
            // Per-question timer expired
            handleTimeout();
            return 10;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [settings.timerMode, isGameComplete, isLoading, isPaused, currentRound, handleTimeout]);

  // Initial load strictly once
  useEffect(() => {
    initCountries();
  }, []);

  // Handle Final 3 Showdown submission
  const handleFinalThreeSubmit = useCallback(
    (assignments: Record<string, string>): { success: boolean; results: Record<string, boolean> } => {
      if (isResolvingRef.current || isPaused || !currentRound || !currentRound.finalThreeTargets) {
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

      if (isAllCorrect) {
        setIsResolving(true);
        playCorrect();
        playStreakMilestone();
        triggerConfetti(true);

        const prevSolved = solvedAlphasRef.current;
        const nextSolved = Array.from(new Set([...prevSolved, ...targets.map((t) => t.alpha2)]));
        setSolvedAlphas(nextSolved);
        saveSolvedCountryAlphas(nextSolved);

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
        saveScore(newScore);

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
        saveGlobeMistakes(nextMistakes);

        const prevScore = scoreRef.current;
        const newScore: GameScore = {
          right: prevScore.right,
          wrong: prevScore.wrong + wrongCount,
          total: prevScore.total + wrongCount,
          currentStreak: 0,
          bestStreak: prevScore.bestStreak,
        };
        setScore(newScore);
        saveScore(newScore);

        return { success: false, results };
      }
    },
    [currentRound, isPaused, playCorrect, playWrong, playStreakMilestone, triggerConfetti]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isResolving || !currentRound || currentRound.isFinalThree || isLoading || isGameComplete || isPaused) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= currentRound.options.length) {
        handleChoice(keyNum - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isResolving, currentRound, isLoading, isGameComplete, isPaused, handleChoice]);

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
    isResolving,
    selectedOptionIndex,
    error,
    dataSource,
    levelUpNotice,
    lifelineState,
    timeLeft,
    gameElapsedSeconds,
    maxTime: settings.timerMode === 'blitz' ? 60 : 10,
    localInfo: getLocalDataInfo(),
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
  };
}
