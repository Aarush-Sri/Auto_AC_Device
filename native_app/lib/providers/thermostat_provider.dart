import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:universal_ble/universal_ble.dart' show BleScanResult;
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
  bool get autoConnect => _autoConnect;
  BleStatus get bleStatus => _bleStatus;
  List<BleLogEntry> get bleLogs => List.unmodifiable(_bleLogs);

  Future<void> _initProvider() async {
    _bleService.init();

    // Load persisted settings
    try {
      final prefs = await SharedPreferences.getInstance();
      _autoConnect = prefs.getBool('aura_autoconnect') ?? true;
      _unit = prefs.getString('aura_unit') ?? 'F';
      final lastDeviceId = prefs.getString('aura_last_ble_device_id');
      if (lastDeviceId != null && lastDeviceId.isNotEmpty) {
        _bleService.setTargetDeviceId(lastDeviceId);
      }
      _bleService.setAutoReconnectEnabled(_autoConnect);

      final savedZoneId = prefs.getString('aura_active_zone_id');
      if (savedZoneId != null && _zones.any((z) => z.id == savedZoneId)) {
        _activeZoneId = savedZoneId;
      }

      // Restore saved setpoints and power states for zones
      _zones = _zones.map((z) {
        final savedSetpoint = prefs.getDouble('aura_setpoint_${z.id}') ??
            (z.id == _activeZoneId ? prefs.getDouble('aura_last_setpoint') : null);
        final savedPower = prefs.getBool('aura_power_${z.id}');
        if (savedSetpoint != null || savedPower != null) {
          final clampedSetpoint = savedSetpoint != null
              ? (savedSetpoint.clamp(60.0, 85.0) * 2).roundToDouble() / 2
              : z.setpoint;
          return z.copyWith(
            setpoint: clampedSetpoint,
            power: savedPower ?? z.power,
          );
        }
        return z;
      }).toList();

      if (_unit == 'C') {
        _zones = _zones.map((z) {
          final c = (((z.setpoint - 32) * 5) / 9 * 2).roundToDouble() / 2;
          final clampedC = c.clamp(16.0, 30.0);
          return z.copyWith(setpoint: (clampedC * 9 / 5) + 32);
        }).toList();
      }
      notifyListeners();
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
      Future.delayed(const Duration(milliseconds: 300), () {
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
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('aura_active_zone_id', id);
    }).catchError((_) {});
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
    _persistPower(_activeZoneId, nextPower);
    addLog('System Power: ${nextPower ? "ON" : "STANDBY"}', BleLogType.info);
    notifyListeners();
  }

  void _persistPower(String zoneId, bool power) {
    SharedPreferences.getInstance().then((prefs) {
      prefs.setBool('aura_power_$zoneId', power);
    }).catchError((_) {});
  }

  void _persistSetpoint(String zoneId, double setpoint) {
    SharedPreferences.getInstance().then((prefs) {
      prefs.setDouble('aura_setpoint_$zoneId', setpoint);
      prefs.setDouble('aura_last_setpoint', setpoint);
    }).catchError((_) {});
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
    final double roundedF;
    if (_unit == 'C') {
      final currentC = (((activeZone.setpoint - 32) * 5) / 9 * 2).roundToDouble() / 2;
      final newC = (currentC + delta).clamp(16.0, 30.0);
      final snappedC = (newC * 2).roundToDouble() / 2;
      roundedF = (snappedC * 9 / 5) + 32;
    } else {
      final currentF = (activeZone.setpoint * 2).roundToDouble() / 2;
      final newF = (currentF + delta).clamp(60.0, 85.0);
      roundedF = (newF * 2).roundToDouble() / 2;
    }

    _zones = _zones.map((z) {
      if (z.id == _activeZoneId) {
        return z.copyWith(setpoint: roundedF);
      }
      return z;
    }).toList();

    _syncSetpointToBle(roundedF);
    _persistSetpoint(_activeZoneId, roundedF);
    notifyListeners();
  }

  void setSetpoint(double newF) {
    if (!activeZone.power) return;
    final double roundedF;
    if (_unit == 'C') {
      final inC = (((newF - 32) * 5) / 9 * 2).roundToDouble() / 2;
      final clampedC = inC.clamp(16.0, 30.0);
      roundedF = (clampedC * 9 / 5) + 32;
    } else {
      final clampedF = newF.clamp(60.0, 85.0);
      roundedF = (clampedF * 2).roundToDouble() / 2;
    }

    _zones = _zones.map((z) {
      if (z.id == _activeZoneId) {
        return z.copyWith(setpoint: roundedF);
      }
      return z;
    }).toList();

    _syncSetpointToBle(roundedF);
    _persistSetpoint(_activeZoneId, roundedF);
    notifyListeners();
  }

  void _syncSetpointToBle(double targetF) {
    final valToSend = _unit == 'C'
        ? (((targetF - 32) * 5) / 9 * 2).roundToDouble() / 2
        : (targetF * 2).roundToDouble() / 2;
    _bleService.writeSetpoint(valToSend);
    addLog('Transmitted Setpoint: $valToSend°$_unit', BleLogType.success);
  }

  void toggleUnit() {
    _unit = _unit == 'F' ? 'C' : 'F';
    _zones = _zones.map((z) {
      if (_unit == 'C') {
        final c = (((z.setpoint - 32) * 5) / 9 * 2).roundToDouble() / 2;
        final clampedC = c.clamp(16.0, 30.0);
        return z.copyWith(setpoint: (clampedC * 9 / 5) + 32);
      } else {
        final f = (z.setpoint * 2).roundToDouble() / 2;
        return z.copyWith(setpoint: f.clamp(60.0, 85.0));
      }
    }).toList();
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('aura_unit', _unit);
    });
    notifyListeners();
  }

  String formatTemperature(double tempF) {
    if (_unit == 'C') {
      final c = ((tempF - 32) * 5) / 9;
      final roundedC = (c * 10).roundToDouble() / 10;
      return roundedC % 1 == 0 ? roundedC.toInt().toString() : roundedC.toStringAsFixed(1);
    }
    final roundedF = (tempF * 10).roundToDouble() / 10;
    return roundedF % 1 == 0 ? roundedF.toInt().toString() : roundedF.toStringAsFixed(1);
  }

  // BLE Connectivity & Scanning
  List<BleScanResult> get scannedDevices => _bleService.discoveredDevices;
  bool get isScanning => _bleService.isScanning;
  Stream<List<BleScanResult>> get scanResultsStream => _bleService.scanResultsStream;

  Future<void> connectBle() async {
    addLog('Initiating BLE Scan for ${BleService.instance.currentStatus.deviceName ?? "903-AC-V2"}...', BleLogType.info);
    try {
      await _bleService.connect();
    } catch (e) {
      debugPrint('[BLE] Connect failed: $e');
    }
  }

  Future<void> startBleScan() async {
    addLog('Scanning for nearby BLE climate devices...', BleLogType.info);
    await _bleService.startScan(autoConnect: false);
    notifyListeners();
  }

  Future<void> stopBleScan() async {
    await _bleService.stopScan();
    notifyListeners();
  }

  Future<void> connectToDevice(String deviceId, [String? name]) async {
    addLog('Connecting to ${name ?? deviceId}...', BleLogType.info);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('aura_last_ble_device_id', deviceId);
    } catch (_) {}
    await _bleService.connectToDevice(deviceId, name);
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
