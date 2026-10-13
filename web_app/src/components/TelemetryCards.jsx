import React from 'react';
import { Thermometer, Zap, ShieldCheck } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function TelemetryCards() {
  const { activeZone, formatTemp, unit } = useThermostat();
  const { temp, power, powerDraw, aqi } = activeZone;

  const getAqiStatus = (val) => {
    if (val < 30) return { text: 'Optimal (Pure)', color: 'text-tertiary', bg: 'bg-tertiary/10 border-tertiary/30' };
    if (val < 50) return { text: 'Moderate', color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/30' };
    return { text: 'Caution', color: 'text-error', bg: 'bg-error/10 border-error/30' };
  };

  const aqiInfo = getAqiStatus(aqi);

  return (
    <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. Ambient Temp */}
      <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="text-[10px] font-bold uppercase tracking-wider">Room Ambient</span>
          <Thermometer className="w-4 h-4 text-primary" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-light text-on-surface tracking-tight font-mono">
            {formatTemp(temp)}°{unit}
          </span>
          <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5">
            Internal Sensor
          </span>
        </div>
      </div>

      {/* 2. Real-time Power Load */}
      <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="text-[10px] font-bold uppercase tracking-wider">Power Draw</span>
          <Zap className="w-4 h-4 text-secondary" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-light text-on-surface tracking-tight font-mono">
            {power ? powerDraw : 0} W
          </span>
          <span className="block text-[10px] text-secondary font-medium mt-0.5">
            {power ? 'Compressor Active' : 'Standby Low'}
          </span>
        </div>
      </div>

      {/* 3. Air Quality Index */}
      <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="text-[10px] font-bold uppercase tracking-wider">Air Quality</span>
          <ShieldCheck className={`w-4 h-4 ${aqiInfo.color}`} />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-light text-on-surface tracking-tight font-mono">
            {aqi} AQI
          </span>
          <span className={`block text-[10px] font-medium mt-0.5 ${aqiInfo.color}`}>
            {aqiInfo.text}
          </span>
        </div>
      </div>
    </div>
  );
}
