const API_URL = import.meta.env.VITE_API_URL;

// Cache configuration - 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const cache = {
  brief: { content: null, dateRange: null, timestamp: null }
};

const isCacheValid = () => {
  if (!cache.brief.content || !cache.brief.timestamp) return false;
  return Date.now() - cache.brief.timestamp < CACHE_DURATION;
};

const getCurrentWeekRange = () => {
  const currentDate = new Date();
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'long' });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const year = weekEnd.getFullYear();

  return `${startMonth} ${startDay}-${endDay}, ${year}`;
};

const getFallbackBrief = (upcomingMovies) => {
  const movieTitles = upcomingMovies.slice(0, 2).map(m => `"${m.title}"`).join(' and ');
  return `This week in cinema brings exciting developments across the industry. Major studios are gearing up for significant releases, with ${movieTitles} leading the conversation. Awards season continues to heat up as festival contenders emerge and market momentum builds. Stay tuned for more updates as the release calendar evolves.`;
};

export const weeklyBriefService = {
  generateBrief: async (upcomingMovies) => {
    if (isCacheValid()) {
      return {
        dateRange: cache.brief.dateRange,
        content: cache.brief.content
      };
    }

    try {
      const response = await fetch(`${API_URL}/api/movies/weekly-brief`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upcomingMovies }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate weekly brief');
      }

      const data = await response.json();
      const content = data.content?.trim();
      if (!content) {
        throw new Error('Invalid weekly brief response');
      }

      const dateRange = getCurrentWeekRange();
      cache.brief = { content, dateRange, timestamp: Date.now() };
      return { dateRange, content };
    } catch {
      if (cache.brief.content) {
        return { dateRange: cache.brief.dateRange, content: cache.brief.content };
      }

      return {
        dateRange: getCurrentWeekRange(),
        content: getFallbackBrief(upcomingMovies)
      };
    }
  },

  clearCache: () => {
    cache.brief = { content: null, dateRange: null, timestamp: null };
  },

  getCacheStatus: () => ({
    cached: !!cache.brief.content,
    valid: isCacheValid(),
    age: cache.brief.timestamp ? Math.floor((Date.now() - cache.brief.timestamp) / 1000) : null
  })
};
