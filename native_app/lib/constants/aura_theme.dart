import 'package:flutter/material.dart';

/// Executive Decision Memo Dark Mode Color Palette & Typography
class AuraTheme {
  // Backgrounds
  static const Color background = Color(0xFF09090B);
  static const Color surface = Color(0xFF121215);
  static const Color cardSurface = Color(0xFF18181B);
  static const Color cardSurfaceElevated = Color(0xFF202024);

  // Accents
  static const Color primary = Color(0xFF4CD7F6);
  static const Color primaryGlow = Color(0x334CD7F6);
  static const Color primaryFixed = Color(0xFF06B6D4);

  // Borders & Dividers
  static const Color border = Color(0xFF27272A);
  static const Color borderLight = Color(0xFF3F3F46);

  // Text
  static const Color textPrimary = Color(0xFFF4F4F5);
  static const Color textSecondary = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF71717A);

  // Modes
  static const Color modeCool = Color(0xFF38BDF8);
  static const Color modeHeat = Color(0xFFFB923C);
  static const Color modeEco = Color(0xFF34D399);
  static const Color modeFan = Color(0xFFA78BFA);

  // Status
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: primaryFixed,
        surface: surface,
        error: error,
      ),
      fontFamily: 'Inter',
      useMaterial3: true,
      cardTheme: CardThemeData(
        color: cardSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: border, width: 1),
        ),
      ),
    );
  }
}
