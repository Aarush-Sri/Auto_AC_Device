import React from 'react';
import { Thermometer, LayoutGrid, CalendarClock, Wind, Sliders, Activity } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function Sidebar() {
  const { activeNav, setActiveNav, zones } = useThermostat();

  const activeZonesCount = zones.filter(z => z.power).length;
  const totalPowerDraw = zones.reduce((sum, z) => sum + (z.power ? z.powerDraw : 0), 0) / 1000;

  const NAV_ITEMS = [
    { id: 'climate-control', label: 'Climate Control', icon: Thermometer },
    { id: 'multi-zone', label: 'Multi-Zone', icon: LayoutGrid },
    { id: 'schedules', label: 'Schedules & Automation', icon: CalendarClock },
    { id: 'energy-air', label: 'Energy & Air Quality', icon: Wind },
    { id: 'device-settings', label: 'Device Settings', icon: Sliders },
  ];

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 xl:w-72 bg-surface-container-low/90 backdrop-blur-2xl z-50 flex-col justify-between py-6 px-4 border-r border-outline-variant/30">
        <div className="flex flex-col gap-6">
          {/* Brand header */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high/90 border border-primary/30 flex items-center justify-center p-1.5 shadow-md">
              <img src="/logo.svg" alt="Aura Climate Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-on-surface">Aura Climate</span>
              <span className="text-[10px] text-primary font-bold tracking-widest uppercase">
                Precision Ambient
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container shadow-[0_0_20px_-2px_rgba(6,182,212,0.35)]'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-on-primary-container' : 'text-primary'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Stage Info Card */}
        <div className="p-4 rounded-xl bg-surface-container/70 border border-outline-variant/30 backdrop-blur-md flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              System Stage
            </span>
            <span className="flex items-center gap-1 text-[10px] text-primary font-mono font-semibold">
              <Activity className="w-3 h-3 animate-pulse" /> Live
            </span>
          </div>
          <span className="text-xs font-semibold text-on-surface">Adaptive Equilibrium</span>
          <span className="text-[11px] text-on-surface-variant font-mono">
            {activeZonesCount} Active Zones • {totalPowerDraw.toFixed(2)} kW
          </span>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-low/95 backdrop-blur-2xl border-t border-outline-variant/30 z-50 flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight mt-0.5">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
