import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../constants/aura_theme.dart';
import '../models/ble_log_entry.dart';
import '../providers/thermostat_provider.dart';

class SettingsDrawer extends StatelessWidget {
  const SettingsDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final thermostat = context.watch<ThermostatProvider>();
    final bleStatus = thermostat.bleStatus;

    return Drawer(
      backgroundColor: AuraTheme.surface,
      surfaceTintColor: Colors.transparent,
      width: 380,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drawer Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(LucideIcons.settings, size: 20, color: AuraTheme.primary),
                      SizedBox(width: 10),
                      Text(
                        'Device & BLE Link',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: AuraTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 20, color: AuraTheme.textSecondary),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            const Divider(color: AuraTheme.border, height: 1),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Hardware Status Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AuraTheme.cardSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AuraTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ESP32 PERIPHERAL',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                            color: AuraTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _InfoRow(
                          label: 'Device Name',
                          value: bleStatus.deviceName ?? '903-AC-V2',
                        ),
                        const SizedBox(height: 8),
                        _InfoRow(
                          label: 'Status',
                          value: bleStatus.isConnected
                              ? 'CONNECTED'
                              : bleStatus.isConnecting
                                  ? 'CONNECTING'
                                  : 'DISCONNECTED',
                          valueColor: bleStatus.isConnected
                              ? AuraTheme.success
                              : bleStatus.isConnecting
                                  ? AuraTheme.warning
                                  : AuraTheme.textMuted,
                        ),
                        const SizedBox(height: 8),
                        const _InfoRow(
                          label: 'Firmware',
                          value: 'v2.4.1-Atmosphere',
                        ),
                        const SizedBox(height: 8),
                        const _InfoRow(
                          label: 'Service UUID',
                          value: '...9000',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Preferences & Toggles Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AuraTheme.cardSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AuraTheme.border),
                    ),
                    child: Column(
                      children: [
                        // Auto-connect Switch
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Auto-Connect',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AuraTheme.textPrimary,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Reconnect silently when nearby',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AuraTheme.textMuted,
                                  ),
                                ),
                              ],
                            ),
                            Switch.adaptive(
                              value: thermostat.autoConnect,
                              activeTrackColor: AuraTheme.primary,
                              activeThumbColor: AuraTheme.background,
                              onChanged: (val) {
                                thermostat.setAutoConnect(val);
                              },
                            ),
                          ],
                        ),

                        const Divider(color: AuraTheme.border, height: 20),

                        // Simulation Mode
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Offline Simulation',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AuraTheme.textPrimary,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Test UI with virtual 72.5°F stream',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AuraTheme.textMuted,
                                  ),
                                ),
                              ],
                            ),
                            Switch.adaptive(
                              value: bleStatus.isSimulating,
                              activeTrackColor: AuraTheme.primaryFixed,
                              activeThumbColor: AuraTheme.background,
                              onChanged: (val) {
                                if (val) {
                                  thermostat.startSimulation();
                                } else {
                                  thermostat.stopSimulation();
                                }
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Live BLE Telemetry Logs
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AuraTheme.cardSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AuraTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'PACKET TELEMETRY LOGS',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.0,
                                color: AuraTheme.textSecondary,
                              ),
                            ),
                            Icon(LucideIcons.terminal, size: 14, color: AuraTheme.textSecondary),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Container(
                          height: 220,
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AuraTheme.background,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AuraTheme.border),
                          ),
                          child: thermostat.bleLogs.isEmpty
                              ? const Center(
                                  child: Text(
                                    'No BLE events recorded yet',
                                    style: TextStyle(fontSize: 12, color: AuraTheme.textMuted),
                                  ),
                                )
                              : ListView.builder(
                                  itemCount: thermostat.bleLogs.length,
                                  itemBuilder: (context, idx) {
                                    final log = thermostat.bleLogs[idx];
                                    return Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 2),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            log.timestamp,
                                            style: const TextStyle(
                                              fontSize: 10,
                                              fontFamily: 'JetBrains Mono',
                                              color: AuraTheme.textMuted,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              log.message,
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontFamily: 'JetBrains Mono',
                                                color: _getLogColor(log.type),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getLogColor(BleLogType type) {
    switch (type) {
      case BleLogType.success:
        return AuraTheme.success;
      case BleLogType.warn:
        return AuraTheme.warning;
      case BleLogType.error:
        return AuraTheme.error;
      case BleLogType.data:
        return AuraTheme.primary;
      case BleLogType.info:
        return AuraTheme.textSecondary;
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AuraTheme.textSecondary),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: valueColor ?? AuraTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
