import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';

export default function FilterBar({ movies, onFilterChange, showRatingFilter = false }) {
  const [filters, setFilters] = useState({
    decade: 'all',
    genre: 'all',
    sortBy: 'rating-desc',
    ratingMin: 0,
    ratingMax: 10,
  });

  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Extract unique decades from movies
  const decades = [...new Set(
    movies
      .map(m => m.year ? Math.floor(m.year / 10) * 10 : null)
      .filter(d => d !== null)
  )].sort((a, b) => b - a);

  // Extract unique genres from movies
  const genres = [...new Set(
    movies.flatMap(m => m.genres || [])
  )].sort();

  const sortOptions = [
    { value: 'rating-desc', label: 'Highest Rated' },
    { value: 'rating-asc', label: 'Lowest Rated' },
    { value: 'year-desc', label: 'Newest First' },
    { value: 'year-asc', label: 'Oldest First' },
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify parent when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const resetFilters = () => {
    setFilters({
      decade: 'all',
      genre: 'all',
      sortBy: 'rating-desc',
      ratingMin: 0,
      ratingMax: 10,
    });
  };

  const hasActiveFilters = filters.decade !== 'all' || filters.genre !== 'all' || filters.ratingMin > 0 || filters.ratingMax < 10;

  const FilterDropdown = ({ id, label, options, value, includeAll = true }) => {
    const isOpen = openDropdown === id;
    
    return (
      <div className="relative" ref={isOpen ? dropdownRef : null}>
        <button
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
            value !== 'all' && value !== 'rating-desc'
              ? 'bg-blue-500/20 border-blue-500/50 text-slate-200'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {label}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 left-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
            {includeAll && (
              <button
                onClick={() => updateFilter(id, 'all')}
                className={`w-full text-left px-4 py-2 text-sm transition hover:bg-slate-700 ${
                  value === 'all' ? 'bg-slate-700 text-blue-500' : 'text-slate-300'
                }`}
              >
                All
              </button>
            )}
            {options.map((option) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              
              return (
                <button
                  key={optionValue}
                  onClick={() => updateFilter(id, optionValue)}
                  className={`w-full text-left px-4 py-2 text-sm transition hover:bg-slate-700 ${
                    value === optionValue ? 'bg-slate-700 text-blue-500' : 'text-slate-300'
                  }`}
                >
                  {optionLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-6 pb-4 border-b border-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-400">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-sm font-medium">Filter & Sort:</span>
        </div>

        {/* Decade Filter */}
        {decades.length > 0 && (
          <FilterDropdown
            id="decade"
            label={filters.decade === 'all' ? 'Decade' : `${filters.decade}s`}
            options={decades.map(d => ({ value: d.toString(), label: `${d}s` }))}
            value={filters.decade}
          />
        )}

        {/* Genre Filter */}
        {genres.length > 0 && (
          <FilterDropdown
            id="genre"
            label={filters.genre === 'all' ? 'Genre' : filters.genre}
            options={genres}
            value={filters.genre}
          />
        )}

        {/* Rating Filter */}
        {showRatingFilter && (
          <div className="relative" ref={openDropdown === 'rating' ? dropdownRef : null}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
              className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                filters.ratingMin > 0 || filters.ratingMax < 10
                  ? 'bg-blue-500/20 border-blue-500/50 text-slate-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Rating {filters.ratingMin > 0 || filters.ratingMax < 10 ? `${filters.ratingMin}-${filters.ratingMax}` : ''}
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'rating' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'rating' && (
              <div className="absolute top-full mt-2 left-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 w-[280px] p-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Minimum Rating</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={filters.ratingMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, ratingMin: parseFloat(e.target.value) }))}
                      className="w-full accent-blue-500"
                    />
                    <div className="text-center text-sm text-slate-300 mt-1">{filters.ratingMin}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Maximum Rating</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={filters.ratingMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, ratingMax: parseFloat(e.target.value) }))}
                      className="w-full accent-blue-500"
                    />
                    <div className="text-center text-sm text-slate-300 mt-1">{filters.ratingMax}</div>
                  </div>
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, ratingMin: 0, ratingMax: 10 }));
                      setOpenDropdown(null);
                    }}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sort By */}
        <FilterDropdown
          id="sortBy"
          label={sortOptions.find(o => o.value === filters.sortBy)?.label || 'Sort By'}
          options={sortOptions}
          value={filters.sortBy}
          includeAll={false}
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition text-sm font-medium flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}