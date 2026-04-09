const API_URL = import.meta.env.VITE_API_URL;

export async function tmdbRequest(path, query = {}) {
  const params = new URLSearchParams({ path });
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  const response = await fetch(`${API_URL}/api/movies/tmdb?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`TMDB proxy error: ${response.status}`);
  }

  return response.json();
}
