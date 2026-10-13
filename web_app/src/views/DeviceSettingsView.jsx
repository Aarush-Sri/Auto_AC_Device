import React, { useState } from 'react';
import { Wifi, Cpu, Sliders, CheckCircle2, RefreshCw, Save, Server, Shield, Bluetooth, BluetoothConnected, BluetoothOff, Activity, Terminal, Radio, Send, Compass } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';
import { BLE_CONFIG } from '../services/bleService';
import ServoControls from '../components/ServoControls';

export default function DeviceSettingsView() {
  const {
    espConfig,
    setEspConfig,
    unit,
    toggleUnit,
    bleState,
    bleLogs,
    autoConnect,
    setAutoConnect,
    connectBle,
    disconnectBle,
    pollBleTemp,
    setBlePollingInterval,
    startBleSimulation,
    stopBleSimulation,
    sendSetpointToBle,
    activeZone,
    formatTemp,
    servoPosition,
    incrementServoPosition,
    decrementServoPosition
  } = useThermostat();

  const [ipInput, setIpInput] = useState(espConfig.ip);
  const [tempOffset, setTempOffset] = useState(0.0);
  const [deadband, setDeadband] = useState(0.5);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setEspConfig(prev => ({ ...prev, ip: ipInput, lastSync: new Date().toLocaleTimeString() }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePing = () => {
    setIsPinging(true);
    setTimeout(() => {
      setIsPinging(false);
    }, 600);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Header */}
      <div>
        <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
          Hardware & Telemetry Link
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">ESP Device Settings</h1>
      </div>

      {/* 1. Web Bluetooth (BLE) Gateway Control */}
      <div className="p-6 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col gap-5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              bleState.isConnected
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-surface-container-highest border-outline-variant/30 text-on-surface-variant'
            }`}>
              {bleState.isConnected ? (
                <BluetoothConnected className="w-5 h-5 text-primary" />
              ) : (
                <Bluetooth className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-on-surface">Web Bluetooth Gateway</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                  bleState.isConnected
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : bleState.isAutoReconnecting
                    ? 'bg-primary/20 border-primary/40 text-primary animate-pulse'
                    : bleState.isConnecting
                    ? 'bg-secondary/20 border-secondary/40 text-secondary animate-pulse'
                    : 'bg-surface-container-highest border-outline-variant/30 text-on-surface-variant'
                }`}>
                  {bleState.isConnected
                    ? (bleState.deviceName || '903-AC-V2 Connected')
                    : bleState.isAutoReconnecting
                    ? 'Auto-Reconnecting...'
                    : bleState.isConnecting
                    ? 'Pairing...'
                    : 'Disconnected'}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant font-mono">
                Direct browser-to-ESP32 link for live temperature streaming (903-AC-V2)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {bleState.isConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => sendSetpointToBle(activeZone.setpoint)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-xs font-mono text-secondary border border-secondary/30 cursor-pointer"
                  title="Send target temperature to UUID ...0002"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Setpoint ({formatTemp(activeZone.setpoint)}°)</span>
                </button>
                <button
                  type="button"
                  onClick={() => incrementServoPosition()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-xs font-mono text-primary border border-primary/30 cursor-pointer"
                  title="Increment servo actuator on UUID ...0003"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Increment Servo (+10°)</span>
                </button>
                <button
                  type="button"
                  onClick={pollBleTemp}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-highest hover:bg-surface-bright text-xs font-mono text-primary border border-outline-variant/30 cursor-pointer"
                  title="Trigger manual read from ESP32 characteristic"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Read Sensor</span>
                </button>
                <button
                  type="button"
                  onClick={disconnectBle}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-error/20 border border-error/40 text-error hover:bg-error/30 text-xs font-bold font-mono transition-all cursor-pointer"
                >
                  <BluetoothOff className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startBleSimulation}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-highest hover:bg-surface-bright text-xs font-mono text-on-surface-variant border border-outline-variant/30 cursor-pointer"
                  title="Test dashboard UI with simulated temperature stream"
                >
                  <Activity className="w-3.5 h-3.5 text-secondary" />
                  <span>Test Stream</span>
                </button>
                <button
                  type="button"
                  onClick={connectBle}
                  disabled={bleState.isConnecting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer bg-primary-container text-on-primary-container shadow-[0_0_16px_rgba(6,182,212,0.3)] hover:brightness-110"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>{bleState.isConnecting ? 'Pairing 903-AC-V2...' : 'Connect 903-AC-V2'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Auto-Connect Toggle & Settings Banner */}
        <div className="p-3.5 rounded-xl bg-surface-container-lowest/90 border border-outline-variant/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-primary" />
            <div>
              <span className="text-xs font-bold text-on-surface block font-mono">Auto BLE Connect & Reconnect</span>
              <span className="text-[11px] text-on-surface-variant font-mono">
                Automatically connects to "903-AC-V2" on page load and reconnects if connection drops
              </span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Device UUID Details & Live Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-outline-variant/20">
          <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
              GATT Service UUID
            </span>
            <span className="text-xs font-mono text-on-surface break-all font-semibold">
              {BLE_CONFIG.SERVICE_UUID}
            </span>
            <span className="text-[10px] text-primary block font-mono mt-0.5">Target: 903-AC-V2</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
              Temp Sensor UUID (In)
            </span>
            <span className="text-xs font-mono text-on-surface break-all font-semibold">
              {BLE_CONFIG.TEMP_CHARACTERISTIC_UUID}
            </span>
            <span className="text-[10px] text-tertiary block font-mono mt-0.5">Read & Notify</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
              Setpoint UUID (Out)
            </span>
            <span className="text-xs font-mono text-on-surface break-all font-semibold">
              {BLE_CONFIG.SETPOINT_CHARACTERISTIC_UUID}
            </span>
            <span className="text-[10px] text-secondary block font-mono mt-0.5">Write / Transmit</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
              Servo Actuator UUID (Out)
            </span>
            <span className="text-xs font-mono text-on-surface break-all font-semibold">
              {BLE_CONFIG.SERVO_CHARACTERISTIC_UUID}
            </span>
            <span className="text-[10px] text-primary block font-mono mt-0.5">Pos: {servoPosition}°</span>
          </div>
        </div>

        {/* Polling Rate Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Radio className="w-3.5 h-3.5 text-primary" />
            <span>Fallback Polling Interval:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1000, 2000, 5000].map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => setBlePollingInterval(interval)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  bleState.pollingInterval === interval
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-highest/80 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {interval / 1000}s
              </button>
            ))}
          </div>
        </div>

        {/* Bluetooth Activity Log Console */}
        <div className="p-3 rounded-xl bg-surface-container-lowest/90 border border-outline-variant/30 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold uppercase tracking-wider">BLE Telemetry Stream</span>
            </div>
            <span>{bleLogs.length} events logged</span>
          </div>
          <div className="max-h-28 overflow-y-auto font-mono text-[11px] flex flex-col gap-1 pr-1">
            {bleLogs.length === 0 ? (
              <span className="text-on-surface-variant/60 italic py-1">
                No Bluetooth packets recorded yet. Click "Connect 903-AC" to initiate pairing.
              </span>
            ) : (
              bleLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-2">
                  <span className="text-outline text-[10px]">[{log.timestamp}]</span>
                  <span className={
                    log.type === 'success'
                      ? 'text-tertiary font-semibold'
                      : log.type === 'error'
                      ? 'text-error font-semibold'
                      : log.type === 'data'
                      ? 'text-primary'
                      : 'text-on-surface-variant'
                  }>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Servo Actuator Increment & Control Card */}
      <ServoControls />

      {/* 3. ESP Server Link Form (Wi-Fi / REST Fallback) */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col gap-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-on-surface">ESP32 Server Endpoint (Wi-Fi / REST)</h2>
              <span className="text-xs text-on-surface-variant font-mono">
                Target IP address for REST / WebSocket controls
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-highest/80 hover:bg-surface-bright text-xs font-mono text-primary border border-outline-variant/30 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
              <span>Ping Test</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1.5 font-bold">
              Server Host / IP
            </label>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.1.145 or esp32-ac.local"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/40 text-sm font-mono text-on-surface focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1.5 font-bold">
              Thermostat Scale
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleUnit}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-highest border border-outline-variant/30 text-xs font-bold text-on-surface hover:border-primary/40 transition-all cursor-pointer"
              >
                Active: Fahrenheit (°{unit}) — Click to Toggle
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
          <span className="text-xs text-on-surface-variant font-mono">
            Last Synchronized: {espConfig.lastSync}
          </span>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-semibold text-sm shadow-[0_0_16px_rgba(6,182,212,0.3)] hover:brightness-110 transition-all cursor-pointer"
          >
            {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Configuration Saved' : 'Save Endpoint'}</span>
          </button>
        </div>
      </form>

      {/* 3. Microcontroller Hardware Status */}
      <div className="p-6 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-secondary" />
          <div>
            <h2 className="text-base font-bold text-on-surface">ESP32 Hardware Telemetry</h2>
            <span className="text-xs text-on-surface-variant font-mono">
              On-board silicon diagnostics
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
              Wi-Fi RSSI
            </span>
            <span className="text-lg font-mono font-bold text-primary">{espConfig.rssi} dBm</span>
            <span className="text-[10px] text-tertiary block font-mono">Strong Signal</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
              Free SRAM Heap
            </span>
            <span className="text-lg font-mono font-bold text-on-surface">192.4 KB</span>
            <span className="text-[10px] text-on-surface-variant block font-mono">68% Available</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
              Firmware Build
            </span>
            <span className="text-lg font-mono font-bold text-on-surface">v2.4.1</span>
            <span className="text-[10px] text-primary block font-mono">Atmosphere OS</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
              System Uptime
            </span>
            <span className="text-lg font-mono font-bold text-on-surface">14d 6h</span>
            <span className="text-[10px] text-tertiary block font-mono">No Watchdog Faults</span>
          </div>
        </div>
      </div>

      {/* 4. Sensor Deadband & Calibration */}
      <div className="p-6 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Sliders className="w-5 h-5 text-tertiary" />
          <div>
            <h2 className="text-base font-bold text-on-surface">Thermal Deadband & Offsets</h2>
            <span className="text-xs text-on-surface-variant font-mono">
              Hysteresis threshold calibration to prevent compressor cycling
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-on-surface-variant">Compressor Hysteresis (Deadband)</span>
              <span className="text-primary font-bold">±{deadband}°{unit}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={deadband}
              onChange={(e) => setDeadband(parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-on-surface-variant">NTC / DHT Sensor Calibration Offset</span>
              <span className="text-secondary font-bold">{tempOffset > 0 ? `+${tempOffset}` : tempOffset}°{unit}</span>
            </div>
            <input
              type="range"
              min="-3.0"
              max="3.0"
              step="0.1"
              value={tempOffset}
              onChange={(e) => setTempOffset(parseFloat(e.target.value))}
              className="w-full accent-secondary cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

