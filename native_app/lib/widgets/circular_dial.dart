import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';
import '../constants/aura_theme.dart';
import '../providers/thermostat_provider.dart';

class CircularDial extends StatefulWidget {
  const CircularDial({super.key});

  @override
  State<CircularDial> createState() => _CircularDialState();
}

class _CircularDialState extends State<CircularDial> {
  // Angle sweep range: starts at 135° (bottom left) to 405° (bottom right) => 270° total
  static const double startAngle = 135 * (math.pi / 180);
  static const double sweepAngle = 270 * (math.pi / 180);

  // Temp boundaries in F
  static const double minTempF = 60.0;
  static const double maxTempF = 85.0;

  // Temp boundaries in C
  static const double minTempC = 16.0;
  static const double maxTempC = 30.0;

  void _handlePanUpdate(Offset localPos, Size size, ThermostatProvider thermostat) {
    if (!thermostat.activeZone.power) return;

    final center = Offset(size.width / 2, size.height / 2);
    final dx = localPos.dx - center.dx;
    final dy = localPos.dy - center.dy;

    double touchAngle = math.atan2(dy, dx);
    if (touchAngle < 0) touchAngle += 2 * math.pi;

    // Normalize touch angle relative to startAngle
    double normalized = touchAngle - startAngle;
    if (normalized < 0) normalized += 2 * math.pi;

    if (normalized <= sweepAngle) {
      final ratio = (normalized / sweepAngle).clamp(0.0, 1.0);
      final double targetSetpointF;
      if (thermostat.unit == 'C') {
        final newTempC = minTempC + ratio * (maxTempC - minTempC);
        // Dial only goes in +-0.5 increments
        final roundedC = (newTempC * 2).roundToDouble() / 2;
        targetSetpointF = (roundedC * 9 / 5) + 32;
      } else {
        final newTempF = minTempF + ratio * (maxTempF - minTempF);
        // Dial only goes in +-0.5 increments
        final roundedF = (newTempF * 2).roundToDouble() / 2;
        targetSetpointF = roundedF;
      }

      if ((targetSetpointF - thermostat.activeZone.setpoint).abs() > 0.05) {
        HapticFeedback.selectionClick();
        thermostat.setSetpoint(targetSetpointF);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final thermostat = context.watch<ThermostatProvider>();
    final activeZone = thermostat.activeZone;
    final isPowerOn = activeZone.power;

    return LayoutBuilder(
      builder: (context, constraints) {
        final dialSize = math.min(constraints.maxWidth * 0.78, 280.0).clamp(220.0, 300.0);

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Dial Canvas with Gesture Detector
            GestureDetector(
              onPanUpdate: (details) =>
                  _handlePanUpdate(details.localPosition, Size(dialSize, dialSize), thermostat),
              child: SizedBox(
                width: dialSize,
                height: dialSize,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Ambient radial glow behind the dial
                    if (isPowerOn)
                      Container(
                        width: dialSize * 0.8,
                        height: dialSize * 0.8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AuraTheme.primary.withOpacity(0.12),
                              blurRadius: 40,
                              spreadRadius: 10,
                            ),
                          ],
                        ),
                      ),

                    // Custom Painter for track and active arc
                    CustomPaint(
                      size: Size(dialSize, dialSize),
                      painter: _DialPainter(
                        setpointF: activeZone.setpoint,
                        currentTempF: activeZone.temp,
                        isPowerOn: isPowerOn,
                        unit: thermostat.unit,
                      ),
                    ),

                    // Center Readings
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Room Temp Label
                        Text(
                          isPowerOn ? 'ACTUAL TEMP' : 'SYSTEM STANDBY',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.5,
                            color: isPowerOn ? AuraTheme.textSecondary : AuraTheme.textMuted,
                          ),
                        ),
                        const SizedBox(height: 4),

                        // Prominent Hero Actual Room Temperature Readout
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                thermostat.formatTemperature(activeZone.temp),
                                style: TextStyle(
                                  fontSize: 48,
                                  fontWeight: FontWeight.w800,
                                  color: isPowerOn ? AuraTheme.textPrimary : AuraTheme.textMuted,
                                  letterSpacing: -1.5,
                                  height: 1.0,
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.only(top: 2, left: 2),
                                child: Text(
                                  '°${thermostat.unit}',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: isPowerOn ? AuraTheme.primary : AuraTheme.textMuted,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Target Setpoint Indicator Capsule
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: AuraTheme.cardSurfaceElevated,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: AuraTheme.border,
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.sliders_horizontal,
                                  size: 13,
                                  color: isPowerOn ? AuraTheme.primary : AuraTheme.textMuted,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'SET: ',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                    color: isPowerOn ? AuraTheme.textSecondary : AuraTheme.textMuted,
                                  ),
                                ),
                                Text(
                                  '${thermostat.formatTemperature(activeZone.setpoint)}°',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: isPowerOn ? AuraTheme.primary : AuraTheme.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Stepper Buttons (- / +)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _StepButton(
                  icon: LucideIcons.minus,
                  enabled: isPowerOn,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    thermostat.adjustSetpoint(-0.5);
                  },
                ),
                const SizedBox(width: 24),
                _StepButton(
                  icon: LucideIcons.plus,
                  enabled: isPowerOn,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    thermostat.adjustSetpoint(0.5);
                  },
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _StepButton extends StatelessWidget {
  final IconData icon;
  final bool enabled;
  final VoidCallback onPressed;

  const _StepButton({
    required this.icon,
    required this.enabled,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onPressed : null,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: enabled ? AuraTheme.cardSurface : AuraTheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: enabled ? AuraTheme.border : AuraTheme.border.withOpacity(0.4),
          ),
        ),
        child: Center(
          child: Icon(
            icon,
            size: 18,
            color: enabled ? AuraTheme.textPrimary : AuraTheme.textMuted,
          ),
        ),
      ),
    );
  }
}

class _DialPainter extends CustomPainter {
  final double setpointF;
  final double currentTempF;
  final bool isPowerOn;
  final String unit;

