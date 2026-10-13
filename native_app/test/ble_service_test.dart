import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:aura_climate/services/ble_service.dart';

void main() {
  group('BleService - parseTemperature', () {
    test('parses ASCII numeric string correctly', () {
      final bytes = Uint8List.fromList(utf8.encode('24.5'));
      final result = BleService.parseTemperature(bytes);
      expect(result, equals(24.5));
    });

    test('parses ASCII negative temperature correctly', () {
      final bytes = Uint8List.fromList(utf8.encode('-12.4'));
      final result = BleService.parseTemperature(bytes);
      expect(result, equals(-12.4));
    });

    test('parses 4-byte IEEE-754 little-endian float32 correctly', () {
      // 24.5 in IEEE-754 32-bit float LE: 0x00, 0x00, 0xC4, 0x41
      final bd = ByteData(4)..setFloat32(0, 24.5, Endian.little);
      final bytes = bd.buffer.asUint8List();
      final result = BleService.parseTemperature(bytes);
      expect(result, equals(24.5));
    });

    test('parses 72.0 float32 correctly', () {
      final bd = ByteData(4)..setFloat32(0, 72.0, Endian.little);
      final bytes = bd.buffer.asUint8List();
      final result = BleService.parseTemperature(bytes);
      expect(result, equals(72.0));
    });

    test('returns null for empty byte array', () {
      final result = BleService.parseTemperature(Uint8List(0));
      expect(result, isNull);
    });

    test('returns null for non-numeric ASCII strings', () {
      final bytes = Uint8List.fromList(utf8.encode('not_a_number'));
      final result = BleService.parseTemperature(bytes);
      expect(result, isNull);
    });

    test('parses single byte unsigned integer', () {
      final bytes = Uint8List.fromList([25]);
      final result = BleService.parseTemperature(bytes);
      expect(result, equals(25.0));
    });

    test('parses two-byte signed int16 divided by 10', () {
      // 245 in int16 LE = 24.5°
      final bd = ByteData(2)..setInt16(0, 245, Endian.little);
      final bytes = bd.buffer.asUint8List();
      final result = BleService.parseTemperature(bytes);
      expect(result, equals(24.5));
    });
  });
}
