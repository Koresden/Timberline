import { SafetyBanner } from './components/SafetyBanner';
import './App.css';

/**
 * Phase 0 hello-world shell. The three feature modules — Measure, Plan,
 * Simulate (HANDOFF §1) — are mounted here in Phases 2 and 3. For now this
 * proves the toolchain boots and the persistent safety banner renders.
 */
export default function App() {
  return (
    <div className="app">
      <SafetyBanner />
      <main className="app-main">
        <h1>Timberline</h1>
        <p className="tagline">Tree-felling planning assistant</p>
        <p className="phase-note">
          Phase 0 scaffold. Measure · Plan · Simulate arrive in later phases.
        </p>
      </main>
    </div>
  );
}
