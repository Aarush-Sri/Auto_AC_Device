import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:universal_ble/universal_ble.dart';
import '../constants/ble_constants.dart';

class BleStatus {
  final bool isConnected;
  final bool isConnecting;
  final bool isAutoReconnecting;
  final bool isSimulating;
  final String? deviceName;
  final String? deviceId;
  final String? error;

  const BleStatus({
    this.isConnected = false,
    this.isConnecting = false,
    this.isAutoReconnecting = false,
    this.isSimulating = false,
    this.deviceName,
    this.deviceId,
    this.error,
  });
}

class BleService {
  static final BleService instance = BleService._internal();
  BleService._internal();

  final _statusController = StreamController<BleStatus>.broadcast();
  Stream<BleStatus> get statusStream => _statusController.stream;

  final _tempController = StreamController<double>.broadcast();
  Stream<double> get tempStream => _tempController.stream;

  BleStatus _currentStatus = const BleStatus();
  BleStatus get currentStatus => _currentStatus;

  String? _connectedDeviceId;
  String? _targetDeviceId;
  bool _userExplicitDisconnect = false;
  int _reconnectAttempts = 0;
  static const int maxReconnectAttempts = 10;
  Timer? _reconnectTimer;
  Timer? _pollTimer;
  Timer? _simTimer;

  bool _isWritingSetpoint = false;
  double? _pendingSetpoint;
  bool _isWritingServo = false;
  String? _pendingServo;
  bool _autoReconnectEnabled = true;

  final _scanResultsController = StreamController<List<BleScanResult>>.broadcast();
  Stream<List<BleScanResult>> get scanResultsStream => _scanResultsController.stream;

  final Map<String, BleScanResult> _discoveredDevicesMap = {};
  List<BleScanResult> get discoveredDevices => _discoveredDevicesMap.values.toList();

  bool _isScanning = false;
  bool get isScanning => _isScanning;
  Timer? _scanTimer;

  String _activeServiceUuid = BleConstants.serviceUuid;
  String _activeTempCharUuid = BleConstants.tempCharacteristicUuid;
  String _activeSetpointCharUuid = BleConstants.setpointCharacteristicUuid;
  String _activeServoCharUuid = BleConstants.servoCharacteristicUuid;

  void init() {
    UniversalBle.onConnectionChanged = (deviceId, state) {
      final isConnected = state == BleConnectionState.connected;
      debugPrint('[BLE] Connection status changed for $deviceId: $state');
      if (deviceId == _connectedDeviceId) {
        if (!isConnected) {
          _handleDisconnect();
        }
      }
    };

    UniversalBle.onValueChanged = (deviceId, characteristicId, value) {
      final charNorm = characteristicId.toLowerCase().replaceAll('-', '');
      final tempNorm = BleConstants.tempCharacteristicUuid.toLowerCase().replaceAll('-', '');
      if (charNorm == tempNorm || charNorm.contains('9001')) {
        final parsed = parseTemperature(value);
        if (parsed != null) {
          debugPrint('[BLE] Temperature notification received: $parsed°');
          _tempController.add(parsed);
        }
      }
    };

    UniversalBle.onAvailabilityChange = (state) {
      debugPrint('[BLE] Bluetooth availability changed: $state');
      if (state == AvailabilityState.poweredOn) {
        if (_autoReconnectEnabled && !_currentStatus.isConnected && !_currentStatus.isConnecting && !_userExplicitDisconnect) {
          debugPrint('[BLE] Bluetooth adapter powered on - initiating auto-connect');
          connect();
        }
      } else if (state == AvailabilityState.poweredOff || state == AvailabilityState.unauthorized) {
        if (_isScanning) {
          stopScan();
        }
        if (!_currentStatus.isConnected) {
          _emitStatus(
            isConnecting: false,
            error: 'Bluetooth is off or not permitted.',
          );
        }
      }
    };
  }

  void setAutoReconnectEnabled(bool enabled) {
    _autoReconnectEnabled = enabled;
    if (!enabled) {
      _reconnectTimer?.cancel();
      _reconnectTimer = null;
    }
  }

