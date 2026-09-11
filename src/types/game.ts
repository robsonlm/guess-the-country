export interface Country {
  name: string;
  alpha2: string;
  capital?: string;
  region: string;
  subregion?: string;
  mapUrl: string;
  flagUrl?: string;
}

export interface GameScore {
  right: number;
  wrong: number;
  total: number;
  currentStreak: number;
  bestStreak: number;
}

export type GameMode = 'globe' | 'progressive' | 'classic' | 'challenger';
export type QuestionType = 'flag-to-name' | 'name-to-flag' | 'mixed';
export type TimerMode = 'none' | 'blitz' | 'per-question'; // none = untimed, blitz = 60s total, per-question = 10s per flag
export type ThemeMode = 'deep-space' | 'cyberpunk' | 'vintage-atlas' | 'emerald-forest';
export type ContinentFilter = 'all' | 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';

export interface UserSettings {
  soundEnabled: boolean;
  gameMode: GameMode;
  questionType: QuestionType;
  timerMode: TimerMode;
  theme: ThemeMode;
  continentFilter: ContinentFilter;
}

export interface ChoiceOption {
  name: string;
  isCorrect: boolean;
  country: Country;
}

export interface Round {
  targetCountry: Country;
  options: ChoiceOption[];
  level: number;
  optionCount: number;
  remainingCount: number;
  totalCount: number;
  questionType: 'flag-to-name' | 'name-to-flag';
  isFinalThree?: boolean;
  finalThreeTargets?: Country[];
}

export interface LastAnswer {
  country: Country;
  isCorrect: boolean;
  selectedName: string;
  selectedCountry?: Country;
}

export interface LifelineState {
  capitalUsed: boolean;
  fiftyFiftyUsed: boolean;
  regionUsed: boolean;
  hiddenOptionIndices: number[];
  activeHintText: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}
