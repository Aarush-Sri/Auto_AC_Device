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

class _MainThermostatScreenState extends State<MainThermostatScreen> with WidgetsBindingObserver {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    final thermostat = context.read<ThermostatProvider>();
    if (state == AppLifecycleState.resumed) {
      // Re-trigger auto-connect immediately whenever user switches back to the app
      if (thermostat.autoConnect && !thermostat.bleStatus.isConnected && !thermostat.bleStatus.isConnecting) {
        thermostat.connectBle();
      }
    }
  }

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

          // Main Viewport (Fixed & Centered, No Scrolling)
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: const CircularDial(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
