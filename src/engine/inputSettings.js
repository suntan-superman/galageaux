import { PLAYER } from '../constants/game';

/** One persisted sensitivity scale for gameplay, the menu and pause controls. */
export function normalizeTiltSensitivity(value) {
  if (value === null || value === undefined || value === '') {
    return PLAYER.TILT_SENSITIVITY_DEFAULT;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) return PLAYER.TILT_SENSITIVITY_DEFAULT;
  return Math.min(PLAYER.TILT_SENSITIVITY_MAX, Math.max(PLAYER.TILT_SENSITIVITY_MIN, number));
}
