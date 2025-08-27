import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../platform/platform_detector.dart';
import '../providers/app_providers.dart';

// Adaptive Button
class AdaptiveButton extends ConsumerWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final ButtonStyle? style;
  final AppPlatform? platform;
  
  const AdaptiveButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.style,
    this.platform,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentPlatform = platform ?? ref.watch(currentPlatformProvider);
    
    if (currentPlatform.isApple) {
      return CupertinoButton(
        onPressed: onPressed,
        child: child,
      );
    } else {
      return ElevatedButton(
        onPressed: onPressed,
        style: style,
        child: child,
      );
    }
  }
}

// Adaptive App Bar
class AdaptiveAppBar extends ConsumerWidget implements PreferredSizeWidget {
  final Widget? title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool automaticallyImplyLeading;
  
  const AdaptiveAppBar({
    super.key,
    this.title,
    this.actions,
    this.leading,
    this.automaticallyImplyLeading = true,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoNavigationBar(
        middle: title,
        trailing: actions != null && actions!.isNotEmpty 
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: actions!,
              )
            : null,
        leading: leading,
        automaticallyImplyLeading: automaticallyImplyLeading,
      );
    } else {
      return AppBar(
        title: title,
        actions: actions,
        leading: leading,
        automaticallyImplyLeading: automaticallyImplyLeading,
      );
    }
  }
  
  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

// Adaptive Bottom Navigation Bar
class AdaptiveBottomNavigationBar extends ConsumerWidget {
  final int currentIndex;
  final ValueChanged<int>? onTap;
  final List<BottomNavigationBarItem> items;
  
  const AdaptiveBottomNavigationBar({
    super.key,
    this.currentIndex = 0,
    this.onTap,
    required this.items,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoTabBar(
        currentIndex: currentIndex,
        onTap: onTap,
        items: items,
      );
    } else {
      return NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: onTap,
        destinations: items.map((item) {
          return NavigationDestination(
            icon: item.icon,
            label: item.label ?? '',
            selectedIcon: item.activeIcon,
          );
        }).toList(),
      );
    }
  }
}

// Adaptive Cupertino Tab Bar
class AdaptiveCupertinoTabBar extends ConsumerWidget {
  final int currentIndex;
  final ValueChanged<int>? onTap;
  final List<BottomNavigationBarItem> items;
  
  const AdaptiveCupertinoTabBar({
    super.key,
    this.currentIndex = 0,
    this.onTap,
    this.items = const [
      BottomNavigationBarItem(
        icon: Icon(CupertinoIcons.home),
        label: 'Home',
      ),
      BottomNavigationBarItem(
        icon: Icon(CupertinoIcons.settings),
        label: 'Settings',
      ),
    ],
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CupertinoTabBar(
      currentIndex: currentIndex,
      onTap: onTap,
      items: items,
    );
  }
}

// Adaptive Navigation Rail
class AdaptiveNavigationRail extends ConsumerWidget {
  final bool extended;
  final int selectedIndex;
  final ValueChanged<int>? onDestinationSelected;
  final List<NavigationRailDestination> destinations;
  
  const AdaptiveNavigationRail({
    super.key,
    this.extended = true,
    this.selectedIndex = 0,
    this.onDestinationSelected,
    this.destinations = const [
      NavigationRailDestination(
        icon: Icon(Icons.home),
        label: Text('Home'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.settings),
        label: Text('Settings'),
      ),
    ],
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    return NavigationRail(
      extended: extended,
      selectedIndex: selectedIndex,
      onDestinationSelected: onDestinationSelected,
      destinations: destinations,
      backgroundColor: platform.isApple 
          ? CupertinoColors.systemBackground
          : Theme.of(context).colorScheme.surface,
    );
  }
}

// Adaptive Switch
class AdaptiveSwitch extends ConsumerWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;
  final Color? activeColor;
  
  const AdaptiveSwitch({
    super.key,
    required this.value,
    this.onChanged,
    this.activeColor,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoSwitch(
        value: value,
        onChanged: onChanged,
        activeColor: activeColor,
      );
    } else {
      return Switch(
        value: value,
        onChanged: onChanged,
        activeColor: activeColor,
      );
    }
  }
}

// Adaptive Slider
class AdaptiveSlider extends ConsumerWidget {
  final double value;
  final ValueChanged<double>? onChanged;
  final double min;
  final double max;
  final int? divisions;
  
  const AdaptiveSlider({
    super.key,
    required this.value,
    this.onChanged,
    this.min = 0.0,
    this.max = 1.0,
    this.divisions,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoSlider(
        value: value,
        onChanged: onChanged,
        min: min,
        max: max,
        divisions: divisions,
      );
    } else {
      return Slider(
        value: value,
        onChanged: onChanged,
        min: min,
        max: max,
        divisions: divisions,
      );
    }
  }
}

// Adaptive Text Field
class AdaptiveTextField extends ConsumerWidget {
  final TextEditingController? controller;
  final String? placeholder;
  final String? labelText;
  final bool obscureText;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onTap;
  final bool readOnly;
  final Widget? prefix;
  final Widget? suffix;
  
