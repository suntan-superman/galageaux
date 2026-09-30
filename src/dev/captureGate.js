/** Capture tools are opt-in and impossible to activate in a release build. */
export function isCaptureStudioEnabled() {
  return __DEV__ === true && process.env.EXPO_PUBLIC_ENABLE_CAPTURE_STUDIO === 'true';
}
