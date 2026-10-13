import React, { useState } from 'react';
import { CalendarClock, Plus, Check, Clock, Sun, Moon, Briefcase, Coffee } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function SchedulesView() {
  const { unit, formatTemp } = useThermostat();

  const [schedules, setSchedules] = useState([
    {
      id: 'sched-1',
      title: 'Morning Awakening',
      time: '06:30 AM',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      setpoint: 71.0,
      mode: 'cool',
      active: true,
      icon: Coffee
    },
    {
      id: 'sched-2',
      title: 'Daytime Saver',
      time: '09:00 AM',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      setpoint: 76.0,
      mode: 'cool',
      active: true,
      icon: Briefcase
    },
    {
      id: 'sched-3',
      title: 'Evening Relax',
      time: '05:30 PM',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      setpoint: 70.0,
      mode: 'cool',
      active: true,
      icon: Sun
    },
    {
      id: 'sched-4',
      title: 'Night Cryogenic Rest',
      time: '10:30 PM',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      setpoint: 67.5,
      mode: 'cool',
      active: true,
      icon: Moon
    }
  ]);

  const toggleSchedule = (id) => {
    setSchedules(prev => prev.map(s => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
            Chronological Regulation
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Schedules & Automation</h1>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-semibold text-sm shadow-[0_0_16px_rgba(6,182,212,0.3)] hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Schedule Preset</span>
        </button>
      </div>

      {/* Schedule Preset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`p-5 rounded-2xl bg-surface-container/60 border backdrop-blur-xl flex flex-col justify-between transition-all duration-200 shadow-md ${
                s.active ? 'border-primary/30' : 'border-outline-variant/20 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      s.active
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">{s.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{s.time}</span>
                      <span>•</span>
                      <span className="uppercase text-primary font-bold">{s.mode}</span>
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => toggleSchedule(s.id)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    s.active ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-surface-dim absolute top-1 transition-transform ${
                      s.active ? 'translate-x-7 bg-on-primary' : 'translate-x-1 bg-outline'
                    }`}
                  />
                </button>
              </div>

              {/* Setpoint & Day Badges */}
              <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const isDayActive = s.days.includes(day);
                    return (
                      <span
                        key={day}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isDayActive && s.active
                            ? 'bg-surface-container-highest text-primary font-bold'
                            : 'text-outline-variant'
                        }`}
                      >
                        {day[0]}
                      </span>
                    );
                  })}
                </div>

                <span className="text-lg font-mono font-bold text-on-surface">
                  {formatTemp(s.setpoint)}°{unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
