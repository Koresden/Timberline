/**
 * Pure-logic tests for the display-unit layer (src/units.ts). These guard the
 * conversion round-trips and formatting that sit at the SI ⇄ imperial boundary —
 * the surface the safety-auditor red-teams for unit confusion. Node env, no DOM.
 */
import { describe, it, expect } from 'vitest';
import {
  mToFt,
  ftToM,
  cmToIn,
  inToCm,
  kphToMph,
  mphToKph,
  formatLength,
  parseLength,
  formatEstimate,
  unitLabel,
  convertDisplayValue,
} from '../src/units';

describe('length conversion round-trips', () => {
  it('m ⇄ ft is reversible', () => {
    for (const m of [0, 1, 13.899, 18, 100]) {
      expect(ftToM(mToFt(m))).toBeCloseTo(m, 9);
    }
  });

  it('cm ⇄ in is reversible', () => {
    for (const cm of [0, 2.5, 30, 50, 70]) {
      expect(inToCm(cmToIn(cm))).toBeCloseTo(cm, 9);
    }
  });

  it('kph ⇄ mph is reversible', () => {
    for (const kph of [0, 5, 15, 25]) {
      expect(mphToKph(kphToMph(kph))).toBeCloseTo(kph, 9);
    }
  });

  it('uses exact, known conversion factors', () => {
    expect(mToFt(1)).toBeCloseTo(3.280839895, 6); // 1 m = 3.2808… ft
    expect(cmToIn(2.54)).toBeCloseTo(1, 9); // 2.54 cm = 1 in (exact)
    expect(kphToMph(1.609344)).toBeCloseTo(1, 9); // 1.609344 kph = 1 mph (exact)
  });
});

describe('formatLength', () => {
  it('formats metric distances at 1 decimal with a label', () => {
    expect(formatLength(13.899, 'distance', 'metric')).toBe('13.9 m');
  });

  it('converts and formats imperial distances', () => {
    // 13.899 m → 45.6 ft
    expect(formatLength(13.899, 'distance', 'imperial')).toBe('45.6 ft');
  });

  it('formats diameters: cm whole numbers, inches to 1 decimal', () => {
    expect(formatLength(30, 'diameter', 'metric')).toBe('30 cm');
    expect(formatLength(30, 'diameter', 'imperial')).toBe('11.8 in');
  });

  it('can omit the unit suffix', () => {
    expect(formatLength(13.899, 'distance', 'metric', { withUnit: false })).toBe('13.9');
  });

  it('rounds only at display — full precision is preserved upstream', () => {
    // The formatted string rounds, but the conversion itself is full precision.
    expect(mToFt(13.899)).toBeCloseTo(45.600393, 5);
    expect(formatLength(13.899, 'distance', 'imperial')).toBe('45.6 ft');
  });
});

describe('cut dimensions (finding D — small cut specs at 1 decimal, never overstated)', () => {
  it('shows a 3.5 cm hinge as "3.5 cm", not the overstated "4 cm"', () => {
    // The bug: cut specs reused the 'diameter' quantity (0 dp metric), so a
    // 3.5 cm hinge rendered "4 cm" — overstating a small, safety-relevant spec.
    expect(formatLength(3.5, 'cut', 'metric')).toBe('3.5 cm');
  });

  it('keeps a consistent 1 decimal across larger cut dimensions', () => {
    expect(formatLength(24, 'cut', 'metric')).toBe('24.0 cm');
  });

  it('formats imperial cut dimensions at 1 decimal too', () => {
    // 3.5 cm → 1.3779… in → "1.4 in"
    expect(formatLength(3.5, 'cut', 'imperial')).toBe('1.4 in');
  });

  it('rounds down rather than up at the half-cm boundary it used to overstate', () => {
    // 3.5 → "3.5" (not "4"); the rounding never inflates a small spec.
    expect(formatLength(3.5, 'cut', 'metric', { withUnit: false })).toBe('3.5');
  });

  it('leaves DBH (the trunk diameter) at whole cm — only cut specs gained a decimal', () => {
    // Regression guard: the fix is scoped to cut specs; DBH still reads "30 cm".
    expect(formatLength(30, 'diameter', 'metric')).toBe('30 cm');
  });
});

