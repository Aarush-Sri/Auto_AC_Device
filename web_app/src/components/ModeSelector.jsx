import React from 'react';
import { Snowflake } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function ModeSelector() {
  const { activeZone, setMode } = useThermostat();
  const { power, mode } = activeZone;

  const MODES = [
    { id: 'cool', label: 'Cool' },
  ];

  return (
    <div className="flex items-center justify-center w-full max-w-[160px] p-1.5 rounded-2xl bg-surface-container-lowest/80 border border-outline-variant/30 backdrop-blur-xl shadow-inner">
      {MODES.map((m) => {
        const isSelected = (mode === m.id || mode === 'cool') && power;

        return (
          <button
            key={m.id}
            type="button"
            disabled={!power}
            onClick={() => setMode(m.id)}
            className={`w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isSelected
                ? 'bg-primary-container text-on-primary-container font-bold shadow-[0_0_18px_rgba(6,182,212,0.35)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5 text-primary" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