  void setTargetDeviceId(String id) {
    _targetDeviceId = id;
  }

  /// Parses raw byte payload into a temperature float.
  /// Handles ASCII text strings (e.g. "24.5") or 4-byte IEEE-754 Float32 (little endian).
  static double? parseTemperature(Uint8List bytes) {
    if (bytes.isEmpty) return null;

    // 1. ASCII String fallback (e.g. "24.5" or "72.0")
    try {
      final str = utf8.decode(bytes).trim();
      final isAsciiNumber = RegExp(r'^[+-]?\d+(\.\d+)?$').hasMatch(str);
      if (isAsciiNumber) {
        final parsed = double.tryParse(str);
        if (parsed != null && parsed > -50 && parsed < 300) {
          return (parsed * 10).roundToDouble() / 10;
        }
      }
    } catch (_) {
      // Continue to binary parsing
    }

    // 2. Binary IEEE-754 Float32 (ESP32 setValue(float) writes 4 bytes little-endian)
    if (bytes.length == 4) {
      final bd = ByteData.sublistView(bytes);
      final val = bd.getFloat32(0, Endian.little);
      if (!val.isNaN && val > -50 && val < 300) {
        return (val * 10).roundToDouble() / 10;
      }
    }

    // 3. Binary 64-bit float fallback (8 bytes)
    if (bytes.length == 8) {
      final bd = ByteData.sublistView(bytes);
      final val = bd.getFloat64(0, Endian.little);
      if (!val.isNaN && val > -50 && val < 300) {
        return (val * 10).roundToDouble() / 10;
      }
    }

    // 4. Single-byte integer
    if (bytes.length == 1) {
      return bytes[0].toDouble();
    }

    // 5. Two-byte int16 (fixed point / 10)
    if (bytes.length == 2) {
      final bd = ByteData.sublistView(bytes);
      return bd.getInt16(0, Endian.little) / 10.0;
    }

    return null;
  }

  /// Initiates scanning with live discovered device streaming.
  /// If [autoConnect] is true, will auto-connect upon finding a matching peripheral.
  Future<void> startScan({
    Duration timeout = const Duration(seconds: 12),
    bool autoConnect = false,
  }) async {
    _stopSimulation();
    _userExplicitDisconnect = false;
    _isScanning = true;
    _discoveredDevicesMap.clear();
    _scanResultsController.add([]);

    AvailabilityState availability;
    try {
      availability = await UniversalBle.getBluetoothAvailabilityState();
    } catch (_) {
      availability = AvailabilityState.unknown;
    }

    if (availability != AvailabilityState.poweredOn) {
      _isScanning = false;
      _emitStatus(
        isConnecting: false,
        isAutoReconnecting: _autoReconnectEnabled && autoConnect,
        error: 'Bluetooth is not ready. Waiting for adapter...',
      );
      return;
    }

    _emitStatus(isConnecting: true, error: null);

    WebRequestOptionsBuilder? webOptions;
    if (kIsWeb) {
      webOptions = WebRequestOptionsBuilder.acceptAllDevices(
        optionalServices: [BleConstants.serviceUuid.toLowerCase()],
      );
    }

    UniversalBle.onScanResult = (result) {
      _discoveredDevicesMap[result.deviceId] = result;
      _scanResultsController.add(discoveredDevices);

      if (autoConnect) {
        final name = (result.name ?? '').toUpperCase();
        final isMatch = name == BleConstants.deviceName ||
            name.contains('903-AC') ||
            name.contains('903') ||
            name.contains('ESP32') ||
            (result.deviceId == _targetDeviceId && _targetDeviceId != null);

        if (isMatch) {
          stopScan();
          connectToDevice(result.deviceId, result.name ?? BleConstants.deviceName);
        }
      }
    };

    try {
      await UniversalBle.startScan(webRequestOptions: webOptions);
    } catch (e) {
      _isScanning = false;
      _emitStatus(isConnecting: false, error: 'Scan error: $e');
      if (autoConnect && _autoReconnectEnabled && !_userExplicitDisconnect) {
        _reconnectTimer?.cancel();
        _reconnectTimer = Timer(const Duration(seconds: 3), () {
          if (!_currentStatus.isConnected) connect();
        });
      }
      return;
    }

    _scanTimer?.cancel();
    _scanTimer = Timer(timeout, () {
      if (_isScanning) {
        stopScan();
        if (autoConnect && !_currentStatus.isConnected && !_currentStatus.isConnecting) {
          if (_autoReconnectEnabled && !_userExplicitDisconnect) {
            _emitStatus(
              isConnecting: true,
              isAutoReconnecting: true,
              error: 'Searching for ${BleConstants.deviceName}...',
            );
            // Cooldown before next scan pass to prevent mobile OS BLE scan throttling
            _reconnectTimer?.cancel();
            _reconnectTimer = Timer(const Duration(milliseconds: 2500), () {
              if (_autoReconnectEnabled && !_userExplicitDisconnect && !_currentStatus.isConnected) {
                connect();
              }
            });
          } else {
            _emitStatus(
              isConnecting: false,
              error: 'Could not find ${BleConstants.deviceName} nearby. Tap to scan devices.',
            );
          }
        }
      }
    });
  }

