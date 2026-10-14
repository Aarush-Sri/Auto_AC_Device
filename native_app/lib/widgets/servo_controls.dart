import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../constants/aura_theme.dart';
import '../providers/thermostat_provider.dart';

class ServoControls extends StatelessWidget {
  const ServoControls({super.key});

  String _flowStatus(double position, bool isPowerOn) {
    if (!isPowerOn) return 'Off';
    final pct = ((position / 180.0) * 100).round();
    if (pct <= 5) return 'Closed';
    if (pct >= 95) return 'Full Flow';
    return '$pct% Flow';
  }

  @override
  Widget build(BuildContext context) {
    final thermostat = context.watch<ThermostatProvider>();
    final position = thermostat.servoPosition;
    final isPowerOn = thermostat.activeZone.power;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AuraTheme.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AuraTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header: Clean Flow Label & Status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    LucideIcons.wind,
                    size: 16,
                    color: isPowerOn ? AuraTheme.primary : AuraTheme.textMuted,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Vent Airflow',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AuraTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: isPowerOn
                      ? AuraTheme.primary.withOpacity(0.12)
                      : AuraTheme.cardSurfaceElevated,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isPowerOn
                        ? AuraTheme.primary.withOpacity(0.3)
                        : AuraTheme.border,
                  ),
                ),
                child: Text(
                  _flowStatus(position, isPowerOn),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isPowerOn ? AuraTheme.primary : AuraTheme.textMuted,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 6),

          // Streamlined Smooth Slider
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: isPowerOn ? AuraTheme.primary : AuraTheme.textMuted,
              inactiveTrackColor: AuraTheme.border,
              thumbColor: isPowerOn ? AuraTheme.primary : AuraTheme.textMuted,
              overlayColor: AuraTheme.primary.withOpacity(0.15),
              trackHeight: 4,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
            ),
            child: Slider(
              value: position,
              min: 0,
              max: 180,
              onChanged: isPowerOn
                  ? (val) {
                      HapticFeedback.selectionClick();
                      thermostat.setServoPosition(val);
                    }
                  : null,
            ),
          ),
        ],
      ),
    );
  }
}
