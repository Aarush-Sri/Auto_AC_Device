import React from 'react';
import { Power, Sliders, Bluetooth, BluetoothConnected, Loader2 } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function Header({ onOpenSettings }) {
  const {
    activeZone,
    togglePower,
    unit,
    toggleUnit,
    bleState,
    connectBle,
    disconnectBle
  } = useThermostat();

  const { power } = activeZone;

  return (
    <header className="w-full h-20 border-b border-outline-variant/30 bg-surface-container-low/70 backdrop-blur-2xl px-4 sm:px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
      {/* Brand: Name & Logo Only */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-container-high/80 border border-primary/20 flex items-center justify-center p-1.5 shadow-inner">
          <img alt="Aura Climate Logo" className="w-full h-full object-contain" src="/logo.png" />
        </div>
        <span className="text-[19px] font-bold tracking-tight text-on-surface">Aura Climate</span>
      </div>

      {/* Right Controls: BLE Pill, Temp Unit, Master Power Button, Settings Drawer Trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Bluetooth Device Link Pill */}
        <button
          type="button"
          onClick={bleState.isConnected ? disconnectBle : connectBle}
          disabled={bleState.isConnecting}
          title={
            bleState.isConnected
              ? `Connected to ${bleState.deviceName || '903-AC-V2'} • Click to Disconnect`
              : bleState.isAutoReconnecting
              ? 'Auto-reconnecting to 903-AC-V2...'
              : 'Connect to ESP32 (903-AC-V2) via Web Bluetooth'
          }
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
            bleState.isConnected
              ? 'bg-primary/15 border-primary/40 text-primary shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:bg-primary/25'
              : bleState.isConnecting || bleState.isAutoReconnecting
              ? 'bg-surface-container-high/80 border-primary/30 text-primary-fixed'
              : 'bg-surface-container-high/60 border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/30'
          }`}
        >
          {bleState.isConnecting || bleState.isAutoReconnecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : bleState.isConnected ? (
            <BluetoothConnected className="w-3.5 h-3.5 text-primary animate-pulse" />
          ) : (
            <Bluetooth className="w-3.5 h-3.5 text-on-surface-variant" />
          )}

          <span className="hidden sm:inline">
            {bleState.isAutoReconnecting
              ? 'Reconnecting...'
              : bleState.isConnecting
              ? 'Pairing 903-AC-V2...'
              : bleState.isConnected
              ? `903-AC-V2 Live`
              : 'BLE Link'}
          </span>
        </button>

        <button
          type="button"
          onClick={toggleUnit}
          title="Switch temperature unit"
          className="px-2.5 py-1.5 rounded-xl bg-surface-container-high/70 hover:bg-surface-container-highest border border-outline-variant/30 text-xs font-bold text-on-surface transition-all cursor-pointer"
        >
          °{unit}
        </button>

        <button
          type="button"
          onClick={togglePower}
          className={`group flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 rounded-full border transition-all duration-300 cursor-pointer ${
            power
              ? 'bg-surface-container-high/90 hover:bg-surface-container-highest border-primary/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
              : 'bg-surface-container-high/70 border-outline-variant/30 hover:bg-surface-container-highest'
          }`}
        >
          <div className="relative flex items-center justify-center">
            {power && (
              <span className="absolute w-3 h-3 rounded-full animate-ping opacity-75 bg-primary"></span>
            )}
            <span
              className={`relative w-3 h-3 rounded-full ${
                power
                  ? 'bg-primary shadow-[0_0_10px_#4cd7f6]'
                  : 'bg-outline shadow-none'
              }`}
            ></span>
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-on-surface uppercase">
            {power ? 'System On' : 'Standby'}
          </span>
          <Power
            className={`w-4 h-4 transition-transform group-hover:scale-110 ${
              power ? 'text-primary' : 'text-on-surface-variant'
            }`}
          />
        </button>

        <button
          type="button"
          aria-label="Settings"
          onClick={onOpenSettings}
          className="h-10 w-10 rounded-xl bg-surface-container-high/70 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all flex items-center justify-center border border-outline-variant/30 cursor-pointer"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

