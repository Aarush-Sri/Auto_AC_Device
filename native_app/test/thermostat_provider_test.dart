import 'package:flutter_test/flutter_test.dart';
import 'package:aura_climate/models/climate_zone.dart';

void main() {
  group('Thermostat State Logic Tests', () {
    test('ClimateZone copyWith updates target setpoint correctly', () {
      const zone = ClimateZone(
        id: 'living-room',
        name: 'Living Room',
        subtitle: 'Suite',
        temp: 74.2,
        setpoint: 70.0,
        humidity: 45,
        power: true,
        mode: 'cool',
        fanSpeed: 'auto',
        aqi: 22,
        powerDraw: 820,
      );

      final updated = zone.copyWith(setpoint: 72.5);
      expect(updated.setpoint, equals(72.5));
      expect(updated.temp, equals(74.2));
      expect(updated.power, isTrue);
    });

    test('Temperature conversion Fahrenheit to Celsius math is accurate', () {
      double toCelsius(double f) => ((f - 32) * 5) / 9;

      expect(toCelsius(32.0), equals(0.0));
      expect((toCelsius(72.0) * 10).round() / 10, equals(22.2));
      expect(toCelsius(212.0), equals(100.0));
    });

    test('Temperature conversion Celsius to Fahrenheit math is accurate', () {
      double toFahrenheit(double c) => ((c * 9) / 5) + 32;

      expect(toFahrenheit(0.0), equals(32.0));
      expect(toFahrenheit(25.0), equals(77.0));
    });

    test('Setpoint is strictly clamped between 60.0°F and 85.0°F', () {
      double clampSetpoint(double val) => val.clamp(60.0, 85.0);

      expect(clampSetpoint(55.0), equals(60.0));
      expect(clampSetpoint(90.0), equals(85.0));
      expect(clampSetpoint(72.5), equals(72.5));
    });
  });
}
