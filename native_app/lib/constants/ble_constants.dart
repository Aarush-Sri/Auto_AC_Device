/// BLE Service & Characteristic Identifiers for ESP32 903-AC-V2
class BleConstants {
  static const String deviceName = '903-AC-V2';
  static const String deviceNameFallback = '903-AC';

  /// 128-bit Primary GATT Service UUID
  static const String serviceUuid = '12345678-1234-1234-1234-123456789000';

  /// Ambient Temperature characteristic (Read / Notify)
  /// Receives IEEE-754 32-bit float (4 bytes LE) or ASCII string (e.g. "24.5")
  static const String tempCharacteristicUuid = '12345678-1234-1234-1234-123456789001';

  /// Target Temperature Setpoint characteristic (Write)
  /// Writes target temperature as UTF-8 string (e.g. "72.0")
  static const String setpointCharacteristicUuid = '12345678-1234-1234-1234-123456789002';

  /// Servo Control & Power characteristic (Write)
  /// Writes "on", "off", or numeric angle "0" to "180" as UTF-8 string
  static const String servoCharacteristicUuid = '12345678-1234-1234-1234-123456789003';
}
