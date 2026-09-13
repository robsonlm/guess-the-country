export interface Country {
  name: string;
  alpha2: string;
  code?: string;
  capital?: string;
  region: string;
  subregion?: string;
  nickname?: string;
  mapUrl: string;
  flagUrl?: string;
  lowFlagUrl?: string;
}

export interface GameScore {
  right: number;
  wrong: number;
  total: number;
  currentStreak: number;
  bestStreak: number;
}

export type GameEdition = 'world' | 'us-states';
export type GameMode = 'globe' | 'flag-to-name' | 'name-to-flag';
export type TimerMode = 'timed' | 'relaxed'; // timed = 10s per flag, relaxed = untimed
export type ThemeMode = 'deep-space' | 'cyberpunk' | 'vintage-atlas' | 'emerald-forest';
export type ContinentFilter = 'all' | 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';
export type USRegionFilter = 'all' | 'Northeast' | 'Midwest' | 'South' | 'West';

export interface UserSettings {
  soundEnabled: boolean;
  edition: GameEdition;
  gameMode: GameMode;
  timerMode: TimerMode;
  theme: ThemeMode;
  continentFilter: ContinentFilter;
  usRegionFilter: USRegionFilter;
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
  capitalCredits: number;
  capitalUsedOnCurrentRound: boolean;
  fiftyFiftyCredits: number;
  fiftyFiftyUsedOnCurrentRound: boolean;
  fiftyFiftyUsed?: boolean;
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
