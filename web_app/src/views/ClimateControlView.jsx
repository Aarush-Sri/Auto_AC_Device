import React from 'react';
import CircularDial from '../components/CircularDial';
import ModeSelector from '../components/ModeSelector';
import TelemetryCards from '../components/TelemetryCards';
import { useThermostat } from '../context/ThermostatContext';

export default function ClimateControlView() {
  const { activeZone, bleState, connectBle } = useThermostat();
  const { power, mode, name, subtitle } = activeZone;

  // Dynamic ambient glow color
  const getGlowBg = () => {
    if (!power) return 'bg-transparent';
    return 'bg-primary/10';
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-6 px-4 max-w-4xl mx-auto">
      {/* Dynamic Ambient Thermal Glow */}
      <div
        className={`pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[550px] rounded-full blur-[150px] transition-all duration-700 ${getGlowBg()}`}
      />

      {/* Hero Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-2 z-10">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Smart Thermostat</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              power ? 'bg-primary animate-ping' : 'bg-outline'
            }`}
          />
          <span className="text-xs font-mono text-on-surface-variant uppercase">
            {power ? 'Active' : 'Standby'}
          </span>
        </div>
      </div>

      {/* BLE Hardware Link Pill */}
      <div className="w-full max-w-md z-10 mb-4 flex justify-center">
        {bleState.isConnected ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold">903-AC Connected</span>
            <span className="text-outline-variant">•</span>
            <span className="text-[11px] text-on-surface-variant">Dial writes to UUID ...0002</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={connectBle}
            disabled={bleState.isConnecting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high/80 hover:bg-primary/20 border border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:text-primary text-xs font-mono transition-all cursor-pointer shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{bleState.isConnecting ? 'Connecting to 903-AC...' : '⚠️ Click to Connect 903-AC via Bluetooth'}</span>
          </button>
        )}
      </div>

      {/* Main Circular Dial */}
      <div className="z-10 my-2">
        <CircularDial />
      </div>

      {/* Mode Selector */}
      <div className="w-full max-w-md z-10 mt-4 mb-4">
        <ModeSelector />
      </div>

      {/* Telemetry Summary Cards */}
      <div className="w-full max-w-md z-10">
        <TelemetryCards />
      </div>
    </div>
  );
}
