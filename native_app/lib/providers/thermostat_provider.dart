import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/climate_zone.dart';
import '../models/ble_log_entry.dart';
import '../services/ble_service.dart';

class ThermostatProvider extends ChangeNotifier {
  final BleService _bleService = BleService.instance;

  StreamSubscription? _statusSub;
  StreamSubscription? _tempSub;

  List<ClimateZone> _zones = [
    const ClimateZone(
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
      powerDraw: 820,
    ),
    const ClimateZone(
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
      powerDraw: 540,
    ),
    const ClimateZone(
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
      powerDraw: 390,
    ),
    const ClimateZone(
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
      powerDraw: 0,
    ),
  ];

  String _activeZoneId = 'living-room';
  String _unit = 'F'; // 'F' or 'C'
  double _servoPosition = 0; // 0 to 180
  int _servoStep = 10;
  bool _autoConnect = true;

  BleStatus _bleStatus = const BleStatus();
  final List<BleLogEntry> _bleLogs = [];

  ThermostatProvider() {
    _initProvider();
  }

  // Getters
  List<ClimateZone> get zones => _zones;
  String get activeZoneId => _activeZoneId;
  ClimateZone get activeZone =>
      _zones.firstWhere((z) => z.id == _activeZoneId, orElse: () => _zones.first);
  String get unit => _unit;
  double get servoPosition => _servoPosition;
  int get servoStep => _servoStep;
  bool get autoConnect => _autoConnect;
  BleStatus get bleStatus => _bleStatus;
  List<BleLogEntry> get bleLogs => List.unmodifiable(_bleLogs);

  Future<void> _initProvider() async {
    _bleService.init();

    // Load persisted settings
    try {
      final prefs = await SharedPreferences.getInstance();
      _servoPosition = prefs.getDouble('aura_servo_pos') ?? 0.0;
      _autoConnect = prefs.getBool('aura_autoconnect') ?? true;
      _unit = prefs.getString('aura_unit') ?? 'F';
      _bleService.setAutoReconnectEnabled(_autoConnect);
    } catch (_) {}

    // Listen to BLE Status
    _statusSub = _bleService.statusStream.listen((status) {
      _bleStatus = status;
      if (status.isConnected) {
        addLog('Connected to ${status.deviceName}', BleLogType.success);
        // Sync active setpoint on connection
        _syncSetpointToBle(activeZone.setpoint);
      } else if (status.error != null) {
        addLog(status.error!, status.isAutoReconnecting ? BleLogType.warn : BleLogType.error);
      }
      notifyListeners();
    });

    // Listen to Ambient Temperature stream
    _tempSub = _bleService.tempStream.listen((incomingTemp) {
      // If incoming value is <= 50 (typical Celsius), convert to internal Fahrenheit
      double tempF = incomingTemp;
      if (incomingTemp <= 50) {
        tempF = ((incomingTemp * 9) / 5) + 32;
      }
      tempF = (tempF * 10).roundToDouble() / 10;

      // Update ambient room temp of active zone (do NOT change user's target setpoint)
      _zones = _zones.map((z) {
        if (z.id == _activeZoneId) {
          return z.copyWith(temp: tempF);
        }
        return z;
      }).toList();

      addLog('Room Temp: $incomingTemp° -> $tempF°F', BleLogType.data);
      notifyListeners();
    });

    if (_autoConnect) {
      Future.delayed(const Duration(milliseconds: 600), () {
        connectBle();
      });
    }
  }

  void addLog(String message, BleLogType type) {
    final timeStr = DateFormat('HH:mm:ss').format(DateTime.now());
    final entry = BleLogEntry(
      id: '${DateTime.now().millisecondsSinceEpoch}_${_bleLogs.length}',
      timestamp: timeStr,
      message: message,
      type: type,
    );
    _bleLogs.insert(0, entry);
    if (_bleLogs.length > 50) {
      _bleLogs.removeLast();
    }
    notifyListeners();
  }

  void setActiveZone(String id) {
    _activeZoneId = id;
    notifyListeners();
  }

  void togglePower() {
    final nextPower = !activeZone.power;
    _zones = _zones.map((z) {
      if (z.id == _activeZoneId) {
        return z.copyWith(power: nextPower);
      }
      return z;
    }).toList();

    _bleService.writeServo(nextPower ? 'on' : 'off');
    addLog('System Power: ${nextPower ? "ON" : "STANDBY"}', BleLogType.info);
    notifyListeners();
  }

