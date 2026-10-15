import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:aura_climate/main.dart';
import 'package:aura_climate/constants/aura_theme.dart';
import 'package:aura_climate/constants/ble_constants.dart';
import 'package:aura_climate/providers/thermostat_provider.dart';
import 'package:aura_climate/widgets/aura_header.dart';
import 'package:aura_climate/widgets/circular_dial.dart';
import 'package:aura_climate/widgets/ble_scanner_sheet.dart';

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
  });

  testWidgets('Mobile phone viewport (375x667 iPhone SE) renders full app without overflow', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(375, 667);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const AuraClimateApp());
    await tester.pumpAndSettle();

    expect(find.byType(AuraHeader), findsOneWidget);
    expect(find.byType(CircularDial), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Mobile phone viewport (360x800 Android) renders full app without overflow', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const AuraClimateApp());
    await tester.pumpAndSettle();

    expect(find.byType(AuraHeader), findsOneWidget);
    expect(find.byType(CircularDial), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Mobile phone viewport (393x852 iPhone 15) renders full app without overflow', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const AuraClimateApp());
    await tester.pumpAndSettle();

    expect(find.byType(AuraHeader), findsOneWidget);
    expect(find.byType(CircularDial), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('BleScannerSheet renders and lists devices cleanly', (WidgetTester tester) async {
    await tester.pumpWidget(ChangeNotifierProvider(
      create: (_) => ThermostatProvider(),
      child: const MaterialApp(
        home: Scaffold(
          body: BleScannerSheet(),
        ),
      ),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(BleScannerSheet), findsOneWidget);
    expect(find.text('Bluetooth Devices'), findsOneWidget);
  });
}
