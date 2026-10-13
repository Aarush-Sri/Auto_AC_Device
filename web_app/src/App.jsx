import React, { useState } from 'react';
import { ThermostatProvider, useThermostat } from './context/ThermostatContext';
import Header from './components/Header';
import CircularDial from './components/CircularDial';
import ModeSelector from './components/ModeSelector';
import ServoControls from './components/ServoControls';
import SettingsDrawer from './components/SettingsDrawer';

function MainThermostatConsole() {
  const { activeZone } = useThermostat();
  const { power, mode } = activeZone;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const getAmbientGlow = () => {
    if (!power) return 'bg-transparent';
    return 'bg-primary/10';
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col selection:bg-primary/30 selection:text-primary">
      {/* Aura Luxury Ambient Header */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Thermostat Viewport */}
      <main className="relative flex-1 w-full flex flex-col items-center justify-center px-4 py-8 md:py-12 overflow-hidden">
        {/* Ambient Radial Glow Backdrop */}
        <div
          className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full blur-[160px] transition-all duration-700 ${getAmbientGlow()}`}
          id="ambient-glow"
        ></div>

        <div className="relative z-10 w-full max-w-xl flex flex-col items-center gap-6">
          {/* Circular Dial with Current Temp & Setpoint */}
          <CircularDial />

          {/* Essential Mode Selector Pills */}
          <div>
            <ModeSelector />
          </div>

          {/* Servo Position Increment & Control Card */}
          <div className="w-full max-w-md">
            <ServoControls />
          </div>
        </div>
      </main>

      {/* Settings & ESP Link Drawer */}
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThermostatProvider>
      <MainThermostatConsole />
    </ThermostatProvider>
  );
}
