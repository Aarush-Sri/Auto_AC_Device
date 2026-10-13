import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../constants/aura_theme.dart';
import '../providers/thermostat_provider.dart';

class ModeSelector extends StatelessWidget {
  const ModeSelector({super.key});

  @override
  Widget build(BuildContext context) {
    final thermostat = context.watch<ThermostatProvider>();
    final activeMode = thermostat.activeZone.mode;
    final isPowerOn = thermostat.activeZone.power;

    final modes = [
      {'id': 'cool', 'label': 'Cool', 'icon': LucideIcons.snowflake, 'color': AuraTheme.modeCool},
      {'id': 'heat', 'label': 'Heat', 'icon': LucideIcons.flame, 'color': AuraTheme.modeHeat},
      {'id': 'eco', 'label': 'Eco', 'icon': LucideIcons.leaf, 'color': AuraTheme.modeEco},
      {'id': 'fan', 'label': 'Fan', 'icon': LucideIcons.fan, 'color': AuraTheme.modeFan},
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AuraTheme.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AuraTheme.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: modes.map((m) {
          final id = m['id'] as String;
          final label = m['label'] as String;
          final icon = m['icon'] as IconData;
          final color = m['color'] as Color;
          final isSelected = activeMode == id;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: InkWell(
              onTap: isPowerOn
                  ? () {
                      HapticFeedback.selectionClick();
                      thermostat.setMode(id);
                    }
                  : null,
              borderRadius: BorderRadius.circular(12),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected && isPowerOn
                      ? color.withValues(alpha: 0.15)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected && isPowerOn
                        ? color.withValues(alpha: 0.4)
                        : Colors.transparent,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      icon,
                      size: 15,
                      color: isSelected && isPowerOn ? color : AuraTheme.textSecondary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected && isPowerOn ? AuraTheme.textPrimary : AuraTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
