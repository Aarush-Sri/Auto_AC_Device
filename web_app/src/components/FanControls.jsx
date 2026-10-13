import React, { useState } from 'react';
import { Fan, RefreshCw, Gauge } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function FanControls() {
  const { activeZone, setFanSpeed } = useThermostat();
  const { power, fanSpeed } = activeZone;
  const [swing, setSwing] = useState(true);

  const FAN_LEVELS = [
    { id: 'auto', label: 'Auto' },
    { id: 'low', label: '1 (Low)' },
    { id: 'med', label: '2 (Med)' },
    { id: 'high', label: '3 (High)' },
    { id: 'turbo', label: 'Turbo' },
  ];

  return (
    <div className="w-full max-w-md p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fan className={`w-4 h-4 ${power ? 'text-primary animate-spin' : 'text-outline'}`} style={{ animationDuration: fanSpeed === 'turbo' ? '1s' : fanSpeed === 'high' ? '2s' : fanSpeed === 'med' ? '3s' : '4s' }} />
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Blower & Airflow Velocity
          </span>
        </div>

        {/* Swing Toggle */}
        <button
          type="button"
          disabled={!power}
          onClick={() => setSwing(!swing)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            swing && power
              ? 'bg-primary/15 border-primary/40 text-primary'
              : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${swing && power ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          <span>Louver Swing</span>
        </button>
      </div>

      {/* Speed Selector Array */}
      <div className="grid grid-cols-5 gap-1.5 p-1 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
        {FAN_LEVELS.map((level) => {
          const isSelected = fanSpeed === level.id && power;
          return (
            <button
              key={level.id}
              type="button"
              disabled={!power}
              onClick={() => setFanSpeed(level.id)}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-surface-container-highest text-primary border border-primary/30 shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {level.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