describe('parseLength', () => {
  it('parses a metric value straight to SI', () => {
    expect(parseLength('15', 'distance', 'metric')).toBeCloseTo(15, 9);
  });

  it('parses an imperial value back to SI', () => {
    // 45.6 ft → ~13.899 m
    expect(parseLength('45.6', 'distance', 'imperial')).toBeCloseTo(13.89888, 4);
  });

  it('parses diameters back to SI cm', () => {
    expect(parseLength('20', 'diameter', 'imperial')).toBeCloseTo(50.8, 6); // 20 in = 50.8 cm
  });

  it('returns null for blank/garbage so the engine never sees NaN', () => {
    expect(parseLength('', 'distance', 'metric')).toBeNull();
    expect(parseLength('   ', 'distance', 'metric')).toBeNull();
    expect(parseLength('abc', 'distance', 'metric')).toBeNull();
    expect(parseLength('Infinity', 'distance', 'metric')).toBeNull();
  });
});

describe('formatEstimate', () => {
  it('formats H ± ΔH in metric', () => {
    expect(formatEstimate(13.899, 0.988, 'metric')).toBe('13.9 ± 1.0 m');
  });

  it('converts both H and ΔH through the same factor for imperial', () => {
    // 13.899 m → 45.6 ft, 0.988 m → 3.2 ft
    expect(formatEstimate(13.899, 0.988, 'imperial')).toBe('45.6 ± 3.2 ft');
  });
});

describe('convertDisplayValue (DB-2 D2 — re-convert a typed value on unit toggle)', () => {
  it('re-converts a known metric height to imperial feet', () => {
    // 14.887 m (the worst-case height fixture) → ~48.84 → 48.8 ft at 1 dp.
    expect(convertDisplayValue('14.887', 'distance', 'metric', 'imperial')).toBe('48.8');
  });

  it('re-converts that imperial value back to metres', () => {
    // 48.8 ft → 14.87 m at 1 dp (display rounding; canonical SI avoids this drift).
    expect(convertDisplayValue('48.8', 'distance', 'imperial', 'metric')).toBe('14.9');
  });

  it('is stable on repeated metric→imperial→metric round-trips at display precision', () => {
    let v = '15.0';
    for (let i = 0; i < 10; i++) {
      v = convertDisplayValue(v, 'distance', 'metric', 'imperial');
      v = convertDisplayValue(v, 'distance', 'imperial', 'metric');
    }
    // Stays pinned to the 1-dp metric value; no runaway drift.
    expect(v).toBe('15.0');
  });

  it('converts diameters and speeds by quantity', () => {
    expect(convertDisplayValue('30', 'diameter', 'metric', 'imperial')).toBe('11.8'); // cm → in
    expect(convertDisplayValue('16', 'speed', 'metric', 'imperial')).toBe('10'); // kph → mph (0 dp)
  });

  it('passes blanks and unparseable input through unchanged (never clobbers a field)', () => {
    expect(convertDisplayValue('', 'distance', 'metric', 'imperial')).toBe('');
    expect(convertDisplayValue('   ', 'distance', 'metric', 'imperial')).toBe('   ');
    expect(convertDisplayValue('abc', 'distance', 'metric', 'imperial')).toBe('abc');
  });

  it('returns the input untouched when the system is unchanged (no spurious re-round)', () => {
    expect(convertDisplayValue('14.887', 'distance', 'metric', 'metric')).toBe('14.887');
  });
});

describe('unitLabel', () => {
  it('returns the right abbreviations', () => {
    expect(unitLabel('distance', 'metric')).toBe('m');
    expect(unitLabel('distance', 'imperial')).toBe('ft');
    expect(unitLabel('diameter', 'metric')).toBe('cm');
    expect(unitLabel('diameter', 'imperial')).toBe('in');
    expect(unitLabel('cut', 'metric')).toBe('cm');
    expect(unitLabel('cut', 'imperial')).toBe('in');
    expect(unitLabel('speed', 'metric')).toBe('kph');
    expect(unitLabel('speed', 'imperial')).toBe('mph');
  });
});
