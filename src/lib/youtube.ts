/**
 * Helper to robustly extract YouTube video IDs and generate clean embed URLs.
 * Handles youtu.be, youtube.com/watch?v=..., youtube.com/embed/..., and shorts.
 */
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Match 11-character YouTube video ID
  const idMatch = trimmed.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
  if (idMatch && idMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${idMatch[1]}?autoplay=1&rel=0&enablejsapi=1`;
  }

  return trimmed;
}

export function getDirectYouTubeWatchUrl(url: string): string {
  if (!url) return 'https://youtube.com';
  const trimmed = url.trim();
  const idMatch = trimmed.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
  if (idMatch && idMatch[1]) {
    return `https://www.youtube.com/watch?v=${idMatch[1]}`;
  }
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}
