import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Minus, Plus, Thermometer } from 'lucide-react';
import { useThermostat } from '../context/ThermostatContext';

export default function CircularDial() {
  const { activeZone, adjustSetpoint, setSetpoint, unit, formatTemp, bleState } = useThermostat();
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const { power, setpoint, temp } = activeZone;

  // Exact SVG Dial Geometry Constants matching Stitch screen b4490e3a2a0a4be3bcd79a3f0bb2c891
  const cx = 210;
  const cy = 210;
  const r = 160;
  const startAngleDeg = 135;
  const totalSweepDeg = 270;

  // Scale ranges for Fahrenheit (60-85°F) vs Celsius (16-30°C)
  const minTemp = unit === 'C' ? 16 : 60;
  const maxTemp = unit === 'C' ? 30 : 85;

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Fraction along current scale
  const currentVal = parseFloat(formatTemp(setpoint));
  const fraction = Math.max(0, Math.min(1, (currentVal - minTemp) / (maxTemp - minTemp)));
  const currentAngleDeg = startAngleDeg + fraction * totalSweepDeg;

  const startPt = polarToCartesian(cx, cy, r, startAngleDeg);
  const endPt = polarToCartesian(cx, cy, r, currentAngleDeg);
  const largeArcFlag = fraction * totalSweepDeg > 180 ? 1 : 0;
  const activeArcPath = `M ${startPt.x.toFixed(2)} ${startPt.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${endPt.x.toFixed(2)} ${endPt.y.toFixed(2)}`;

  const handlePointer = useCallback((clientX, clientY) => {
    if (!svgRef.current || !power) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    let normalized = angleDeg;
    if (normalized < 45) normalized += 360;

    if (normalized >= 135 && normalized <= 405) {
      const frac = (normalized - 135) / 270;
      const calculatedTemp = minTemp + frac * (maxTemp - minTemp);
      const tempF = unit === 'C' ? (calculatedTemp * 9) / 5 + 32 : calculatedTemp;
      setSetpoint(Math.round(tempF * 10) / 10);
    }
  }, [power, setSetpoint, unit, minTemp, maxTemp]);

  const onMouseDown = (e) => {
    setIsDragging(true);
    handlePointer(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDragging) handlePointer(e.clientX, e.clientY);
    };
    const onMouseUp = () => setIsDragging(false);

    const onTouchMove = (e) => {
      if (isDragging && e.touches.length > 0) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handlePointer]);

  // ETA Calculation
  const tempDiff = Math.abs(setpoint - Math.round(temp));
  const estimatedMinutes = Math.max(3, Math.round(tempDiff * 3.5));

  const getGradientId = () => 'coolArcGradient';

  const getThemeColor = () => {
    if (!power) return '#869397';
    return '#4cd7f6';
  };

  return (
    <div className="flex flex-col items-center">
      {/* 1. Essential Status: Current Temp Pill */}
      <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-surface-container-high/70 backdrop-blur-xl border border-outline-variant/30 shadow-md mb-6">
        <Thermometer className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-mono">
          {bleState.isConnected ? 'ESP32 Room Temp' : 'Current Temp'}
        </span>
        <span className="text-base font-bold text-primary font-mono ml-1">
          {formatTemp(temp)}°{unit}
        </span>
      </div>

      {/* 2. Central Circular Temperature Slider Dial */}
      <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex items-center justify-center select-none">
        <svg
          ref={svgRef}
          className="w-full h-full transform cursor-pointer"
          viewBox="0 0 420 420"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <defs>
            <linearGradient id="coolArcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7"></stop>
              <stop offset="50%" stopColor="#22d3ee"></stop>
              <stop offset="100%" stopColor="#4cd7f6"></stop>
            </linearGradient>

            <filter id="thumbShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={getThemeColor()} floodOpacity="0.9"></feDropShadow>
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.6"></feDropShadow>
            </filter>
          </defs>

          {/* Dial Background Ring Track (Arc from 135deg to 405deg = 270deg sweep) */}
          <path
            d="M 96.86 323.14 A 160 160 0 1 1 323.14 323.14"
            fill="none"
            stroke="#222a3d"
            strokeLinecap="round"
            strokeWidth="12"
          ></path>

          {/* Degree Tick Marks along circumference */}
          <line stroke="#3d494c" strokeLinecap="round" strokeWidth="2.5" x1="108" x2="119" y1="312" y2="301"></line>
          <line stroke="#3d494c" strokeLinecap="round" strokeWidth="2.5" x1="56" x2="71" y1="235" y2="232"></line>
          <line stroke="#3d494c" strokeLinecap="round" strokeWidth="2.5" x1="84" x2="97" y1="122" y2="131"></line>
          <line stroke="#3d494c" strokeLinecap="round" strokeWidth="2.5" x1="184" x2="189" y1="52" y2="67"></line>
          <line stroke="#3d494c" strokeLinecap="round" strokeWidth="2.5" x1="336" x2="323" y1="122" y2="131"></line>
          <line stroke="#3d494c" strokeLinecap="round" strokeWidth="2.5" x1="301" x2="312" y1="301" y2="312"></line>

          {/* Active Temperature Progress Arc */}
          {power && (
            <path
              d={activeArcPath}
              fill="none"
              stroke={`url(#${getGradientId()})`}
              strokeLinecap="round"
              strokeWidth="14"
              className="transition-all duration-150"
            ></path>
          )}

          {/* Glowing Slider Thumb Knob Indicator */}
          {power && (
            <>
              <circle
                cx={endPt.x.toFixed(2)}
                cy={endPt.y.toFixed(2)}
                r="14"
                fill="#0b1326"
                stroke={getThemeColor()}
                strokeWidth="4.5"
                filter="url(#thumbShadow)"
                className="cursor-pointer transition-all duration-150"
              ></circle>
              <circle
                cx={endPt.x.toFixed(2)}
                cy={endPt.y.toFixed(2)}
                r="4.5"
                fill={getThemeColor()}
                className="pointer-events-none transition-all duration-150"
              ></circle>
            </>
          )}

          {/* Degree Scale Labels Around Circumference */}
          <text fill="#869397" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="13" fontWeight="600" textAnchor="middle" x="88" y="348">{unit === 'C' ? '16°' : '60°'}</text>
          <text fill="#869397" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="13" fontWeight="600" textAnchor="middle" x="35" y="240">{unit === 'C' ? '18°' : '65°'}</text>
          <text fill="#869397" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="13" fontWeight="600" textAnchor="middle" x="75" y="105">{unit === 'C' ? '21°' : '70°'}</text>
          <text fill="#869397" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="13" fontWeight="600" textAnchor="middle" x="180" y="38">{unit === 'C' ? '24°' : '75°'}</text>
          <text fill="#869397" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="13" fontWeight="600" textAnchor="middle" x="345" y="105">{unit === 'C' ? '27°' : '80°'}</text>
          <text fill="#869397" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="13" fontWeight="600" textAnchor="middle" x="332" y="348">{unit === 'C' ? '30°' : '85°'}</text>
        </svg>

        {/* Inner Circular Floating Core Card with Setpoint & Embedded Flanking Controls */}
        <div className="absolute inset-[46px] sm:inset-[58px] rounded-full bg-gradient-to-b from-surface-container-high/90 via-surface-container/95 to-surface-container-low/95 backdrop-blur-2xl border border-white/5 flex flex-col items-center justify-center p-6 shadow-[inset_0_2px_10px_rgba(255,255,255,0.08),0_20px_45px_rgba(0,0,0,0.7)]">
          {/* Target Temp Label */}
          <span className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mb-1 flex items-center gap-1.5">
            {bleState.isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" title="BLE Sync Active"></span>
            )}
            <span>Target Temperature</span>
          </span>

          {/* Central Setpoint Readout Flanked by Minus and Plus Buttons */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 my-1">
            {/* Minus Button */}
            <button
              type="button"
              aria-label="Decrease Temperature"
              disabled={!power}
              onClick={() => adjustSetpoint(-1)}
              className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-surface-container-highest/70 hover:bg-surface-bright active:scale-95 text-on-surface hover:text-primary flex items-center justify-center transition-all duration-150 border border-outline-variant/40 shadow-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-5 h-5" />
            </button>

            {/* Temperature Numeric Readout */}
            <div className="flex items-start justify-center select-none">
              <span className={`text-6xl sm:text-7xl font-extralight tracking-tight font-sans ${power ? 'text-on-surface' : 'text-outline'}`}>
                {formatTemp(setpoint)}
              </span>
              <span className="text-2xl sm:text-3xl font-light mt-1 ml-0.5" style={{ color: getThemeColor() }}>
                °{unit}
              </span>
            </div>

            {/* Plus Button */}
            <button
              type="button"
              aria-label="Increase Temperature"
              disabled={!power}
              onClick={() => adjustSetpoint(1)}
              className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-surface-container-highest/70 hover:bg-surface-bright active:scale-95 text-on-surface hover:text-primary flex items-center justify-center transition-all duration-150 border border-outline-variant/40 shadow-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Status Indicator Chip */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1 rounded-full border mt-1.5 transition-all ${
              power
                ? 'bg-primary/10 border-primary/25 text-primary'
                : 'bg-surface-container-highest/60 border-outline-variant/40 text-outline'
            }`}
          >
            {power ? (
              <>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">
                  Cooling Active
                </span>
              </>
            ) : (
              <span className="text-[11px] uppercase tracking-wider font-semibold text-outline">
                System Idle
              </span>
            )}
          </div>

          {/* Subtle Estimation Subtext */}
          <span className="text-[11px] text-on-surface-variant/80 font-normal mt-2">
            {power
              ? tempDiff === 0
                ? 'Target equilibrium reached'
                : `Reaching ${formatTemp(setpoint)}° in ~${estimatedMinutes} mins`
              : 'System in standby'}
          </span>
        </div>
      </div>
    </div>
  );
}
