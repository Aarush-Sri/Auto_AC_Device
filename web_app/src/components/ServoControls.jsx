import React, { useState } from 'react';
import { RotateCw, Plus, Minus, Compass, Send, RotateCcw, Sliders, ChevronRight } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';
import { BLE_CONFIG } from '../services/bleService';

export default function ServoControls({ compact = false }) {
  const {
    servoPosition,
    servoStep,
    setServoStep,
    incrementServoPosition,
    decrementServoPosition,
    setServoPosition,
    resetServoPosition,
    bleState
  } = useThermostat();

  const [lastSentTime, setLastSentTime] = useState(null);

  const STEP_OPTIONS = [1, 5, 10, 15, 45];
  const PRESETS = [
    { label: '0° Min', value: 0 },
    { label: '45°', value: 45 },
    { label: '90° Mid', value: 90 },
    { label: '135°', value: 135 },
    { label: '180° Max', value: 180 },
  ];

  const handleIncrement = (customStep = null) => {
    incrementServoPosition(customStep);
    setLastSentTime(new Date().toLocaleTimeString());
  };

  const handleDecrement = (customStep = null) => {
    decrementServoPosition(customStep);
    setLastSentTime(new Date().toLocaleTimeString());
  };

  const handleSetPosition = (pos) => {
    setServoPosition(pos);
    setLastSentTime(new Date().toLocaleTimeString());
  };

  // Percentage along 0-180 range
  const percentage = Math.round((servoPosition / 180) * 100);

  if (compact) {
    return (
      <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-surface-container/70 border border-outline-variant/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold font-mono text-on-surface uppercase">Servo Position</span>
          </div>
          <span className="text-sm font-mono font-bold text-primary">{servoPosition}°</span>
        </div>

        {/* Increment / Decrement Row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDecrement()}
            aria-label="Decrement Servo Position"
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-surface-container-highest hover:bg-surface-bright active:scale-95 text-xs font-mono font-semibold text-on-surface border border-outline-variant/40 transition-all cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>-{servoStep}°</span>
          </button>

          <button
            type="button"
            onClick={() => handleIncrement()}
            aria-label="Increment Servo Position"
            className="flex-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-container hover:brightness-110 active:scale-95 text-xs font-mono font-bold text-on-primary-container shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Increment (+{servoStep}°)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-5 rounded-2xl bg-surface-container/70 border border-outline-variant/30 backdrop-blur-xl flex flex-col gap-4 shadow-lg select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">Servo Position Actuator</h3>
            <span className="text-[11px] font-mono text-on-surface-variant">
              UUID: ...0003 • {bleState.isConnected ? 'Live Sync' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Live Position Readout Badge */}
        <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/40 shadow-inner">
          <span data-testid="servo-angle-readout" className="text-xl font-bold font-mono text-primary">{servoPosition}°</span>
          <span className="text-[10px] font-mono text-on-surface-variant">/ 180°</span>
        </div>
      </div>

      {/* Visual Position Gauge & Louver Angle Simulation */}
      <div className="relative p-3 rounded-xl bg-surface-container-lowest/90 border border-outline-variant/25 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
          <span>Angle: {servoPosition}° ({percentage}%)</span>
          <span>Target: {servoPosition}°</span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-primary to-secondary transition-all duration-200 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)]"
            style={{ width: `${Math.max(3, percentage)}%` }}
          />
        </div>

        {/* Interactive Slider */}
        <input
          type="range"
          min="0"
          max="180"
          step="1"
          value={servoPosition}
          onChange={(e) => handleSetPosition(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer mt-1"
          aria-label="Servo Position Slider"
        />
      </div>

      {/* Primary Increment & Decrement Action Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={() => handleDecrement()}
          aria-label="Decrement Servo Position"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-highest hover:bg-surface-bright active:scale-95 text-on-surface hover:text-primary font-mono text-sm font-semibold border border-outline-variant/40 shadow-md transition-all cursor-pointer"
        >
          <Minus className="w-4 h-4" />
          <span>Decrement (-{servoStep}°)</span>
        </button>

        {/* Prominent Increment Button */}
        <button
          type="button"
          onClick={() => handleIncrement()}
          aria-label="Increment Servo Position"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-container hover:brightness-110 active:scale-95 text-on-primary-container font-mono text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Increment (+{servoStep}°)</span>
        </button>
      </div>

      {/* Step Size Selector Array */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] font-mono text-on-surface-variant font-semibold">
          Increment Step:
        </span>
        <div className="flex items-center gap-1.5">
          {STEP_OPTIONS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setServoStep(step)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                servoStep === step
                  ? 'bg-primary text-on-primary shadow-sm font-bold'
                  : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
              }`}
            >
              +{step}°
            </button>
          ))}
        </div>
      </div>

      {/* Quick Angle Preset Buttons */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-outline-variant/20">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handleSetPosition(preset.value)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
              servoPosition === preset.value
                ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={resetServoPosition}
          title="Reset to 0°"
          aria-label="Reset Servo Position"
          className="p-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-error border border-outline-variant/20 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bluetooth Transmit Telemetry Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70 pt-1 border-t border-outline-variant/15">
        <span>GATT Characteristic: {BLE_CONFIG.SERVO_CHARACTERISTIC_UUID.slice(-4)}</span>
        <span>{lastSentTime ? `Sent at ${lastSentTime}` : 'Ready to transmit'}</span>
      </div>
    </div>
  );
}