  Future<void> stopScan() async {
    _isScanning = false;
    _scanTimer?.cancel();
    _scanTimer = null;
    UniversalBle.onScanResult = null;
    try {
      await UniversalBle.stopScan();
    } catch (_) {}
  }

  /// Connect using automatic scan match or direct target device reconnect
  Future<void> connect() async {
    _userExplicitDisconnect = false;
    _reconnectTimer?.cancel();

    // If we already have a saved target device, attempt direct fast connect first
    if (_targetDeviceId != null && _targetDeviceId!.isNotEmpty && !_currentStatus.isConnected) {
      _emitStatus(
        isConnecting: true,
        isAutoReconnecting: true,
        deviceId: _targetDeviceId,
        deviceName: BleConstants.deviceName,
        error: 'Connecting to ${BleConstants.deviceName}...',
      );
      try {
        await connectToDevice(_targetDeviceId!, BleConstants.deviceName);
        if (_currentStatus.isConnected) {
          return;
        }
      } catch (e) {
        debugPrint('[BLE] Direct connect to $_targetDeviceId failed ($e), falling back to scan...');
      }
    }

    await startScan(autoConnect: true);
  }

  /// Connects directly to a specific BLE device by ID (MAC or UUID).
  Future<void> connectToDevice(String deviceId, [String? name]) async {
    await stopScan();
    _targetDeviceId = deviceId;
    final displayName = name ?? BleConstants.deviceName;

    try {
      _emitStatus(
        isConnecting: true,
        deviceId: deviceId,
        deviceName: displayName,
        error: null,
      );

      await UniversalBle.connect(deviceId);
      _connectedDeviceId = deviceId;
      _reconnectAttempts = 0;

      // Allow 350ms for platform GATT connection state to stabilize
      await Future.delayed(const Duration(milliseconds: 350));

      // Discover GATT services
      final services = await UniversalBle.discoverServices(deviceId);
      debugPrint('[BLE] Discovered ${services.length} services on $deviceId');

      // Resolve exact service & characteristic UUIDs
      for (final s in services) {
        if (_matchesUuid(s.uuid, BleConstants.serviceUuid)) {
          _activeServiceUuid = s.uuid;
          for (final c in s.characteristics) {
            if (_matchesUuid(c.uuid, BleConstants.tempCharacteristicUuid)) {
              _activeTempCharUuid = c.uuid;
            } else if (_matchesUuid(c.uuid, BleConstants.setpointCharacteristicUuid)) {
              _activeSetpointCharUuid = c.uuid;
            } else if (_matchesUuid(c.uuid, BleConstants.servoCharacteristicUuid)) {
              _activeServoCharUuid = c.uuid;
            }
          }
          break;
        }
      }

      // Subscribe to temperature characteristic notifications
      try {
        await UniversalBle.setNotifiable(
          deviceId,
          _activeServiceUuid,
          _activeTempCharUuid,
          BleInputProperty.notification,
        );
        debugPrint('[BLE] Notifications enabled for temperature characteristic');
      } catch (e) {
        debugPrint('[BLE] Notifications not available ($e), starting polling');
        _startPolling(deviceId);
      }

      // Initial read of temperature
      try {
        final initialBytes = await UniversalBle.readValue(
          deviceId,
          _activeServiceUuid,
          _activeTempCharUuid,
        );
        final initialTemp = parseTemperature(initialBytes);
        if (initialTemp != null) {
          _tempController.add(initialTemp);
        }
      } catch (e) {
        debugPrint('[BLE] Initial temperature read: $e');
      }

      _emitStatus(
        isConnected: true,
        deviceName: displayName,
        deviceId: deviceId,
      );
    } catch (e) {
      debugPrint('[BLE] Connect failed: $e');
      _handleDisconnect(explicitError: 'Connection failed: $e');
    }
  }

