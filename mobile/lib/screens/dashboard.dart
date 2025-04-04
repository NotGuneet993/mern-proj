// dashboard_screen.dart

import 'package:flutter/material.dart';
import 'schedule_screen.dart';
import 'calendar_screen.dart';
import 'graph_map.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  // We have three pages: the new ScheduleScreen, the new CalendarScreen, and the existing GraphMap.
  final List<Widget> _pages = [
    const ScheduleScreen(),
    const CalendarScreen(),
    const GraphMap(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex], // Show the selected page
      bottomNavigationBar: SafeArea(
        child: BottomAppBar(
          height: 44, // adjust as needed
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              // Schedule
              GestureDetector(
                onTap: () => setState(() => _currentIndex = 0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.list,
                        size: 20,
                        color: _currentIndex == 0 ? Colors.blue : Colors.grey),
                  ],
                ),
              ),
              // Calendar
              GestureDetector(
                onTap: () => setState(() => _currentIndex = 1),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.calendar_today,
                        size: 20,
                        color: _currentIndex == 1 ? Colors.blue : Colors.grey),
                  ],
                ),
              ),
              // Map
              GestureDetector(
                onTap: () => setState(() => _currentIndex = 2),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.map,
                        size: 20,
                        color: _currentIndex == 2 ? Colors.blue : Colors.grey),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}