  void setMode(String newMode) {
    _zones = _zones.map((z) {
      if (z.id == _activeZoneId) {
        return z.copyWith(mode: newMode);
      }
      return z;
    }).toList();
    addLog('Climate Mode: ${newMode.toUpperCase()}', BleLogType.info);
    notifyListeners();
  }

  void setFanSpeed(String speed) {
    _zones = _zones.map((z) {
      if (z.id == _activeZoneId) {
        return z.copyWith(fanSpeed: speed);
      }
      return z;
    }).toList();
    notifyListeners();
  }

  void adjustSetpoint(double delta) {
    if (!activeZone.power) return;
    final step = _unit == 'C' ? delta * 1.8 : delta;
    final newF = (activeZone.setpoint + step).clamp(60.0, 85.0);
    final rounded = (newF * 10).roundToDouble() / 10;

    _zones = _zones.map((z) {
      if (z.id == _activeZoneId) {
        return z.copyWith(setpoint: rounded);
      }
      return z;
    }).toList();

    _syncSetpointToBle(rounded);
    notifyListeners();
  }

  void setSetpoint(double newF) {
    if (!activeZone.power) return;
    final clamped = newF.clamp(60.0, 85.0);
    final rounded = (clamped * 10).roundToDouble() / 10;

    _zones = _zones.map((z) {
      if (z.id == _activeZoneId) {
        return z.copyWith(setpoint: rounded);
      }
      return z;
    }).toList();

    _syncSetpointToBle(rounded);
    notifyListeners();
  }

  void _syncSetpointToBle(double targetF) {
    final valToSend = _unit == 'C'
        ? (((targetF - 32) * 5) / 9 * 10).roundToDouble() / 10
        : targetF;
    _bleService.writeSetpoint(valToSend);
    addLog('Transmitted Setpoint: $valToSend°$_unit', BleLogType.success);
  }

  void toggleUnit() {
    _unit = _unit == 'F' ? 'C' : 'F';
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('aura_unit', _unit);
    });
    notifyListeners();
  }

  String formatTemperature(double tempF) {
    if (_unit == 'C') {
      final c = ((tempF - 32) * 5) / 9;
      return c.toStringAsFixed(1);
    }
    return tempF.toStringAsFixed(tempF % 1 == 0 ? 0 : 1);
  }

  // Servo Controls
  void setServoPosition(double angle) {
    final clamped = angle.clamp(0.0, 180.0);
    _servoPosition = clamped;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setDouble('aura_servo_pos', clamped);
    });
    _bleService.writeServo(clamped.round().toString());
    addLog('Servo Position: ${clamped.round()}°', BleLogType.info);
    notifyListeners();
  }

  void incrementServo([int? step]) {
    final d = step ?? _servoStep;
    setServoPosition(_servoPosition + d);
  }

  void decrementServo([int? step]) {
    final d = step ?? _servoStep;
    setServoPosition(_servoPosition - d);
  }

  void resetServo() {
    setServoPosition(0.0);
  }

  void setServoStep(int step) {
    _servoStep = step;
    notifyListeners();
  }

  // BLE Connectivity
  Future<void> connectBle() async {
    addLog('Initiating BLE Scan for ${BleService.instance.currentStatus.deviceName ?? "903-AC-V2"}...', BleLogType.info);
    await _bleService.connect();
  }

  void disconnectBle() {
    _bleService.disconnect();
    addLog('Bluetooth disconnected by user', BleLogType.warn);
  }

  void setAutoConnect(bool enabled) {
    _autoConnect = enabled;
    _bleService.setAutoReconnectEnabled(enabled);
    SharedPreferences.getInstance().then((prefs) {
      prefs.setBool('aura_autoconnect', enabled);
    });
    addLog('Auto-connect ${enabled ? "enabled" : "disabled"}', BleLogType.info);
    notifyListeners();
  }

  void startSimulation() {
    _bleService.startSimulation(72.5);
    addLog('Simulation Mode Active (72.5°F)', BleLogType.info);
  }

  void stopSimulation() {
    _bleService.disconnect();
    addLog('Simulation stopped', BleLogType.warn);
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _tempSub?.cancel();
    super.dispose();
  }
}
