import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../constants/aura_theme.dart';
import '../providers/thermostat_provider.dart';
import '../services/ble_service.dart';

class AuraHeader extends StatelessWidget {
  final VoidCallback onOpenSettings;

  const AuraHeader({
    super.key,
    required this.onOpenSettings,
  });

  @override
  Widget build(BuildContext context) {
    final thermostat = context.watch<ThermostatProvider>();
    final bleStatus = thermostat.bleStatus;
    final isPowerOn = thermostat.activeZone.power;

    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AuraTheme.surface.withValues(alpha: 0.85),
        border: const Border(
          bottom: BorderSide(color: AuraTheme.border, width: 1),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            // Brand Logo & Title
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AuraTheme.cardSurface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AuraTheme.primary.withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: const Center(
                    child: Icon(
                      LucideIcons.wind,
                      color: AuraTheme.primary,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Aura Climate',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AuraTheme.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),

            const Spacer(),

            // Right Controls
            Row(
              children: [
                // BLE Connection Pill
                _BleStatusPill(
                  status: bleStatus,
                  onTap: () {
                    if (bleStatus.isConnected) {
                      thermostat.disconnectBle();
                    } else {
                      thermostat.connectBle();
                    }
                  },
                ),
                const SizedBox(width: 8),

                // Temperature Unit Toggle
                InkWell(
                  onTap: thermostat.toggleUnit,
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      color: AuraTheme.cardSurface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AuraTheme.border),
                    ),
                    child: Text(
                      '°${thermostat.unit}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AuraTheme.textPrimary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Master Power Button
                InkWell(
                  onTap: thermostat.togglePower,
                  borderRadius: BorderRadius.circular(24),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: isPowerOn ? AuraTheme.cardSurfaceElevated : AuraTheme.cardSurface,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: isPowerOn
                            ? AuraTheme.primary.withValues(alpha: 0.4)
                            : AuraTheme.border,
                      ),
                      boxShadow: isPowerOn
                          ? [
                              BoxShadow(
                                color: AuraTheme.primary.withValues(alpha: 0.18),
                                blurRadius: 12,
                                spreadRadius: 1,
                              ),
                            ]
                          : null,
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isPowerOn ? AuraTheme.primary : AuraTheme.textMuted,
                            boxShadow: isPowerOn
                                ? [
                                    const BoxShadow(
                                      color: AuraTheme.primary,
                                      blurRadius: 6,
                                      spreadRadius: 1,
                                    ),
                                  ]
                                : null,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          isPowerOn ? 'ON' : 'STANDBY',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: isPowerOn ? AuraTheme.textPrimary : AuraTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Icon(
                          LucideIcons.power,
                          size: 14,
                          color: isPowerOn ? AuraTheme.primary : AuraTheme.textSecondary,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Settings Drawer Button
                InkWell(
                  onTap: onOpenSettings,
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AuraTheme.cardSurface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AuraTheme.border),
                    ),
                    child: const Center(
                      child: Icon(
                        LucideIcons.sliders_horizontal,
                        size: 18,
                        color: AuraTheme.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BleStatusPill extends StatelessWidget {
  final BleStatus status;
  final VoidCallback onTap;

  const _BleStatusPill({
    required this.status,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isConnected = status.isConnected;
    final isConnecting = status.isConnecting || status.isAutoReconnecting;

    Color bg;
    Color borderColor;
    Color textColor;
    Widget icon;
    String label;

    if (isConnected) {
      bg = AuraTheme.primary.withValues(alpha: 0.12);
      borderColor = AuraTheme.primary.withValues(alpha: 0.4);
      textColor = AuraTheme.primary;
      icon = const Icon(LucideIcons.bluetooth_connected, size: 14, color: AuraTheme.primary);
      label = status.deviceName ?? '903-AC-V2';
    } else if (isConnecting) {
      bg = AuraTheme.cardSurfaceElevated;
      borderColor = AuraTheme.warning.withValues(alpha: 0.4);
      textColor = AuraTheme.warning;
      icon = const SizedBox(
        width: 12,
        height: 12,
        child: CircularProgressIndicator(strokeWidth: 2, color: AuraTheme.warning),
      );
      label = status.isAutoReconnecting ? 'Reconnecting...' : 'Pairing...';
    } else {
      bg = AuraTheme.cardSurface;
      borderColor = AuraTheme.border;
      textColor = AuraTheme.textSecondary;
      icon = const Icon(LucideIcons.bluetooth, size: 14, color: AuraTheme.textSecondary);
      label = 'BLE Link';
    }

    return InkWell(
      onTap: isConnecting ? null : onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          children: [
            icon,
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