  bool _matchesUuid(String a, String b) {
    final cleanA = a.toLowerCase().replaceAll('-', '');
    final cleanB = b.toLowerCase().replaceAll('-', '');
    return cleanA == cleanB || cleanA.contains(cleanB) || cleanB.contains(cleanA);
  }

  void _handleDisconnect({String? explicitError}) {
    _connectedDeviceId = null;
    _pollTimer?.cancel();

    final isSecurityError = explicitError != null &&
        (explicitError.contains('SecurityError') ||
            explicitError.contains('blocklisted'));
    final shouldReconnect =
        _autoReconnectEnabled && !_userExplicitDisconnect && !isSecurityError;

    _emitStatus(
      isConnected: false,
      isConnecting: false,
      isAutoReconnecting: shouldReconnect,
      error: explicitError ?? 'Device disconnected',
    );

    if (shouldReconnect && _targetDeviceId != null) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_reconnectAttempts >= maxReconnectAttempts) {
      _emitStatus(
        isConnected: false,
        isConnecting: false,
        isAutoReconnecting: false,
        error: 'Reconnection timed out. Tap to scan devices.',
      );
      return;
    }

    _reconnectAttempts++;
    final delayMs = min(2000 * pow(1.3, _reconnectAttempts - 1), 10000).toInt();

