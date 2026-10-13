import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aura_climate/main.dart';
import 'package:aura_climate/constants/aura_theme.dart';
import 'package:aura_climate/constants/ble_constants.dart';
import 'package:aura_climate/models/ble_log_entry.dart';
import 'package:aura_climate/models/climate_zone.dart';
import 'package:aura_climate/providers/thermostat_provider.dart';
import 'package:aura_climate/services/ble_service.dart';
import 'package:aura_climate/widgets/aura_header.dart';
import 'package:aura_climate/widgets/circular_dial.dart';
import 'package:aura_climate/widgets/mode_selector.dart';
import 'package:aura_climate/widgets/servo_controls.dart';
import 'package:aura_climate/widgets/settings_drawer.dart';

void main() {
  testWidgets('All widgets and theme compile and instantiate properly', (WidgetTester tester) async {
    expect(AuraTheme.darkTheme, isNotNull);
    expect(BleConstants.serviceUuid, isNotNull);

    // Build AuraClimateApp
    await tester.pumpWidget(const AuraClimateApp());
    expect(find.byType(AuraClimateApp), findsOneWidget);
    expect(find.byType(MainThermostatScreen), findsOneWidget);
    expect(find.byType(AuraHeader), findsOneWidget);
    expect(find.byType(CircularDial), findsOneWidget);
    expect(find.byType(ModeSelector), findsOneWidget);
    expect(find.byType(ServoControls), findsOneWidget);
  });
}