  const AdaptiveTextField({
    super.key,
    this.controller,
    this.placeholder,
    this.labelText,
    this.obscureText = false,
    this.keyboardType,
    this.onChanged,
    this.onTap,
    this.readOnly = false,
    this.prefix,
    this.suffix,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoTextField(
        controller: controller,
        placeholder: placeholder ?? labelText,
        obscureText: obscureText,
        keyboardType: keyboardType,
        onChanged: onChanged,
        onTap: onTap,
        readOnly: readOnly,
        prefix: prefix,
        suffix: suffix,
        decoration: BoxDecoration(
          border: Border.all(
            color: CupertinoColors.systemGrey4,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.all(12),
      );
    } else {
      return TextField(
        controller: controller,
        decoration: InputDecoration(
          labelText: labelText,
          hintText: placeholder,
          prefixIcon: prefix,
          suffixIcon: suffix,
        ),
        obscureText: obscureText,
        keyboardType: keyboardType,
        onChanged: onChanged,
        onTap: onTap,
        readOnly: readOnly,
      );
    }
  }
}

// Adaptive Dialog
class AdaptiveDialog extends ConsumerWidget {
  final String? title;
  final Widget? content;
  final List<Widget>? actions;
  
  const AdaptiveDialog({
    super.key,
    this.title,
    this.content,
    this.actions,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoAlertDialog(
        title: title != null ? Text(title!) : null,
        content: content,
        actions: actions ?? [],
      );
    } else {
      return AlertDialog(
        title: title != null ? Text(title!) : null,
        content: content,
        actions: actions,
      );
    }
  }
  
  static Future<T?> show<T>({
    required BuildContext context,
    required WidgetRef ref,
    String? title,
    Widget? content,
    List<Widget>? actions,
  }) {
    final platform = ref.read(currentPlatformProvider);
    
    if (platform.isApple) {
      return showCupertinoDialog<T>(
        context: context,
        builder: (context) => AdaptiveDialog(
          title: title,
          content: content,
          actions: actions,
        ),
      );
    } else {
      return showDialog<T>(
        context: context,
        builder: (context) => AdaptiveDialog(
          title: title,
          content: content,
          actions: actions,
        ),
      );
    }
  }
}

// Adaptive Loading Indicator
class AdaptiveLoadingIndicator extends ConsumerWidget {
  final double? value;
  final Color? color;
  final double radius;
  
  const AdaptiveLoadingIndicator({
    super.key,
    this.value,
    this.color,
    this.radius = 10.0,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoActivityIndicator(
        color: color,
        radius: radius,
      );
    } else {
      return CircularProgressIndicator(
        value: value,
        color: color,
      );
    }
  }
}

// Adaptive List Tile
class AdaptiveListTile extends ConsumerWidget {
  final Widget? leading;
  final Widget? title;
  final Widget? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool isThreeLine;
  
  const AdaptiveListTile({
    super.key,
    this.leading,
    this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.isThreeLine = false,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoListTile(
        leading: leading,
        title: title ?? const SizedBox.shrink(),
        subtitle: subtitle,
        trailing: trailing,
        onTap: onTap,
      );
    } else {
      return ListTile(
        leading: leading,
        title: title,
        subtitle: subtitle,
        trailing: trailing,
        onTap: onTap,
        isThreeLine: isThreeLine,
      );
    }
  }
}

// Adaptive Card
class AdaptiveCard extends ConsumerWidget {
  final Widget child;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final double? elevation;
  
  const AdaptiveCard({
    super.key,
    required this.child,
    this.margin,
    this.padding,
    this.color,
    this.elevation,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return Container(
        margin: margin,
        padding: padding ?? const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color ?? CupertinoColors.systemBackground,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: CupertinoColors.systemGrey5,
            width: 0.5,
          ),
        ),
        child: child,
      );
    } else {
      return Card(
        margin: margin,
        color: color,
        elevation: elevation,
        child: Padding(
          padding: padding ?? const EdgeInsets.all(16),
          child: child,
        ),
      );
    }
  }
}

// Adaptive Icon Button
class AdaptiveIconButton extends ConsumerWidget {
  final VoidCallback? onPressed;
  final Widget icon;
  final String? tooltip;
  final double? iconSize;
  
  const AdaptiveIconButton({
    super.key,
    this.onPressed,
    required this.icon,
    this.tooltip,
    this.iconSize,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoButton(
        onPressed: onPressed,
        padding: EdgeInsets.zero,
        minSize: iconSize ?? 24,
        child: icon,
      );
    } else {
      return IconButton(
        onPressed: onPressed,
        icon: icon,
        tooltip: tooltip,
        iconSize: iconSize,
      );
    }
  }
}