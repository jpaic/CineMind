const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Cache configuration - 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Cache storage
const cache = {
  brief: { content: null, dateRange: null, timestamp: null }
};

// Helper to check if cache is valid
const isCacheValid = () => {
  if (!cache.brief.content || !cache.brief.timestamp) return false;
  return Date.now() - cache.brief.timestamp < CACHE_DURATION;
};

// Helper to get current week date range
const getCurrentWeekRange = () => {
  const currentDate = new Date();
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday
  
  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'long' });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const year = weekEnd.getFullYear();
  
  return `${startMonth} ${startDay}-${endDay}, ${year}`;
};

// Fallback content if API fails
const getFallbackBrief = (upcomingMovies) => {
  const movieTitles = upcomingMovies.slice(0, 2).map(m => `"${m.title}"`).join(' and ');
  
  return `This week in cinema brings exciting developments across the industry. Major studios are gearing up for significant releases, with ${movieTitles} leading the conversation. Awards season continues to heat up as Oscar contenders emerge from the festival circuit, with industry insiders already speculating about potential nominations across all major categories. Stay tuned for more updates as we approach the heart of the 2025 awards season and these exciting new releases.`;
};

export const weeklyBriefService = {
  // Generate weekly brief using Groq AI
  generateBrief: async (upcomingMovies) => {
    // Check cache first
    if (isCacheValid()) {
      console.log('Using cached weekly brief');
      return {
        dateRange: cache.brief.dateRange,
        content: cache.brief.content
      };
    }

    try {
      console.log('Generating new weekly brief with Groq...');
      
      // Check if API key exists
      if (!GROQ_API_KEY) {
        console.error('GROQ API KEY is missing! Add VITE_GROQ_API_KEY to .env.local');
        throw new Error('Groq API key not configured');
      }
      
      // Prepare movie data for the prompt
      const movieList = upcomingMovies
        .map(m => `"${m.title}" (${m.date})${m.director !== 'TBA' ? ` directed by ${m.director}` : ''}`)
        .join(', ');

      console.log('Movies for prompt:', movieList);

      const prompt = `Write a professional cinema weekly brief with journalistic flair (2-3 paragraphs, ~180-200 words) about the current film industry landscape.

Include these upcoming releases naturally in the narrative: ${movieList}

Style Requirements:
- Write like a seasoned entertainment journalist for Variety or The Hollywood Reporter
- Use sophisticated, engaging prose with industry terminology
- Create smooth transitions between topics
- Be enthusiastic but maintain professional credibility
- Include context about directors, studios, or industry trends when relevant
- Mention awards season buzz if appropriate
- NO bullet points, NO lists, NO headers
- Write in flowing paragraphs only

Structure:
Paragraph 1: Open with industry overview and highlight 1-2 major releases
Paragraph 2: Discuss industry trends, awards buzz, or additional releases
Paragraph 3 (optional): Forward-looking statement or broader context

Write ONLY the brief content - no titles, headers, or extra formatting.`;

      console.log('Calling Groq API...');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'system',
            content: 'You are a veteran entertainment journalist writing for a prestigious cinema publication. Your writing style is sophisticated, insightful, and engaging - similar to top-tier trade publications like Variety and The Hollywood Reporter. You write in flowing prose with industry expertise and journalistic credibility.'
          }, {
            role: 'user',
            content: prompt
          }],
          max_tokens: 500,
          temperature: 0.8
        })
      });

      console.log('Groq API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Groq API error details:', errorData);
        throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      const content = data.choices[0].message.content.trim();
      console.log('Generated content:', content);
      
      const dateRange = getCurrentWeekRange();

      // Store in cache
      cache.brief = {
        content,
        dateRange,
        timestamp: Date.now()
      };

      console.log('Weekly brief generated successfully');
      
      return {
        dateRange,
        content
      };

    } catch (error) {
      console.error('Failed to generate weekly brief:', error);
      
      // If we have stale cache, use it as fallback
      if (cache.brief.content) {
        console.log('Using stale cache as fallback');
        return {
          dateRange: cache.brief.dateRange,
          content: cache.brief.content
        };
      }
      
      // Otherwise use static fallback
      console.log('Using static fallback content');
      return {
        dateRange: getCurrentWeekRange(),
        content: getFallbackBrief(upcomingMovies)
      };
    }
  },

  // Clear cache manually (useful for testing or refresh)
  clearCache: () => {
    cache.brief = { content: null, dateRange: null, timestamp: null };
    console.log('Weekly brief cache cleared');
  },

  // Get cache status (for debugging)
  getCacheStatus: () => {
    return {
      cached: !!cache.brief.content,
      valid: isCacheValid(),
      age: cache.brief.timestamp 
        ? Math.floor((Date.now() - cache.brief.timestamp) / 1000) 
        : null
    };
  }
};