  _DialPainter({
    required this.setpointF,
    required this.currentTempF,
    required this.isPowerOn,
    this.unit = 'F',
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - 22;

    const startAngle = 135 * (math.pi / 180);
    const sweepAngle = 270 * (math.pi / 180);

    // 1. Background Arc Track
    final trackPaint = Paint()
      ..color = AuraTheme.border.withOpacity(0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      trackPaint,
    );

    if (!isPowerOn) return;

    // 2. Active Setpoint Progress Arc
    final double setpointRatio;
    if (unit == 'C') {
      final setpointC = ((setpointF - 32) * 5) / 9;
      setpointRatio = ((setpointC - 16.0) / (30.0 - 16.0)).clamp(0.0, 1.0);
    } else {
      setpointRatio = ((setpointF - 60.0) / (85.0 - 60.0)).clamp(0.0, 1.0);
    }
    final activeSweep = sweepAngle * setpointRatio;

    final activePaint = Paint()
      ..shader = const SweepGradient(
        startAngle: startAngle,
        endAngle: startAngle + sweepAngle,
        colors: [Color(0xFF06B6D4), Color(0xFF4CD7F6)],
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      activeSweep,
      false,
      activePaint,
    );

    // 3. Thumb Handle Indicator
    final thumbAngle = startAngle + activeSweep;
    final thumbCenter = Offset(
      center.dx + radius * math.cos(thumbAngle),
      center.dy + radius * math.sin(thumbAngle),
    );

    // Thumb outer ring
    final thumbOuterPaint = Paint()
      ..color = AuraTheme.background
      ..style = PaintingStyle.fill;
    canvas.drawCircle(thumbCenter, 10, thumbOuterPaint);

    // Thumb inner dot
    final thumbInnerPaint = Paint()
      ..color = AuraTheme.primary
      ..style = PaintingStyle.fill;
    canvas.drawCircle(thumbCenter, 6, thumbInnerPaint);
  }

  @override
  bool shouldRepaint(covariant _DialPainter oldDelegate) {
    return oldDelegate.setpointF != setpointF ||
        oldDelegate.currentTempF != currentTempF ||
        oldDelegate.isPowerOn != isPowerOn ||
        oldDelegate.unit != unit;
  }
}
