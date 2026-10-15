import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'constants/aura_theme.dart';
import 'providers/thermostat_provider.dart';
import 'widgets/aura_header.dart';
import 'widgets/circular_dial.dart';
import 'widgets/settings_drawer.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AuraTheme.background,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const AuraClimateApp());
}

class AuraClimateApp extends StatelessWidget {
  const AuraClimateApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ThermostatProvider(),
      child: MaterialApp(
        title: 'Aura Climate',
        debugShowCheckedModeBanner: false,
        theme: AuraTheme.darkTheme,
        home: const MainThermostatScreen(),
      ),
    );
  }
}

class MainThermostatScreen extends StatefulWidget {
  const MainThermostatScreen({super.key});

  @override
  State<MainThermostatScreen> createState() => _MainThermostatScreenState();
}

class _MainThermostatScreenState extends State<MainThermostatScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AuraTheme.background,
      endDrawer: const SettingsDrawer(),
      body: Column(
        children: [
          // Aura Top Navigation Header
          AuraHeader(
            onOpenSettings: () {
              _scaffoldKey.currentState?.openEndDrawer();
            },
          ),

          // Main Viewport
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              physics: const BouncingScrollPhysics(),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Circular Dial
                      CircularDial(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
