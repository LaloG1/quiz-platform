export function calculatePoints(timeLimitSec: number, timeMs: number, isDouble: boolean): number {
  // Fórmula Kahoot: Base 1000 * (1 - (tiempo_transcurrido / tiempo_total))
  // Mínimo 500 puntos por respuesta correcta
  const timeLimitMs = timeLimitSec * 1000;
  const timeElapsed = Math.min(timeMs, timeLimitMs);
  
  let basePoints = Math.round(1000 * (1 - (timeElapsed / timeLimitMs)));
  basePoints = Math.max(500, basePoints); // Mínimo 500

  if (isDouble) {
    return basePoints * 2;
  }

  return basePoints;
}