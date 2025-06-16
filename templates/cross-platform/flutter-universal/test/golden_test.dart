import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:golden_toolkit/golden_toolkit.dart';

import 'package:flutter_universal_suite/core/app.dart';
import 'package:flutter_universal_suite/core/theme/app_theme.dart';
import 'package:flutter_universal_suite/core/providers/app_providers.dart';
import 'package:flutter_universal_suite/core/widgets/adaptive_widgets.dart';

void main() {
  group('Golden Tests', () {
    setUpAll(() async {
      // Load fonts for golden tests
      await loadAppFonts();
    });
    
    group('Theme Golden Tests', () {
      testGoldens('Material Light Theme Components', (tester) async {
        final builder = GoldenBuilder.grid(columns: 2, widthToHeightRatio: 1.5)
          ..addScenario(
            'Elevated Button',
            ElevatedButton(
              onPressed: () {},
              child: const Text('Button'),
            ),
          )
          ..addScenario(
            'Filled Button',
            FilledButton(
              onPressed: () {},
              child: const Text('Filled'),
            ),
          )
          ..addScenario(
            'Outlined Button',
            OutlinedButton(
              onPressed: () {},
              child: const Text('Outlined'),
            ),
          )
          ..addScenario(
            'Text Button',
            TextButton(
              onPressed: () {},
              child: const Text('Text'),
            ),
          )
          ..addScenario(
            'Card',
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Text('Card Content'),
              ),
            ),
          )
          ..addScenario(
            'Text Field',
            const TextField(
              decoration: InputDecoration(
                labelText: 'Label',
                hintText: 'Hint text',
              ),
            ),
          );
        
        await tester.pumpWidgetBuilder(
          builder.build(),
          wrapper: materialAppWrapper(
            theme: AppTheme().lightTheme,
          ),
        );
        
        await screenMatchesGolden(tester, 'material_light_components');
      });
      
      testGoldens('Material Dark Theme Components', (tester) async {
        final builder = GoldenBuilder.grid(columns: 2, widthToHeightRatio: 1.5)
          ..addScenario(
            'Elevated Button',
            ElevatedButton(
              onPressed: () {},
              child: const Text('Button'),
            ),
          )
          ..addScenario(
            'Filled Button',
            FilledButton(
              onPressed: () {},
              child: const Text('Filled'),
            ),
          )
          ..addScenario(
            'Outlined Button',
            OutlinedButton(
              onPressed: () {},
              child: const Text('Outlined'),
            ),
          )
          ..addScenario(
            'Text Button',
            TextButton(
              onPressed: () {},
              child: const Text('Text'),
            ),
          )
          ..addScenario(
            'Card',
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Text('Card Content'),
              ),
            ),
          )
          ..addScenario(
            'Text Field',
            const TextField(
              decoration: InputDecoration(
                labelText: 'Label',
                hintText: 'Hint text',
              ),
            ),
          );
        
        await tester.pumpWidgetBuilder(
          builder.build(),
          wrapper: materialAppWrapper(
            theme: AppTheme().darkTheme,
          ),
        );
        
        await screenMatchesGolden(tester, 'material_dark_components');
      });
      
      testGoldens('Material 3 vs Material 2 Comparison', (tester) async {
        final builder = GoldenBuilder.grid(columns: 2, widthToHeightRatio: 1)
          ..addScenario(
            'Material 3',
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ElevatedButton(onPressed: () {}, child: const Text('M3 Button')),
                const SizedBox(height: 8),
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text('M3 Card'),
                  ),
                ),
              ],
            ),
          )
          ..addScenario(
            'Material 2',
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ElevatedButton(onPressed: () {}, child: const Text('M2 Button')),
                const SizedBox(height: 8),
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text('M2 Card'),
                  ),
                ),
              ],
            ),
          );
        
        await tester.pumpWidgetBuilder(
          builder.build(),
          wrapper: (child) => GoldenBuilder.grid(columns: 2, widthToHeightRatio: 1)
            ..addScenario(
              'Material 3',
              MaterialApp(
                theme: AppTheme(useMaterial3: true).lightTheme,
                home: Scaffold(body: Center(child: child)),
              ),
            )
            ..addScenario(
              'Material 2',
              MaterialApp(
                theme: AppTheme(useMaterial3: false).lightTheme,
                home: Scaffold(body: Center(child: child)),
              ),
            )
            ..build(),
        );
        
        await screenMatchesGolden(tester, 'material_3_vs_2_comparison');
      });
    });
    
    group('Adaptive UI Golden Tests', () {
      testGoldens('Adaptive Buttons Across Platforms', (tester) async {
        final builder = GoldenBuilder.grid(columns: 3, widthToHeightRatio: 1)
          ..addScenario(
            'Material Button',
            AdaptiveButton(
              onPressed: () {},
              platform: AppPlatform.android,
              child: const Text('Material'),
            ),
          )
          ..addScenario(
            'Cupertino Button',
            AdaptiveButton(
              onPressed: () {},
              platform: AppPlatform.ios,
              child: const Text('Cupertino'),
            ),
          )
          ..addScenario(
            'Web Button',
            AdaptiveButton(
              onPressed: () {},
              platform: AppPlatform.web,
              child: const Text('Web'),
            ),
          );
        
        await tester.pumpWidgetBuilder(
          builder.build(),
          wrapper: materialAppWrapper(),
        );
        
        await screenMatchesGolden(tester, 'adaptive_buttons');
      });
      
      testGoldens('Navigation Patterns', (tester) async {
        final builder = GoldenBuilder.grid(columns: 2, widthToHeightRatio: 0.7)
          ..addScenario(
            'Mobile Navigation',
            SizedBox(
              height: 400,
              child: Scaffold(
                body: const Center(child: Text('Content')),
                bottomNavigationBar: BottomNavigationBar(
                  items: const [
                    BottomNavigationBarItem(
                      icon: Icon(Icons.home),
                      label: 'Home',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.settings),
                      label: 'Settings',
                    ),
                  ],
                ),
              ),
            ),
          )
          ..addScenario(
            'Desktop Navigation',
            SizedBox(
              height: 400,
              child: Scaffold(
                body: Row(
                  children: [
                    NavigationRail(
                      destinations: const [
                        NavigationRailDestination(
                          icon: Icon(Icons.home),
                          label: Text('Home'),
                        ),
                        NavigationRailDestination(
                          icon: Icon(Icons.settings),
                          label: Text('Settings'),
                        ),
                      ],
                      selectedIndex: 0,
                    ),
                    const Expanded(
                      child: Center(child: Text('Content')),
                    ),
                  ],
                ),
              ),
            ),
          );
        
        await tester.pumpWidgetBuilder(
          builder.build(),
          wrapper: materialAppWrapper(),
        );
        
        await screenMatchesGolden(tester, 'navigation_patterns');
      });
    });
    
    group('Color Scheme Golden Tests', () {
      testGoldens('Color Palette Variations', (tester) async {
        final colors = [
          AppColors.blue,
          AppColors.green,
          AppColors.orange,
          AppColors.red,
          AppColors.purple,
          AppColors.teal,
        ];
        
        final builder = GoldenBuilder.grid(columns: 3, widthToHeightRatio: 1.5);
        
        for (final color in colors) {
          builder.addScenario(
            'Color ${color.value.toRadixString(16)}',
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  '#${color.value.toRadixString(16).substring(2).toUpperCase()}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          );
        }
        
        await tester.pumpWidgetBuilder(
          builder.build(),
          wrapper: materialAppWrapper(),
        );
        
        await screenMatchesGolden(tester, 'color_palette');
      });
    });
    
    group('Typography Golden Tests', () {
      testGoldens('Text Styles', (tester) async {
        final builder = GoldenBuilder.column()
          ..addScenario(
            'Display Large',
            Text(
              'Display Large',
              style: AppTheme().lightTheme.textTheme.displayLarge,
            ),
          )
          ..addScenario(
            'Headline Large',
            Text(
              'Headline Large',
              style: AppTheme().lightTheme.textTheme.headlineLarge,
            ),
          )
          ..addScenario(
            'Title Large',
            Text(
              'Title Large',
              style: AppTheme().lightTheme.textTheme.titleLarge,
            ),
          )
          ..addScenario(
            'Body Large',
            Text(
              'Body Large',
              style: AppTheme().lightTheme.textTheme.bodyLarge,
            ),
          )
          ..addScenario(
            'Body Medium',
            Text(
              'Body Medium',
              style: AppTheme().lightTheme.textTheme.bodyMedium,
            ),
          )
          ..addScenario(
            'Label Large',
            Text(
              'Label Large',
              style: AppTheme().lightTheme.textTheme.labelLarge,
            ),
          );
        
        await tester.pumpWidgetBuilder(
          builder.build(),
          wrapper: materialAppWrapper(
            theme: AppTheme().lightTheme,
          ),
        );
        
        await screenMatchesGolden(tester, 'typography_styles');
      });
    });
    
    group('Responsive Layout Golden Tests', () {
      testGoldens('Responsive Breakpoints', (tester) async {
        final builder = GoldenBuilder.grid(columns: 3, widthToHeightRatio: 0.6);
        
        final breakpoints = [
          (320, 'Mobile'),
          (768, 'Tablet'),
          (1024, 'Desktop'),
        ];
        
        for (final (width, label) in breakpoints) {
          builder.addScenario(
            '$label ${width}px',
            SizedBox(
              width: width.toDouble(),
              height: 400,
              child: AdaptiveScaffold(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('$label Layout'),
                      Text('${width}px wide'),
                    ],
                  ),
                ),
              ),
            ),
          );
        }
        
        await tester.pumpWidgetBuilder(
          builder.build(),
          wrapper: materialAppWrapper(),
        );
        
        await screenMatchesGolden(tester, 'responsive_breakpoints');
      });
    });
  });
}