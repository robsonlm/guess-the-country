import React, { useState } from 'react';
import { Award, ExternalLink, Search, Trophy, Globe, X } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<ContinentFilter>('all');

  const total = allCountries.length || 197;
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
    <>
      {/* Compact Single-Row Bottom Bar */}
      <section className="mastered-tray compact-bottom-bar" aria-label="Mastered Flags Summary">
        <div className="mastered-header" style={{ padding: '4px 10px', gap: '8px' }}>
          <div
            className="mastered-title-group"
            style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setIsModalOpen(true)}
            title="Click to view mastered flags gallery"
          >
            <div className="mastered-icon" style={{ width: '24px', height: '24px' }}>
              <Award size={14} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                Mastered: {count}/{total}
              </span>
              <span className="mastered-pct-badge" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                {percentage}%
              </span>
            </div>
          </div>

          <div className="mastered-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Trophy Shelf Button */}
            <button
              type="button"
              className="achievement-tray-btn"
              onClick={onOpenAchievements}
              title="View Trophy Shelf & Achievements"
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
            >
              <Trophy size={13} style={{ color: '#fbbf24' }} />
              <span>
                {unlockedAchievementsCount}/{totalAchievementsCount} Trophies
              </span>
            </button>

            <button
              type="button"
              className="action-btn"
              style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px' }}
              onClick={() => setIsModalOpen(true)}
              title="Open conquered flags gallery"
            >
              View Flags
            </button>
          </div>
        </div>

        {/* Mini Progress Track */}
        <div className="mastered-progress-track" style={{ height: '3px' }}>
          <div
            className="mastered-progress-fill"
            style={{ width: `${Math.min(Number(percentage), 100)}%` }}
          />
        </div>
      </section>

      {/* Full Modal Gallery on Demand */}
      {isModalOpen && (
        <div className="modal-overlay fade-in" onClick={() => setIsModalOpen(false)} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} style={{ color: '#fbbf24' }} />
                <h2 className="modal-title">Conquered Flags Gallery ({count}/{total})</h2>
              </div>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {/* Continent Filter Chips */}
              <div className="continent-chips-row" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
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
              {count > 3 && (
                <div className="mastered-search-bar" style={{ marginBottom: '0.75rem' }}>
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
                    Correctly guessed flags are saved and will never be repeated until you complete the expedition.
                  </span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="mastered-empty-state">
                  <p>No mastered flags found matching your filter.</p>
                </div>
              ) : (
                <div className="mastered-grid" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
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
          </div>
        </div>
      )}
    </>
  );
};

