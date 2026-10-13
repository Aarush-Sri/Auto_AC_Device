import React from 'react';
import { Power, Minus, Plus, Snowflake, Flame, Wind, Leaf, ArrowRight } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function MultiZoneView() {
  const { zones, updateZone, setActiveZoneId, setActiveNav, formatTemp, unit } = useThermostat();

  const handleSetpointChange = (zone, delta) => {
    if (!zone.power) return;
    const newSetpoint = Math.min(85, Math.max(60, zone.setpoint + delta));
    updateZone(zone.id, { setpoint: Math.round(newSetpoint * 10) / 10 });
  };

  const handlePowerToggle = (zone) => {
    updateZone(zone.id, { power: !zone.power });
  };

  const handleModeChange = (zone, newMode) => {
    if (!zone.power) return;
    updateZone(zone.id, { mode: newMode });
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
            Spatial Distribution
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Multi-Zone Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-surface-container/70 border border-outline-variant/30 text-xs font-mono text-on-surface-variant">
            {zones.filter(z => z.power).length} of {zones.length} Zones Operating
          </div>
        </div>
      </div>

      {/* Grid of Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map((zone) => {
          const isCooling = zone.mode === 'cool' && zone.power;
          const isHeating = zone.mode === 'heat' && zone.power;

          return (
            <div
              key={zone.id}
              className={`p-6 rounded-2xl bg-surface-container/60 border transition-all duration-300 backdrop-blur-xl flex flex-col justify-between shadow-lg ${
                zone.power
                  ? isHeating
                    ? 'border-secondary/30 shadow-[0_0_20px_-4px_rgba(245,158,11,0.15)]'
                    : 'border-primary/30 shadow-[0_0_20px_-4px_rgba(6,182,212,0.15)]'
                  : 'border-outline-variant/20 opacity-80'
              }`}
            >
              {/* Card Top: Zone Info & Power Switch */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-primary uppercase tracking-wider font-semibold">
                    {zone.subtitle}
                  </span>
                  <h2 className="text-xl font-bold text-on-surface">{zone.name}</h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant font-mono">
                    <span>AQI: {zone.aqi}</span>
                    <span>•</span>
                    <span>{zone.power ? `${zone.powerDraw}W` : '0W'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePowerToggle(zone)}
                  className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                    zone.power
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'bg-surface-container-high border-outline-variant/30 text-outline'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {/* Card Middle: Current vs Setpoint */}
              <div className="my-6 flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase">
                    Ambient Temp
                  </span>
                  <span className="text-3xl font-extralight text-on-surface font-mono">
                    {formatTemp(zone.temp)}°{unit}
                  </span>
                </div>

                {/* Setpoint Stepper */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!zone.power}
                    onClick={() => handleSetpointChange(zone, -0.5)}
                    className="w-9 h-9 rounded-full bg-surface-container-highest/80 hover:bg-surface-bright text-on-surface flex items-center justify-center border border-outline-variant/30 disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono text-primary uppercase font-bold">
                      Setpoint
                    </span>
                    <span className="text-2xl font-semibold text-on-surface font-mono">
                      {formatTemp(zone.setpoint)}°
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!zone.power}
                    onClick={() => handleSetpointChange(zone, 0.5)}
                    className="w-9 h-9 rounded-full bg-surface-container-highest/80 hover:bg-surface-bright text-on-surface flex items-center justify-center border border-outline-variant/30 disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Bottom: Mode Chips & Inspect in Detail */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/20">
                <div className="flex items-center gap-1.5">
                  {['cool'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={!zone.power}
                      onClick={() => handleModeChange(zone, m)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer disabled:opacity-30 ${
                        zone.mode === m && zone.power
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-high/80 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveZoneId(zone.id);
                    setActiveNav('climate-control');
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <span>Control</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
