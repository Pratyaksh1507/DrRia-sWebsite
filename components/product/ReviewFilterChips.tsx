import React from 'react';

interface ReviewFilterChipsProps {
  ratingFilter: number | null;
  onRatingChange: (rating: number | null) => void;
  skinTypeFilter: string | null;
  onSkinTypeChange: (skin: string | null) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  totalResults: number;
}

const SKIN_TYPES = [
  { value: 'dry', label: 'Dry' },
  { value: 'oily', label: 'Oily' },
  { value: 'combination', label: 'Combination' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'normal', label: 'Normal' },
];

export default function ReviewFilterChips({
  ratingFilter,
  onRatingChange,
  skinTypeFilter,
  onSkinTypeChange,
  sort,
  onSortChange,
  totalResults,
}: ReviewFilterChipsProps) {
  const hasActiveFilters = ratingFilter !== null || skinTypeFilter !== null;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Skin Type Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-[#1A1A1A] mr-1">Skin Type:</span>
          <button
            type="button"
            onClick={() => onSkinTypeChange(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              skinTypeFilter === null
                ? 'bg-[#5C3D1E] text-white shadow-2xs'
                : 'bg-white border border-[#E8E0D5] text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FBF6EE]'
            }`}
          >
            All
          </button>
          {SKIN_TYPES.map((st) => {
            const isSelected = skinTypeFilter === st.value;
            return (
              <button
                key={st.value}
                type="button"
                onClick={() => onSkinTypeChange(isSelected ? null : st.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#5C3D1E] text-white shadow-2xs'
                    : 'bg-white border border-[#E8E0D5] text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FBF6EE]'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Sort & Count */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-[#6B6B6B]">
            Showing <strong className="text-[#1A1A1A]">{totalResults}</strong> reviews
          </span>

          <label className="flex items-center gap-1.5 text-xs text-[#6B6B6B]">
            <span className="sr-only">Sort reviews by</span>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-white border border-[#E8E0D5] text-[#1A1A1A] text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C9952A]"
            >
              <option value="recent">Most Recent</option>
              <option value="helpful">Most Helpful</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </label>
        </div>
      </div>

      {/* Active filters pill display and clear option */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#6B6B6B]">Filtered by:</span>
          {ratingFilter !== null && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FBF6EE] border border-[#E8E0D5] text-[#5C3D1E] font-medium">
              {ratingFilter} Stars
              <button
                type="button"
                onClick={() => onRatingChange(null)}
                className="hover:text-red-700 ml-0.5"
                aria-label="Remove star rating filter"
              >
                &times;
              </button>
            </span>
          )}
          {skinTypeFilter !== null && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FBF6EE] border border-[#E8E0D5] text-[#5C3D1E] font-medium capitalize">
              {skinTypeFilter} Skin
              <button
                type="button"
                onClick={() => onSkinTypeChange(null)}
                className="hover:text-red-700 ml-0.5"
                aria-label="Remove skin type filter"
              >
                &times;
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onRatingChange(null);
              onSkinTypeChange(null);
            }}
            className="text-xs text-[#5C3D1E] underline hover:text-[#3E2914] ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
