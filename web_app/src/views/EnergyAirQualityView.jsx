import React from 'react';
import { Zap, Wind, ShieldCheck, Activity, BatteryCharging, Gauge } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function EnergyAirQualityView() {
  const { zones } = useThermostat();

  const totalWatts = zones.reduce((acc, z) => acc + (z.power ? z.powerDraw : 0), 0);
  const avgAqi = Math.round(zones.reduce((acc, z) => acc + z.aqi, 0) / zones.length);

  // Hourly energy history
  const hourlyData = [
    { hour: '00:00', kw: 0.4 },
    { hour: '03:00', kw: 0.3 },
    { hour: '06:00', kw: 0.6 },
    { hour: '09:00', kw: 1.2 },
    { hour: '12:00', kw: 1.8 },
    { hour: '15:00', kw: 2.1 },
    { hour: '18:00', kw: 1.5 },
    { hour: '21:00', kw: 0.9 },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Header */}
      <div>
        <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
          Telemetry & Atmospheric Health
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Energy & Air Quality</h1>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Instant Power */}
        <div className="p-5 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-mono font-bold uppercase">Real-Time Grid Demand</span>
            <Zap className="w-5 h-5 text-secondary" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-light text-on-surface font-mono">
              {(totalWatts / 1000).toFixed(2)}
            </span>
            <span className="text-lg font-mono text-secondary ml-1.5">kW</span>
          </div>
          <span className="text-xs text-on-surface-variant font-mono">
            Est. ${(totalWatts * 0.00018).toFixed(2)}/hr continuous
          </span>
        </div>

        {/* Indoor Air Quality */}
        <div className="p-5 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-mono font-bold uppercase">Mean Ambient AQI</span>
            <ShieldCheck className="w-5 h-5 text-tertiary" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-light text-on-surface font-mono">{avgAqi}</span>
            <span className="text-lg font-mono text-tertiary ml-1.5">Purity Index</span>
          </div>
          <span className="text-xs text-tertiary font-mono">
            Zero volatile organic pollutants detected
          </span>
        </div>

        {/* HEPA Filter Status */}
        <div className="p-5 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-mono font-bold uppercase">HEPA Air Filter Integrity</span>
            <Wind className="w-5 h-5 text-primary" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-light text-on-surface font-mono">88%</span>
            <span className="text-xs text-on-surface-variant ml-2 font-mono">Clean</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '88%' }} />
          </div>
        </div>
      </div>

      {/* 24-Hour Energy Consumption Graph */}
      <div className="p-6 rounded-2xl bg-surface-container/60 border border-outline-variant/30 backdrop-blur-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-on-surface">24-Hour Energy Load Profile</h2>
            <span className="text-xs text-on-surface-variant font-mono">
              Compressor duty cycle & wattage telemetry
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>ESP High-Speed ADC Sampling</span>
          </div>
        </div>

        {/* Bar Chart Visualizer */}
        <div className="h-48 flex items-end justify-between gap-2 pt-8 pb-2 px-2 border-b border-outline-variant/30">
          {hourlyData.map((d, idx) => {
            const heightPercent = (d.kw / 2.5) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] font-mono text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.kw}kW
                </span>
                <div
                  className="w-full max-w-[40px] bg-gradient-to-t from-primary/30 to-primary rounded-t-lg group-hover:from-primary/50 group-hover:to-cyan-300 transition-all shadow-[0_0_12px_rgba(76,215,246,0.3)]"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[10px] font-mono text-on-surface-variant">{d.hour}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
