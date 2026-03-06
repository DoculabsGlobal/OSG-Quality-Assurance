/**
 * Animated breathing dot indicator.
 * Used for loading states and live polling indicators.
 */
export default function BreathingDot({ size = 8, color, style = {} }) {
  return (
    <div
      className="breath-dot"
      style={{
        width: size,
        height: size,
        ...(color ? { background: color } : {}),
        ...style,
      }}
    />
  );
}
