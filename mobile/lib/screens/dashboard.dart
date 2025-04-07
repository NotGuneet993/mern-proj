// dashboard_screen.dart

import 'package:flutter/material.dart';
import 'schedule_screen.dart';
import 'calendar_screen.dart';
import 'graph_map.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 2;

  final List<Widget> _pages = [
    const ScheduleScreen(),
    const CalendarScreen(),
    const GraphMap(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomAppBar(
        color: Colors.white,
        // Give enough height that 48x48 IconButtons won't overflow
        height: 56,
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              // Map
              IconButton(
                icon: Icon(
                  Icons.map,
                  color: _currentIndex == 2 ? Colors.blue : Colors.grey,
                ),
                // The icon will stay 24px, but the button
                // constraints guarantee a 48x48 hitbox.
                iconSize: 24,
                padding: EdgeInsets.zero,
                alignment: Alignment.center,
                constraints: const BoxConstraints(
                  minWidth: 96,
                  minHeight: 48,
                ),
                onPressed: () => setState(() => _currentIndex = 2),
              ),

              // Schedule
              IconButton(
                icon: Icon(
                  Icons.list,
                  color: _currentIndex == 0 ? Colors.blue : Colors.grey,
                ),
                iconSize: 24,
                padding: EdgeInsets.zero,
                alignment: Alignment.center,
                constraints: const BoxConstraints(
                  minWidth: 96,
                  minHeight: 48,
                ),
                onPressed: () => setState(() => _currentIndex = 0),
              ),

              // Calendar
              IconButton(
                icon: Icon(
                  Icons.calendar_today,
                  color: _currentIndex == 1 ? Colors.blue : Colors.grey,
                ),
                iconSize: 24,
                padding: EdgeInsets.zero,
                alignment: Alignment.center,
                constraints: const BoxConstraints(
                  minWidth: 96,
                  minHeight: 48,
                ),
                onPressed: () => setState(() => _currentIndex = 1),
              ),
            ],
          ),
        ),
      ),
    );
  }
}