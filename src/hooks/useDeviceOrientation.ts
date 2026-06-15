/**
 * useDeviceOrientation — read the device's tilt as a clinometer sighting angle,
 * handling the iOS 13+ permission flow (HANDOFF §2.1).
 *
 * Side-effect boundary: this is the one place the UI touches the sensor. It does
 * NO felling math — it surfaces a raw tilt angle in degrees; the engine
 * (`measureByTangent`) does the trigonometry.
 *
 * Permission model:
 *  - iOS 13+ gates `DeviceOrientationEvent` behind a user-gesture-triggered
 *    `DeviceOrientationEvent.requestPermission()` returning 'granted'/'denied'.
 *    We feature-detect that method and only call it from `requestAccess()` (must
 *    be invoked from a click handler).
 *  - Non-iOS browsers expose the event with no permission call — we just attach.
 *  - If the API is missing entirely (or permission is denied), we report an
 *    'unsupported' / 'denied' status so the screen can fall back to manual entry.
 *
 * Sighting angle: we report `beta` (front-to-back tilt). Holding the phone
 * upright and tilting it back to sight up a tree increases beta; that IS the
 * angle above horizontal. `gamma` (left-right tilt) is also exposed for callers
 * that prefer landscape sighting, but `beta` is the default sighting angle.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type OrientationStatus =
  | 'idle' // not yet started
  | 'unsupported' // no DeviceOrientationEvent at all → manual only
  | 'prompt' // iOS: permission required, awaiting requestAccess()
  | 'denied' // permission explicitly denied → manual only
  | 'active'; // listening; `beta`/`gamma` are live

export interface DeviceOrientationState {
  status: OrientationStatus;
  /** Front-to-back tilt (degrees); the default sighting angle. `null` until a reading arrives. */
  beta: number | null;
  /** Left-to-right tilt (degrees), for landscape sighting. `null` until a reading arrives. */
  gamma: number | null;
  /** True when this browser needs an explicit permission gesture (iOS 13+). */
  needsPermission: boolean;
  /** Call from a user gesture (click) to request iOS permission + start listening. */
  requestAccess: () => Promise<void>;
  /** Stop listening (e.g. after capturing an angle) without losing the last reading. */
  stop: () => void;
}

// iOS 13+ exposes a static `requestPermission()` on the constructor. It is not in
// the standard lib typings, so we narrow it via a feature-detect type guard.
type PermissionResult = 'granted' | 'denied' | 'default';
interface RequestPermissionCtor {
  requestPermission: () => Promise<PermissionResult>;
}
function hasRequestPermission(ctor: unknown): ctor is RequestPermissionCtor {
  return (
    typeof ctor === 'function' &&
    typeof (ctor as { requestPermission?: unknown }).requestPermission === 'function'
  );
}

export function useDeviceOrientation(): DeviceOrientationState {
  const supported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  const needsPermission = supported && hasRequestPermission(window.DeviceOrientationEvent);

  const [status, setStatus] = useState<OrientationStatus>(() => {
    if (!supported) return 'unsupported';
    return needsPermission ? 'prompt' : 'idle';
  });
  const [beta, setBeta] = useState<number | null>(null);
  const [gamma, setGamma] = useState<number | null>(null);

  // Keep one stable listener reference so attach/detach always pair up.
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  if (handlerRef.current === null) {
    handlerRef.current = (e: DeviceOrientationEvent) => {
      setBeta(e.beta);
      setGamma(e.gamma);
    };
  }

  const attach = useCallback(() => {
    if (!supported || !handlerRef.current) return;
    window.addEventListener('deviceorientation', handlerRef.current);
    setStatus('active');
  }, [supported]);

  const stop = useCallback(() => {
    if (handlerRef.current) {
      window.removeEventListener('deviceorientation', handlerRef.current);
    }
  }, []);

  const requestAccess = useCallback(async () => {
    if (!supported) {
      setStatus('unsupported');
      return;
    }
    // Non-iOS: no permission gate, just attach.
    if (!hasRequestPermission(window.DeviceOrientationEvent)) {
      attach();
      return;
    }
    // iOS 13+: must be called from a user gesture.
    try {
      const result = await window.DeviceOrientationEvent.requestPermission();
      if (result === 'granted') {
        attach();
      } else {
        setStatus('denied');
      }
    } catch {
      // Throws if not called from a gesture, or on unexpected platform errors.
      setStatus('denied');
    }
  }, [supported, attach]);

  // On unmount, always detach so we never leak a 60 Hz listener.
  useEffect(() => stop, [stop]);

  return { status, beta, gamma, needsPermission, requestAccess, stop };
}
