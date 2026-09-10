import React, { useState } from 'react';
import { Award, ExternalLink, Search, ChevronDown, ChevronUp, Trophy, Globe } from 'lucide-react';
import { Country, ContinentFilter } from '../types/game';

interface MasteredFlagsTrayProps {
  solvedCountries: Country[];
  allCountries: Country[];
  onOpenAchievements: () => void;
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
}

const CONTINENT_TABS: { id: ContinentFilter; label: string }[] = [
  { id: 'all', label: 'All Continents' },
  { id: 'Europe', label: 'Europe' },
  { id: 'Asia', label: 'Asia' },
  { id: 'Africa', label: 'Africa' },
  { id: 'Americas', label: 'Americas' },
  { id: 'Oceania', label: 'Oceania' },
];

export const MasteredFlagsTray: React.FC<MasteredFlagsTrayProps> = ({
  solvedCountries,
  allCountries,
  onOpenAchievements,
  unlockedAchievementsCount,
  totalAchievementsCount,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedContinent, setSelectedContinent] = useState<ContinentFilter>('all');

  const total = allCountries.length || 250;
  const count = solvedCountries.length;
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

  // Filter by search & selected continent
  const filtered = solvedCountries.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesContinent = selectedContinent === 'all' || c.region === selectedContinent;
    return matchesSearch && matchesContinent;
  });

  // Calculate counts per continent
  const getContinentStats = (region: string) => {
    const continentTotal = allCountries.filter((c) => c.region === region).length;
    const continentSolved = solvedCountries.filter((c) => c.region === region).length;
    return { solved: continentSolved, total: continentTotal };
  };

  return (
    <section className="mastered-tray" aria-label="Mastered Flags Collection">
      <div className="mastered-header">
        <div
          className="mastered-title-group"
          style={{ flex: 1, cursor: 'pointer' }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="mastered-icon">
            <Award size={18} />
          </div>
          <div>
            <h3 className="mastered-title">Flags Mastered</h3>
            <span className="mastered-subtitle">
              {count} of {total} countries conquered ({percentage}%)
            </span>
          </div>
        </div>

        <div className="mastered-actions">
          {/* Trophy Shelf Button */}
          <button
            type="button"
            className="achievement-tray-btn"
            onClick={onOpenAchievements}
            title="View Trophy Shelf & Achievements"
          >
            <Trophy size={15} style={{ color: '#fbbf24' }} />
            <span>
              {unlockedAchievementsCount}/{totalAchievementsCount} Trophies
            </span>
          </button>

          <div className="mastered-pct-badge">{percentage}%</div>

          <button
            type="button"
            className="icon-btn"
            style={{ width: 32, height: 32 }}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse mastered flags tray' : 'Expand mastered flags tray'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mastered-progress-track">
        <div
          className="mastered-progress-fill"
          style={{ width: `${Math.min(Number(percentage), 100)}%` }}
        />
      </div>

      {isExpanded && (
        <div className="mastered-body fade-in">
          {/* Continent Filter Chips */}
          <div className="continent-chips-row">
            {CONTINENT_TABS.map((tab) => {
              const isSelected = selectedContinent === tab.id;
              let badge = '';
              if (tab.id !== 'all') {
                const stats = getContinentStats(tab.id);
                badge = ` (${stats.solved}/${stats.total})`;
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`continent-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedContinent(tab.id)}
                >
                  <Globe size={12} />
                  <span>
                    {tab.label}
                    {badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          {count > 4 && (
            <div className="mastered-search-bar">
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search mastered countries…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mastered-search-input"
              />
            </div>
          )}

          {count === 0 ? (
            <div className="mastered-empty-state">
              <p>No flags mastered yet. Guess flags correctly to collect them here!</p>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Correctly guessed flags will never be repeated until you conquer all {total} countries.
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mastered-empty-state">
              <p>No mastered flags found matching your filter.</p>
            </div>
          ) : (
            <div className="mastered-grid">
              {filtered.map((country) => (
                <a
                  key={country.alpha2}
                  href={country.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mastered-chip"
                  title={`View ${country.name} on Google Maps`}
                >
                  <img
                    src={country.flagUrl || `https://flagcdn.com/w320/${country.alpha2.toLowerCase()}.png`}
                    alt={`Flag of ${country.name}`}
                    className="mastered-chip-flag"
                    loading="lazy"
                  />
                  <span className="mastered-chip-name">{country.name}</span>
                  <ExternalLink size={11} className="mastered-chip-link-icon" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
