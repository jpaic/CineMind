const API_URL = import.meta.env.VITE_API_URL;

export async function getCinemaNews() {
  const res = await fetch(`${API_URL}/api/news`);
  if (!res.ok) {
    throw new Error('Failed to load news');
  }
  const data = await res.json();
  return data.items || [];
}
