import React, { useState } from 'react';
import { X, Wifi, Sliders, Cpu, Save, CheckCircle2, RefreshCw, Bluetooth, BluetoothConnected, BluetoothOff, Activity, Terminal } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';
import { BLE_CONFIG } from '../services/bleService';

export default function SettingsDrawer({ isOpen, onClose }) {
  const {
    espConfig,
    setEspConfig,
    unit,
    toggleUnit,
    activeZone,
    bleState,
    bleLogs,
    connectBle,
    disconnectBle,
    pollBleTemp,
    startBleSimulation,
    stopBleSimulation
  } = useThermostat();

  const [ipInput, setIpInput] = useState(espConfig.ip);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setEspConfig(prev => ({ ...prev, ip: ipInput, lastSync: new Date().toLocaleTimeString() }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md h-full bg-surface-container-low/95 border-l border-outline-variant/30 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Hardware & Link Settings</h2>
              <span className="text-xs text-primary font-mono">903-AC • Web Bluetooth</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Web Bluetooth (BLE) Hardware Gateway */}
          <div className="p-4 rounded-xl bg-surface-container/70 border border-outline-variant/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bluetooth className={`w-4 h-4 ${bleState.isConnected ? 'text-primary' : 'text-on-surface-variant'}`} />
                <span className="text-xs font-bold uppercase font-mono text-on-surface">ESP32 Bluetooth Link</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                bleState.isConnected
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : bleState.isConnecting
                  ? 'bg-secondary/20 border-secondary/40 text-secondary animate-pulse'
                  : 'bg-surface-container-highest border-outline-variant/30 text-on-surface-variant'
              }`}>
                {bleState.isConnected ? (bleState.deviceName || 'Connected') : bleState.isConnecting ? 'Pairing...' : 'Disconnected'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {bleState.isConnected ? (
                <>
                  <button
                    type="button"
                    onClick={pollBleTemp}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-xs font-mono text-primary border border-outline-variant/30 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Read Temp</span>
                  </button>
                  <button
                    type="button"
                    onClick={disconnectBle}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-error/20 border border-error/40 text-error hover:bg-error/30 text-xs font-mono font-bold cursor-pointer"
                  >
                    <BluetoothOff className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={connectBle}
                    disabled={bleState.isConnecting}
                    className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-bold font-mono shadow-sm hover:brightness-110 cursor-pointer"
                  >
                    <Bluetooth className="w-4 h-4" />
                    <span>{bleState.isConnecting ? 'Searching 903-AC...' : 'Connect 903-AC via BLE'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={startBleSimulation}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-xs font-mono text-secondary border border-outline-variant/30 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Simulate Live Temp Stream (Test UI)</span>
                  </button>
                </>
              )}
            </div>

            {/* Live BLE Reading Summary */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20 text-xs font-mono">
              <div className="p-2 rounded bg-surface-container-lowest">
                <span className="text-on-surface-variant block text-[10px] uppercase">Live BLE Reading</span>
                <span className="text-primary font-bold text-base">
                  {bleState.lastReading !== null ? `${bleState.lastReading}°${unit}` : '—'}
                </span>
              </div>
              <div className="p-2 rounded bg-surface-container-lowest">
                <span className="text-on-surface-variant block text-[10px] uppercase">Raw Buffer</span>
                <span className="text-on-surface font-semibold text-[11px] truncate block">
                  {bleState.rawHex ? `[${bleState.rawHex}]` : 'Waiting'}
                </span>
              </div>
            </div>

            {/* BLE Event Log Console */}
            <div className="p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] font-mono text-on-surface-variant font-bold uppercase">
                <Terminal className="w-3 h-3 text-primary" />
                <span>Telemetry Event Log</span>
              </div>
              <div className="max-h-24 overflow-y-auto font-mono text-[10px] flex flex-col gap-0.5">
                {bleLogs.length === 0 ? (
                  <span className="text-outline italic py-0.5">No BLE activity recorded yet.</span>
                ) : (
                  bleLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="truncate">
                      <span className="text-outline">[{log.timestamp}]</span>{' '}
                      <span className={log.type === 'error' ? 'text-error' : log.type === 'data' ? 'text-primary' : 'text-on-surface-variant'}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 2. ESP Wi-Fi Endpoint Config */}
          <form onSubmit={handleSave} className="p-4 rounded-xl bg-surface-container/70 border border-outline-variant/30 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-surface-variant text-xs font-bold uppercase font-mono">
              <Wifi className="w-4 h-4 text-primary" />
              <span>ESP32 Wi-Fi Target IP</span>
            </div>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.1.145"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-sm font-mono text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface text-xs font-bold border border-outline-variant/30 cursor-pointer"
            >
              {saved ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Address Updated' : 'Save Wi-Fi IP'}</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-outline-variant/30 text-center text-xs text-on-surface-variant font-mono">
          <span>Target Service: {BLE_CONFIG.SERVICE_UUID}</span>
        </div>
      </div>
    </div>
  );
}