    _emitStatus(
      isConnected: false,
      isConnecting: true,
      isAutoReconnecting: true,
      error: 'Auto-reconnecting to ${_currentStatus.deviceName ?? BleConstants.deviceName} (attempt $_reconnectAttempts)...',
    );

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(milliseconds: delayMs), () async {
      if (_userExplicitDisconnect) return;
      if (_targetDeviceId != null) {
        try {
          await connectToDevice(_targetDeviceId!, BleConstants.deviceName);
        } catch (_) {
          if (!_currentStatus.isConnected && !_userExplicitDisconnect) {
            await connect();
          }
        }
      } else {
        await connect();
      }
    });
  }

  void disconnect() {
    _userExplicitDisconnect = true;
    _reconnectTimer?.cancel();
    _pollTimer?.cancel();
    _stopSimulation();

    if (_connectedDeviceId != null) {
      try {
        UniversalBle.disconnect(_connectedDeviceId!);
      } catch (_) {}
      _connectedDeviceId = null;
    }

    _emitStatus(isConnected: false);
  }

  /// Writes target temperature setpoint as UTF-8 string to characteristic UUID ...0002.
  /// Queues operations to avoid GATT write collisions.
  Future<bool> writeSetpoint(double tempF) async {
    if (_currentStatus.isSimulating) {
      debugPrint('[BLE Sim] Setpoint updated to: $tempF°F');
      return true;
    }

    if (_connectedDeviceId == null) return false;

    if (_isWritingSetpoint) {
      _pendingSetpoint = tempF;
      return true;
    }

    _isWritingSetpoint = true;
    try {
      final str = tempF.toStringAsFixed(1);
      final bytes = Uint8List.fromList(utf8.encode(str));
      try {
        await UniversalBle.writeValue(
          _connectedDeviceId!,
          _activeServiceUuid,
          _activeSetpointCharUuid,
          bytes,
          BleOutputProperty.withResponse,
        );
      } catch (writeErr) {
        debugPrint('[BLE] withResponse write failed ($writeErr), falling back to withoutResponse');
        await UniversalBle.writeValue(
          _connectedDeviceId!,
          _activeServiceUuid,
          _activeSetpointCharUuid,
          bytes,
          BleOutputProperty.withoutResponse,
        );
      }
      debugPrint('[BLE] Wrote setpoint $str to characteristic ...0002');
      return true;
    } catch (e) {
      debugPrint('[BLE] Error writing setpoint: $e');
      return false;
    } finally {
      _isWritingSetpoint = false;
      if (_pendingSetpoint != null) {
        final next = _pendingSetpoint!;
        _pendingSetpoint = null;
        writeSetpoint(next);
      }
    }
  }

  /// Writes servo command ('on', 'off') or numeric angle ('0' to '180') to characteristic UUID ...0003.
  Future<bool> writeServo(String command) async {
    if (_currentStatus.isSimulating) {
      debugPrint('[BLE Sim] Servo updated to: "$command"');
      return true;
    }

    if (_connectedDeviceId == null) return false;

    if (_isWritingServo) {
      _pendingServo = command;
      return true;
    }

    _isWritingServo = true;
    try {
      final bytes = Uint8List.fromList(utf8.encode(command));
      try {
        await UniversalBle.writeValue(
          _connectedDeviceId!,
          _activeServiceUuid,
          _activeServoCharUuid,
          bytes,
          BleOutputProperty.withResponse,
        );
      } catch (writeErr) {
        debugPrint('[BLE] withResponse write failed ($writeErr), falling back to withoutResponse');
        await UniversalBle.writeValue(
          _connectedDeviceId!,
          _activeServiceUuid,
          _activeServoCharUuid,
          bytes,
          BleOutputProperty.withoutResponse,
        );
      }
      debugPrint('[BLE] Wrote servo command "$command" to characteristic ...0003');
      return true;
    } catch (e) {
      debugPrint('[BLE] Error writing servo: $e');
      return false;
    } finally {
      _isWritingServo = false;
      if (_pendingServo != null) {
        final next = _pendingServo!;
        _pendingServo = null;
        writeServo(next);
      }
    }
  }

  void _startPolling(String deviceId) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) async {
      if (_connectedDeviceId != null) {
        try {
          final bytes = await UniversalBle.readValue(
            deviceId,
            BleConstants.serviceUuid,
            BleConstants.tempCharacteristicUuid,
          );
          final temp = parseTemperature(bytes);
          if (temp != null) {
            _tempController.add(temp);
          }
        } catch (_) {}
      }
    });
  }

  // Simulation Mode for testing UI without physical ESP32 hardware
  void startSimulation([double baseTemp = 72.5]) {
    disconnect();
    _emitStatus(
      isConnected: true,
      isSimulating: true,
      deviceName: '${BleConstants.deviceName} (Simulated)',
    );

    _tempController.add(baseTemp);
    _simTimer = Timer.periodic(const Duration(seconds: 3), (t) {
      _tempController.add(baseTemp);
    });
  }

  void _stopSimulation() {
    _simTimer?.cancel();
    _simTimer = null;
  }

  void _emitStatus({
    bool isConnected = false,
    bool isConnecting = false,
    bool isAutoReconnecting = false,
    bool isSimulating = false,
    String? deviceName,
    String? deviceId,
    String? error,
  }) {
    _currentStatus = BleStatus(
      isConnected: isConnected,
      isConnecting: isConnecting,
      isAutoReconnecting: isAutoReconnecting,
      isSimulating: isSimulating,
      deviceName: deviceName ?? (isConnected ? BleConstants.deviceName : null),
      deviceId: deviceId,
      error: error,
    );
    _statusController.add(_currentStatus);
  }
}
