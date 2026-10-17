import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../constants/aura_theme.dart';
import '../providers/thermostat_provider.dart';
import '../services/ble_service.dart';

import 'ble_scanner_sheet.dart';

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
      decoration: BoxDecoration(
        color: AuraTheme.surface.withOpacity(0.95),
        border: const Border(
          bottom: BorderSide(color: AuraTheme.border, width: 1),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Brand Logo & Title
              Expanded(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AuraTheme.cardSurface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: AuraTheme.primary.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      clipBehavior: Clip.antiAlias,
                      padding: const EdgeInsets.all(2),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.asset(
                          'assets/logo.png',
                          width: 32,
                          height: 32,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) => const Center(
                            child: Icon(
                              LucideIcons.wind,
                              color: AuraTheme.primary,
                              size: 18,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Flexible(
                      child: Text(
                        'Aura Climate',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AuraTheme.textPrimary,
                          letterSpacing: -0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // Right Controls Cluster (Compact for mobile)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // BLE Status Button
                  _BleButton(
                    status: bleStatus,
                    onTap: () {
                      BleScannerSheet.show(context);
                    },
                  ),
                  const SizedBox(width: 8),

                  // Temperature Unit Toggle
                  _HeaderIconButton(
                    tooltip: 'Switch Temperature Unit (°${thermostat.unit})',
                    onTap: thermostat.toggleUnit,
                    child: Text(
                      '°${thermostat.unit}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AuraTheme.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Master Power Button
                  _PowerButton(
                    isOn: isPowerOn,
                    onTap: thermostat.togglePower,
                  ),
                  const SizedBox(width: 8),

                  // Settings Drawer Button
                  _HeaderIconButton(
                    tooltip: 'Settings & BLE Telemetry',
                    onTap: onOpenSettings,
                    child: const Icon(
                      LucideIcons.sliders_horizontal,
                      size: 16,
                      color: AuraTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BleButton extends StatelessWidget {
  final BleStatus status;
  final VoidCallback onTap;

  const _BleButton({
    required this.status,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isConnected = status.isConnected;
    final isConnecting = status.isConnecting || status.isAutoReconnecting;

    Color bg;
    Color borderColor;
    Color iconColor;

    if (isConnected) {
      bg = AuraTheme.primary.withOpacity(0.12);
      borderColor = AuraTheme.primary.withOpacity(0.4);
      iconColor = AuraTheme.primary;
    } else if (isConnecting) {
      bg = AuraTheme.warning.withOpacity(0.12);
      borderColor = AuraTheme.warning.withOpacity(0.4);
      iconColor = AuraTheme.warning;
    } else {
      bg = AuraTheme.cardSurface;
      borderColor = AuraTheme.border;
      iconColor = AuraTheme.textMuted;
    }

    final tooltipMsg = isConnected
        ? 'Connected: ${status.deviceName ?? "903-AC-V2"}'
        : (isConnecting ? 'Connecting to ESP32...' : 'Bluetooth Disconnected - Tap to Connect');

    return Tooltip(
      message: tooltipMsg,
      child: InkWell(
        onTap: isConnecting ? null : onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: borderColor),
            boxShadow: isConnected
                ? [
                    BoxShadow(
                      color: AuraTheme.primary.withOpacity(0.18),
                      blurRadius: 8,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: isConnecting
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AuraTheme.warning,
                    ),
                  )
                : Stack(
                    alignment: Alignment.center,
                    children: [
                      Icon(
                        isConnected
                            ? LucideIcons.bluetooth_connected
                            : LucideIcons.bluetooth,
                        size: 16,
                        color: iconColor,
                      ),
                      if (isConnected)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: AuraTheme.success,
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class _PowerButton extends StatelessWidget {
  final bool isOn;
  final VoidCallback onTap;

  const _PowerButton({
    required this.isOn,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: isOn ? 'System ON (Tap for Standby)' : 'System STANDBY (Tap to Power ON)',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: isOn
                ? AuraTheme.primary.withOpacity(0.18)
                : AuraTheme.cardSurface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isOn
                  ? AuraTheme.primary.withOpacity(0.5)
                  : AuraTheme.border,
            ),
            boxShadow: isOn
                ? [
                    BoxShadow(
                      color: AuraTheme.primary.withOpacity(0.25),
                      blurRadius: 8,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Icon(
              LucideIcons.power,
              size: 16,
              color: isOn ? AuraTheme.primary : AuraTheme.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  final VoidCallback onTap;
  final Widget child;
  final String? tooltip;

  const _HeaderIconButton({
    required this.onTap,
    required this.child,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    final button = InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AuraTheme.cardSurface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AuraTheme.border),
        ),
        child: Center(child: child),
      ),
    );

    if (tooltip != null) {
      return Tooltip(message: tooltip!, child: button);
    }
    return button;
  }
}
