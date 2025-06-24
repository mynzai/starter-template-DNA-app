import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:material_color_utilities/material_color_utilities.dart';

class AppTheme {
  final Color primaryColor;
  final bool useMaterial3;
  
  AppTheme({
    this.primaryColor = const Color(0xFF2196F3),
    this.useMaterial3 = true,
  });
  
  // Material Design Theme
  ThemeData get lightTheme {
    final colorScheme = _generateColorScheme(Brightness.light);
    
    return ThemeData(
      useMaterial3: useMaterial3,
      colorScheme: colorScheme,
      brightness: Brightness.light,
      
      // Typography
      textTheme: _generateTextTheme(colorScheme),
      
      // App Bar
      appBarTheme: AppBarTheme(
        centerTitle: true,
        elevation: useMaterial3 ? 0 : 2,
        backgroundColor: useMaterial3 ? colorScheme.surface : colorScheme.primary,
        foregroundColor: useMaterial3 ? colorScheme.onSurface : colorScheme.onPrimary,
        surfaceTintColor: useMaterial3 ? colorScheme.surfaceTint : null,
      ),
      
      // Navigation
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colorScheme.surface,
        indicatorColor: colorScheme.secondaryContainer,
        labelTextStyle: MaterialStateProperty.all(
          TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: colorScheme.onSurface,
          ),
        ),
      ),
      
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: colorScheme.surface,
        selectedIconTheme: IconThemeData(color: colorScheme.primary),
        unselectedIconTheme: IconThemeData(color: colorScheme.onSurfaceVariant),
        selectedLabelTextStyle: TextStyle(color: colorScheme.primary),
        unselectedLabelTextStyle: TextStyle(color: colorScheme.onSurfaceVariant),
      ),
      
      // Cards and Surfaces
      cardTheme: CardTheme(
        elevation: useMaterial3 ? 1 : 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(useMaterial3 ? 12 : 8),
        ),
        color: colorScheme.surface,
      ),
      
      // Buttons
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          elevation: useMaterial3 ? 1 : 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(useMaterial3 ? 20 : 8),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),
      ),
      
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorScheme.primary,
          side: BorderSide(color: colorScheme.outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(useMaterial3 ? 20 : 8),
          ),
        ),
      ),
      
      // Input Fields
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(useMaterial3 ? 12 : 8),
        ),
        filled: true,
        fillColor: colorScheme.surfaceVariant.withOpacity(0.3),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      
      // Floating Action Button
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: colorScheme.primaryContainer,
        foregroundColor: colorScheme.onPrimaryContainer,
        shape: useMaterial3 
            ? const RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(16)),
              )
            : null,
      ),
      
      // Bottom Sheet
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colorScheme.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
      ),
      
      // Dialog
      dialogTheme: DialogTheme(
        backgroundColor: colorScheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
  
  ThemeData get darkTheme {
    final colorScheme = _generateColorScheme(Brightness.dark);
    
    return ThemeData(
      useMaterial3: useMaterial3,
      colorScheme: colorScheme,
      brightness: Brightness.dark,
      
      // Typography
      textTheme: _generateTextTheme(colorScheme),
      
      // App Bar
      appBarTheme: AppBarTheme(
        centerTitle: true,
        elevation: useMaterial3 ? 0 : 2,
        backgroundColor: useMaterial3 ? colorScheme.surface : colorScheme.primary,
        foregroundColor: useMaterial3 ? colorScheme.onSurface : colorScheme.onPrimary,
        surfaceTintColor: useMaterial3 ? colorScheme.surfaceTint : null,
      ),
      
      // Apply similar theming as light theme but with dark colors
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colorScheme.surface,
        indicatorColor: colorScheme.secondaryContainer,
      ),
      
      cardTheme: CardTheme(
        elevation: useMaterial3 ? 1 : 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(useMaterial3 ? 12 : 8),
        ),
        color: colorScheme.surface,
      ),
      
      // Continue with other theme properties...
    );
  }
  
  // Cupertino Theme for iOS/macOS
  CupertinoThemeData get cupertinoTheme {
    return CupertinoThemeData(
      primaryColor: primaryColor,
      brightness: Brightness.light,
      
      // Text Theme
      textTheme: const CupertinoTextThemeData(
        primaryColor: CupertinoColors.label,
        textStyle: TextStyle(
          fontFamily: '.SF Pro Text',
          fontSize: 17,
          color: CupertinoColors.label,
        ),
      ),
      
      // Navigation Bar
      barBackgroundColor: CupertinoColors.systemBackground,
      
      // Scaffold
      scaffoldBackgroundColor: CupertinoColors.systemBackground,
    );
  }
  
  CupertinoThemeData get cupertinoThemeDark {
    return CupertinoThemeData(
      primaryColor: primaryColor,
      brightness: Brightness.dark,
      
      textTheme: const CupertinoTextThemeData(
        primaryColor: CupertinoColors.label,
        textStyle: TextStyle(
          fontFamily: '.SF Pro Text',
          fontSize: 17,
          color: CupertinoColors.label,
        ),
      ),
      
      barBackgroundColor: CupertinoColors.systemBackground,
      scaffoldBackgroundColor: CupertinoColors.systemBackground,
    );
  }
  
  // Generate Material 3 color scheme
  ColorScheme _generateColorScheme(Brightness brightness) {
    if (useMaterial3) {
      // Use Material 3 dynamic color generation
      final corePalette = CorePalette.of(primaryColor.value);
      
      return brightness == Brightness.light
          ? ColorScheme.fromCorePalette(corePalette, brightness: brightness)
          : ColorScheme.fromCorePalette(corePalette, brightness: brightness);
    } else {
      // Use traditional Material Design 2 colors
      return ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: brightness,
      );
    }
  }
  
  // Generate text theme
  TextTheme _generateTextTheme(ColorScheme colorScheme) {
    return TextTheme(
      displayLarge: TextStyle(
        fontSize: 57,
        fontWeight: FontWeight.w400,
        letterSpacing: -0.25,
        color: colorScheme.onSurface,
      ),
      displayMedium: TextStyle(
        fontSize: 45,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      displaySmall: TextStyle(
        fontSize: 36,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      headlineLarge: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      headlineMedium: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      headlineSmall: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      titleLarge: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w500,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.15,
        color: colorScheme.onSurface,
      ),
      titleSmall: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.1,
        color: colorScheme.onSurface,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.5,
        color: colorScheme.onSurface,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.25,
        color: colorScheme.onSurface,
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.4,
        color: colorScheme.onSurfaceVariant,
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.1,
        color: colorScheme.onSurface,
      ),
      labelMedium: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.5,
        color: colorScheme.onSurface,
      ),
      labelSmall: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.5,
        color: colorScheme.onSurfaceVariant,
      ),
    );
  }
}

