/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Format timestamp
 */
export function formatTimestamp(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toLocaleTimeString()
}