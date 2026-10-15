import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { bleService, BLE_CONFIG } from '../services/bleService';

const ThermostatContext = createContext();

const INITIAL_ZONES = [
  {
    id: 'living-room',
    name: 'Living Room',
    subtitle: 'Penthouse Suite',
    temp: 74.2,
    setpoint: 70.0,
    humidity: 45,
    power: true,
    mode: 'cool',
    fanSpeed: 'auto',
    aqi: 22,
    powerDraw: 820
  },
  {
    id: 'master-suite',
    name: 'Master Suite',
    subtitle: 'North Wing',
    temp: 72.0,
    setpoint: 68.5,
    humidity: 42,
    power: true,
    mode: 'cool',
    fanSpeed: 'low',
    aqi: 18,
    powerDraw: 540
  },
  {
    id: 'studio-office',
    name: 'Studio Office',
    subtitle: 'East Balcony',
    temp: 75.8,
    setpoint: 72.0,
    humidity: 48,
    power: true,
    mode: 'cool',
    fanSpeed: 'med',
    aqi: 28,
    powerDraw: 390
  },
  {
    id: 'guest-bedroom',
    name: 'Guest Bedroom',
    subtitle: 'South Wing',
    temp: 77.0,
    setpoint: 74.0,
    humidity: 50,
    power: false,
    mode: 'cool',
    fanSpeed: 'auto',
    aqi: 20,
    powerDraw: 0
  }
];

