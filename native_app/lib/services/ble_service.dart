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
      final charLower = characteristicId.toLowerCase();
      if (charLower == BleConstants.tempCharacteristicUuid.toLowerCase() ||
          charLower.contains('9001')) {
        final parsed = parseTemperature(value);
        if (parsed != null) {
          debugPrint('[BLE] Temperature notification received: $parsed°');
          _tempController.add(parsed);
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

  Future<void> connect() async {
    _stopSimulation();
    _userExplicitDisconnect = false;
    _emitStatus(isConnecting: true, error: null);

    try {
      final availability = await UniversalBle.getBluetoothAvailabilityState();
      if (availability != AvailabilityState.poweredOn) {
        _emitStatus(
          isConnecting: false,
          error: 'Bluetooth is turned off or not available',
        );
        return;
      }

      final completer = Completer<BleScanResult?>();

      // Web Bluetooth requires GATT service UUIDs to be explicitly declared
      // in optionalServices during requestDevice. If omitted, Chrome throws a
      // SecurityError ("Tried getting blocklisted UUID / origin not allowed")
      // when discovering or accessing GATT services.
      WebRequestOptionsBuilder? webOptions;
      if (kIsWeb) {
        webOptions = WebRequestOptionsBuilder.acceptAllDevices(
          optionalServices: [
            BleConstants.serviceUuid.toLowerCase(),
          ],
        );
      }

      UniversalBle.onScanResult = (result) {
        if (kIsWeb) {
          // On Web, the browser displays its native device picker modal.
          // Any device selected by the user is the intended device.
          UniversalBle.onScanResult = null;
          UniversalBle.stopScan();
          if (!completer.isCompleted) completer.complete(result);
          return;
        }

        final name = (result.name ?? '').toUpperCase();
        if (name == BleConstants.deviceName ||
            name.contains('903-AC') ||
            name.contains('903')) {
          UniversalBle.onScanResult = null;
          UniversalBle.stopScan();
          if (!completer.isCompleted) completer.complete(result);
        }
      };

      await UniversalBle.startScan(webRequestOptions: webOptions);

      // Scan timeout 10s
      Timer(const Duration(seconds: 10), () {
        if (!completer.isCompleted) {
          UniversalBle.onScanResult = null;
          UniversalBle.stopScan();
          completer.complete(null);
        }
      });

      final target = await completer.future;
      if (target == null) {
        _emitStatus(
          isConnecting: false,
          error: 'Could not find ${BleConstants.deviceName} nearby',
        );
        return;
      }

      await _connectToDevice(target.deviceId, target.name ?? BleConstants.deviceName);
    } catch (e) {
      _emitStatus(
        isConnecting: false,
        error: 'Scan/Connect error: $e',
      );
    }
  }

  Future<void> _connectToDevice(String deviceId, String name) async {
    _targetDeviceId = deviceId;
    try {
      _emitStatus(isConnecting: true, deviceId: deviceId, error: null);
      await UniversalBle.connect(deviceId);
      _connectedDeviceId = deviceId;
      _reconnectAttempts = 0;

      // Discover GATT services
      final services = await UniversalBle.discoverServices(deviceId);
      debugPrint('[BLE] Discovered ${services.length} services on $deviceId');

      // Subscribe to temperature characteristic notifications
      try {
        await UniversalBle.setNotifiable(
          deviceId,
          BleConstants.serviceUuid,
          BleConstants.tempCharacteristicUuid,
          BleInputProperty.notification,
        );
        debugPrint('[BLE] Notifications enabled for temperature characteristic');
      } catch (e) {
        debugPrint('[BLE] Notifications not available ($e), starting polling');
        _startPolling(deviceId);
      }

      // Initial read
      try {
        final initialBytes = await UniversalBle.readValue(
          deviceId,
          BleConstants.serviceUuid,
          BleConstants.tempCharacteristicUuid,
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
        deviceName: name,
        deviceId: deviceId,
      );
    } catch (e) {
      debugPrint('[BLE] Connect failed: $e');
      _handleDisconnect(explicitError: 'Connection failed: $e');
    }
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
        error: 'Reconnection timed out. Tap BLE Link to retry.',
      );
      return;
    }

    _reconnectAttempts++;
    final delayMs = min(2000 * pow(1.3, _reconnectAttempts - 1), 10000).toInt();

    _emitStatus(
      isConnected: false,
      isConnecting: true,
      isAutoReconnecting: true,
      error: 'Auto-reconnecting to ${BleConstants.deviceName} (attempt $_reconnectAttempts)...',
    );

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(milliseconds: delayMs), () async {
      if (_targetDeviceId != null && !_userExplicitDisconnect) {
        await _connectToDevice(_targetDeviceId!, BleConstants.deviceName);
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
          BleConstants.serviceUuid,
          BleConstants.setpointCharacteristicUuid,
          bytes,
          BleOutputProperty.withResponse,
        );
      } catch (writeErr) {
        debugPrint('[BLE] withResponse write failed ($writeErr), falling back to withoutResponse');
        await UniversalBle.writeValue(
          _connectedDeviceId!,
          BleConstants.serviceUuid,
          BleConstants.setpointCharacteristicUuid,
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
          BleConstants.serviceUuid,
          BleConstants.servoCharacteristicUuid,
          bytes,
          BleOutputProperty.withResponse,
        );
      } catch (writeErr) {
        debugPrint('[BLE] withResponse write failed ($writeErr), falling back to withoutResponse');
        await UniversalBle.writeValue(
          _connectedDeviceId!,
          BleConstants.serviceUuid,
          BleConstants.servoCharacteristicUuid,
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
