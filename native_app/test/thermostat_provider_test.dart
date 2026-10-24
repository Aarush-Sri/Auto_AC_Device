import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:aura_climate/models/climate_zone.dart';
import 'package:aura_climate/providers/thermostat_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

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

    test('ThermostatProvider loads saved setpoint from SharedPreferences on startup', () async {
      SharedPreferences.setMockInitialValues({
        'aura_setpoint_living-room': 76.5,
        'aura_power_living-room': true,
      });

      final provider = ThermostatProvider();
      // Allow async _initProvider to read mock prefs
      await Future.delayed(const Duration(milliseconds: 50));
      expect(provider.activeZone.setpoint, equals(76.5));
    });

    test('ThermostatProvider adjustSetpoint and setSetpoint strictly step in +-0.5 increments', () async {
      SharedPreferences.setMockInitialValues({
        'aura_setpoint_living-room': 70.0,
        'aura_power_living-room': true,
        'aura_unit': 'F',
      });

      final provider = ThermostatProvider();
      await Future.delayed(const Duration(milliseconds: 50));

      expect(provider.activeZone.setpoint, equals(70.0));

      // Adjust +0.5
      provider.adjustSetpoint(0.5);
      expect(provider.activeZone.setpoint, equals(70.5));

      // Adjust -0.5
      provider.adjustSetpoint(-0.5);
      expect(provider.activeZone.setpoint, equals(70.0));

      // Setting arbitrary decimal value snaps to nearest 0.5
      provider.setSetpoint(71.23);
      expect(provider.activeZone.setpoint, equals(71.0));

      provider.setSetpoint(71.4);
      expect(provider.activeZone.setpoint, equals(71.5));

      provider.setSetpoint(71.8);
      expect(provider.activeZone.setpoint, equals(72.0));
    });

    test('ThermostatProvider in Celsius mode strictly steps in +-0.5°C increments', () async {
      SharedPreferences.setMockInitialValues({
        'aura_setpoint_living-room': 69.8, // 21.0°C
        'aura_power_living-room': true,
        'aura_unit': 'C',
      });

      final provider = ThermostatProvider();
      await Future.delayed(const Duration(milliseconds: 50));

      // In Celsius: 69.8°F is 21.0°C
      expect(provider.formatTemperature(provider.activeZone.setpoint), equals('21'));

      // Adjust +0.5°C -> 21.5°C
      provider.adjustSetpoint(0.5);
      expect(provider.formatTemperature(provider.activeZone.setpoint), equals('21.5'));

      // Adjust -0.5°C -> 21.0°C
      provider.adjustSetpoint(-0.5);
      expect(provider.formatTemperature(provider.activeZone.setpoint), equals('21'));
    });
  });
}