export function ThermostatProvider({ children }) {
  const [zones, setZones] = useState(() => {
    try {
      return INITIAL_ZONES.map(z => {
        const storedSp = localStorage.getItem(`aura_setpoint_${z.id}`);
        const storedPower = localStorage.getItem(`aura_power_${z.id}`);
        return {
          ...z,
          setpoint: storedSp !== null ? Math.min(85, Math.max(60, parseFloat(storedSp))) : z.setpoint,
          power: storedPower !== null ? storedPower === 'true' : z.power,
        };
      });
    } catch {
      return INITIAL_ZONES;
    }
  });
  const [activeZoneId, setActiveZoneId] = useState('living-room');
  const [unit, setUnit] = useState('F'); // 'F' or 'C'
  const [activeNav, setActiveNav] = useState('climate-control'); // 'climate-control' | 'multi-zone' | 'schedules' | 'energy-air' | 'device-settings'
  
  const [espConfig, setEspConfig] = useState({
    ip: '192.168.1.145',
    connected: true,
    rssi: -58,
    firmwareVersion: 'v2.4.1-Atmosphere',
    lastSync: new Date().toLocaleTimeString()
  });

  // Bluetooth State
  const [autoConnect, setAutoConnectState] = useState(() => {
    try {
      const stored = localStorage.getItem('aura_ble_autoconnect');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [bleState, setBleState] = useState({
    isSupported: bleService.isSupported(),
    isGetDevicesSupported: bleService.isGetDevicesSupported(),
    isConnected: false,
    isConnecting: false,
    isAutoReconnecting: false,
    autoConnectEnabled: true,
    deviceName: null,
    error: null,
    lastReading: null,
    rawHex: '',
    lastSync: null,
    pollingInterval: 2000
  });

  const [bleLogs, setBleLogs] = useState([]);


  const addBleLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setBleLogs(prev => [{ id: Date.now() + Math.random(), timestamp, message, type }, ...prev.slice(0, 49)]);
  }, []);

  const setAutoConnect = useCallback((enabled) => {
    setAutoConnectState(enabled);
    bleService.setAutoReconnect(enabled);
    try {
      localStorage.setItem('aura_ble_autoconnect', String(enabled));
    } catch {
      // ignore
    }
    setBleState(prev => ({ ...prev, autoConnectEnabled: enabled }));
    addBleLog(`Auto BLE connect ${enabled ? 'enabled' : 'disabled'}`, 'info');
  }, [addBleLog]);

  // Subscribe to BLE events
  useEffect(() => {
    bleService.setAutoReconnect(autoConnect);

    const unsubStatus = bleService.onStatusChange((status) => {
      setBleState(prev => ({
        ...prev,
        isConnected: !!status.connected,
        isConnecting: !!status.connecting,
        isAutoReconnecting: !!status.isAutoReconnecting,
        deviceName: status.deviceName || (status.connected ? BLE_CONFIG.DEVICE_NAME : null),
        error: status.error || null,
        lastSync: status.connected ? new Date().toLocaleTimeString() : prev.lastSync
      }));

      if (status.connected) {
        addBleLog(`Connected to BLE device: ${status.deviceName || BLE_CONFIG.DEVICE_NAME}`, 'success');
        setTimeout(() => {
          const currentZone = zones.find(z => z.id === activeZoneId) || zones[0];
          if (currentZone) {
            sendSetpointToBle(currentZone.setpoint);
          }
        }, 400);
      } else if (status.error) {
        addBleLog(`BLE Notice: ${status.error}`, status.isAutoReconnecting ? 'warn' : 'error');
      } else if (!status.connecting && !status.connected) {
        addBleLog('BLE Disconnected', 'warn');
      }
    });

    const unsubTemp = bleService.onTemperatureChange((incomingTemp, rawHex) => {
      // If incoming temperature is <= 50 (typical Celsius sensor e.g. 24.5°C), convert to internal Fahrenheit
      let tempF = incomingTemp;
      if (incomingTemp <= 50) {
        tempF = ((incomingTemp * 9) / 5) + 32;
      }
      tempF = Math.round(tempF * 10) / 10;

      // Update current ambient/room temp ONLY — do NOT overwrite the user's chosen target setpoint!
      setZones(prev => prev.map(z => {
        if (z.id === activeZoneId) {
          return {
            ...z,
            temp: tempF
          };
        }
        return z;
      }));

      setBleState(prev => ({
        ...prev,
        lastReading: incomingTemp,
        rawHex,
        lastSync: new Date().toLocaleTimeString()
      }));

      addBleLog(`Room Temp Received: ${incomingTemp}° (${rawHex || 'binary'}) -> Ambient: ${tempF}°F`, 'data');
    });

    return () => {
      unsubStatus();
      unsubTemp();
    };
  }, [activeZoneId, unit, addBleLog]);

  // Transmit user-chosen target setpoint to BLE Characteristic UUID ...0002
  const sendSetpointToBle = useCallback(async (targetF) => {
    if (!bleService.isConnected && !bleService.isSimulating) return;

    const valToSend = unit === 'C'
      ? Math.round((((targetF - 32) * 5) / 9) * 10) / 10
      : targetF;

    try {
      const res = await bleService.writeSetpoint(valToSend);
      if (res?.success) {
        addBleLog(`Sent Setpoint: ${valToSend}°${unit} to UUID ...0002 [${res.hex}]`, 'success');
      }
    } catch (err) {
      console.warn('[BLE] Failed to send setpoint:', err);
      addBleLog(`Failed to send setpoint ${valToSend}°: ${err.message}`, 'error');
    }
  }, [unit, addBleLog]);

  // Transmit on/off power command to BLE Characteristic UUID ...0003
  const sendPowerToBle = useCallback(async (isPowerOn) => {
    if (!bleService.isConnected && !bleService.isSimulating) return;
    const command = isPowerOn ? 'on' : 'off';
    try {
      const res = await bleService.writeServo(command);
      if (res?.success) {
        addBleLog(`Sent Power: "${command}" to UUID ...0003`, 'success');
      }
    } catch (err) {
      console.warn('[BLE] Failed to send power command:', err);
      addBleLog(`Failed to send power command "${command}": ${err.message}`, 'error');
    }
  }, [addBleLog]);

  // Attempt auto-connect to permitted 903-AC-V2 device on initial mount
  useEffect(() => {
    if (autoConnect && bleService.isSupported()) {
      const timer = setTimeout(() => {
        if (!bleService.isGetDevicesSupported()) {
          console.info(
            '[BLE] For automatic zero-click reconnect across closed tabs, enable chrome://flags/#enable-web-bluetooth-new-permissions-backend'
          );
          return;
        }

        bleService.tryAutoConnect().then((connected) => {
          if (connected) {
            addBleLog(`Auto-connected to ${BLE_CONFIG.DEVICE_NAME} successfully`, 'success');
          }
        }).catch((err) => {
          console.warn('[BLE] Initial auto-connect failed:', err);
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [autoConnect, addBleLog]);

  const connectBle = async () => {
    try {
      addBleLog(`Requesting Web Bluetooth device "${BLE_CONFIG.DEVICE_NAME}"...`, 'info');
      await bleService.connect();
    } catch (err) {
      console.warn('Bluetooth connect failed:', err);
      addBleLog(`Connection failed: ${err.message}`, 'error');
    }
  };

  const disconnectBle = () => {
    bleService.disconnect();
    addBleLog('User disconnected Bluetooth', 'info');
  };

  const pollBleTemp = async () => {
    if (bleService.isConnected) {
      await bleService.readTemperature();
    }
  };

  const startBleSimulation = () => {
    addBleLog('Starting simulated 903-AC BLE stream (72.5°F)...', 'info');
    bleService.startSimulation(72.5);
  };

  const stopBleSimulation = () => {
    bleService.stopSimulation();
    bleService.disconnect();
    addBleLog('Simulation stopped', 'warn');
  };

  const setBlePollingInterval = (ms) => {
    setBleState(prev => ({ ...prev, pollingInterval: ms }));
    if (bleService.isConnected) {
      bleService.startPolling(ms);
    }
  };

  const activeZone = zones.find(z => z.id === activeZoneId) || zones[0];

  // Helper to convert F to C or display according to unit
  const formatTemp = (tempF) => {
    if (unit === 'C') {
      const c = ((tempF - 32) * 5) / 9;
      return c.toFixed(1);
    }
    return tempF.toFixed(tempF % 1 === 0 ? 0 : 1);
  };

  const getMinTemp = () => (unit === 'C' ? 16 : 60);
  const getMaxTemp = () => (unit === 'C' ? 30 : 85);

  const togglePower = () => {
    let nextPower = !activeZone.power;
    setZones(prev => prev.map(z => {
      if (z.id === activeZoneId) {
        nextPower = !z.power;
        try {
          localStorage.setItem(`aura_power_${z.id}`, String(nextPower));
        } catch {}
        return { ...z, power: nextPower };
      }
      return z;
    }));
    sendPowerToBle(nextPower);
  };

  const setMode = (newMode) => {
    setZones(prev => prev.map(z => {
      if (z.id === activeZoneId) {
        return { ...z, mode: newMode };
      }
      return z;
    }));
  };

  const setFanSpeed = (speed) => {
    setZones(prev => prev.map(z => {
      if (z.id === activeZoneId) {
        return { ...z, fanSpeed: speed };
      }
      return z;
    }));
  };

  const adjustSetpoint = (delta) => {
    if (!activeZone.power) return;
    const step = unit === 'C' ? delta * 1.8 : delta;
    const currentF = activeZone.setpoint;
    const minF = 60;
    const maxF = 85;
    const newSetpointF = Math.min(maxF, Math.max(minF, Math.round((currentF + step) * 10) / 10));

    try {
      localStorage.setItem(`aura_setpoint_${activeZoneId}`, String(newSetpointF));
      localStorage.setItem('aura_last_setpoint', String(newSetpointF));
    } catch {}

    setZones(prev => prev.map(z => {
      if (z.id === activeZoneId) {
        return { ...z, setpoint: newSetpointF };
      }
      return z;
    }));

    sendSetpointToBle(newSetpointF);
  };

  const setSetpoint = (newVal) => {
    if (!activeZone.power) return;
    const clamped = Math.min(85, Math.max(60, newVal));
    const rounded = Math.round(clamped * 10) / 10;

    try {
      localStorage.setItem(`aura_setpoint_${activeZoneId}`, String(rounded));
      localStorage.setItem('aura_last_setpoint', String(rounded));
    } catch {}

    setZones(prev => prev.map(z => {
      if (z.id === activeZoneId) {
        return { ...z, setpoint: rounded };
      }
      return z;
    }));

    sendSetpointToBle(rounded);
  };

  const toggleUnit = () => {
    setUnit(prev => (prev === 'F' ? 'C' : 'F'));
  };

  const updateZone = (zoneId, updates) => {
    setZones(prev => prev.map(z => (z.id === zoneId ? { ...z, ...updates } : z)));
  };

  return (
    <ThermostatContext.Provider
      value={{
        zones,
        activeZoneId,
        activeZone,
        setActiveZoneId,
        activeNav,
        setActiveNav,
        unit,
        formatTemp,
        getMinTemp,
        getMaxTemp,
        togglePower,
        setMode,
        setFanSpeed,
        adjustSetpoint,
        setSetpoint,
        toggleUnit,
        updateZone,
        espConfig,
        setEspConfig,
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
        sendPowerToBle
      }}
    >
      {children}
    </ThermostatContext.Provider>
  );
}

export function useThermostat() {
  const context = useContext(ThermostatContext);
  if (!context) {
    throw new Error('useThermostat must be used within a ThermostatProvider');
  }
  return context;
}

