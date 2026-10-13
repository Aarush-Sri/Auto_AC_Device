import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../constants/aura_theme.dart';
import '../providers/thermostat_provider.dart';

class ServoControls extends StatelessWidget {
  const ServoControls({super.key});

  @override
  Widget build(BuildContext context) {
    final thermostat = context.watch<ThermostatProvider>();
    final position = thermostat.servoPosition;
    final isPowerOn = thermostat.activeZone.power;

    final presets = [
      {'label': '0° Close', 'angle': 0.0},
      {'label': '45° Eco', 'angle': 45.0},
      {'label': '90° Direct', 'angle': 90.0},
      {'label': '180° Open', 'angle': 180.0},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AuraTheme.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AuraTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Title & Current Position
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.compass, size: 16, color: AuraTheme.primary),
                  SizedBox(width: 8),
                  Text(
                    'Vent Actuator Angle',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AuraTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AuraTheme.cardSurfaceElevated,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AuraTheme.border),
                ),
                child: Text(
                  '${position.round()}°',
                  style: const TextStyle(
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono',
                    fontWeight: FontWeight.bold,
                    color: AuraTheme.primary,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Stepper Buttons and Slider
          Row(
            children: [
              _MiniButton(
                icon: LucideIcons.minus,
                label: '-10°',
                onPressed: isPowerOn
                    ? () {
                        HapticFeedback.lightImpact();
                        thermostat.decrementServo(10);
                      }
                    : null,
              ),
              Expanded(
                child: SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: AuraTheme.primary,
                    inactiveTrackColor: AuraTheme.border,
                    thumbColor: AuraTheme.primary,
                    overlayColor: AuraTheme.primary.withOpacity(0.15),
                    trackHeight: 4,
                  ),
                  child: Slider(
                    value: position,
                    min: 0,
                    max: 180,
                    divisions: 18,
                    onChanged: isPowerOn
                        ? (val) {
                            thermostat.setServoPosition(val);
                          }
                        : null,
                  ),
                ),
              ),
              _MiniButton(
                icon: LucideIcons.plus,
                label: '+10°',
                onPressed: isPowerOn
                    ? () {
                        HapticFeedback.lightImpact();
                        thermostat.incrementServo(10);
                      }
                    : null,
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Quick Angle Presets
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: presets.map((p) {
              final label = p['label'] as String;
              final angle = p['angle'] as double;
              final isMatch = (position - angle).abs() < 1;

              return InkWell(
                onTap: isPowerOn
                    ? () {
                        HapticFeedback.selectionClick();
                        thermostat.setServoPosition(angle);
                      }
                    : null,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isMatch ? AuraTheme.primary.withOpacity(0.12) : AuraTheme.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isMatch ? AuraTheme.primary.withOpacity(0.4) : AuraTheme.border,
                    ),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: isMatch ? FontWeight.bold : FontWeight.w500,
                      color: isMatch ? AuraTheme.primary : AuraTheme.textSecondary,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _MiniButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  const _MiniButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;

    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: enabled ? AuraTheme.cardSurfaceElevated : AuraTheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AuraTheme.border),
        ),
        child: Row(
          children: [
            Icon(icon, size: 12, color: enabled ? AuraTheme.textPrimary : AuraTheme.textMuted),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: enabled ? AuraTheme.textPrimary : AuraTheme.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
