/**
 * AmbientBackground
 * 
 * Organic abstract gradient patches that add warmth and depth
 * without distraction. Very low opacity, large, blurred, off-center.
 */
export function AmbientBackground() {
  return (
    <div className="bg-ambient" aria-hidden="true">
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />
    </div>
  );
}