// Predefined color schemes
class AppColors {
  // Material 3 color tokens
  static const Color blue = Color(0xFF2196F3);
  static const Color green = Color(0xFF4CAF50);
  static const Color orange = Color(0xFFFF9800);
  static const Color red = Color(0xFFF44336);
  static const Color purple = Color(0xFF9C27B0);
  static const Color teal = Color(0xFF009688);
  
  // Neutral colors
  static const Color neutral10 = Color(0xFF1A1C1E);
  static const Color neutral20 = Color(0xFF2E3133);
  static const Color neutral90 = Color(0xFFE0E3E6);
  static const Color neutral95 = Color(0xFFEEF1F4);
  static const Color neutral99 = Color(0xFFFAFBFF);
}

// Theme extensions for custom properties
@immutable
class CustomColors extends ThemeExtension<CustomColors> {
  final Color success;
  final Color warning;
  final Color info;
  final Color cardBorder;
  final Color divider;
  
  const CustomColors({
    required this.success,
    required this.warning,
    required this.info,
    required this.cardBorder,
    required this.divider,
  });
  
  @override
  CustomColors copyWith({
    Color? success,
    Color? warning,
    Color? info,
    Color? cardBorder,
    Color? divider,
  }) {
    return CustomColors(
      success: success ?? this.success,
      warning: warning ?? this.warning,
      info: info ?? this.info,
      cardBorder: cardBorder ?? this.cardBorder,
      divider: divider ?? this.divider,
    );
  }
  
  @override
  CustomColors lerp(CustomColors? other, double t) {
    if (other is! CustomColors) {
      return this;
    }
    return CustomColors(
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      info: Color.lerp(info, other.info, t)!,
      cardBorder: Color.lerp(cardBorder, other.cardBorder, t)!,
      divider: Color.lerp(divider, other.divider, t)!,
    );
  }
}