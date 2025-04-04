// calendar_screen.dart
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mobile/globals.dart' as globals;
import 'schedule_screen.dart';
import 'package:table_calendar/table_calendar.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  // We'll store classes in memory
  List<ClassData> _classes = [];
  // A map from DateTime -> list of strings (event titles)
  Map<DateTime, List<String>> _events = {};

  CalendarFormat _calendarFormat = CalendarFormat.week;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  String get apiUrl => dotenv.env['VITE_API_URL'] ?? '';

  @override
  void initState() {
    super.initState();
    _fetchClasses();
  }

  Future<void> _fetchClasses() async {
    final username = globals.currentUser;
    if (username == null) {
      return;
    }
    try {
      final url = Uri.parse('$apiUrl/api/users/classes?username=$username');
      final resp = await http.get(url, headers: {'Content-Type': 'application/json'});
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        if (data is List) {
          final loaded = data.map((e) => ClassData.fromJson(e)).toList();
          setState(() {
            _classes = loaded;
          });
          // Build events
          _buildEventsForWeek(loaded);
        }
      } else {
        print("Error fetching classes for calendar: ${resp.statusCode} ${resp.body}");
      }
    } catch (err) {
      print("Error: $err");
    }
  }

  /// Build a map from date -> list of event titles. We'll pick the "current or next 7 days"
  /// repeated weekly logic. This is a simple approach: we’ll map each day name to a date
  /// in the current week, then store events for that day.
  void _buildEventsForWeek(List<ClassData> classes) {
    // Clear old events
    _events.clear();

    // We find the date for each day of the week
    // Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=7
    // Or use Sunday=0 approach. We can adapt.
    // We'll do Monday=1... Sunday=7 approach:
    Map<String, int> dayMap = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7
    };

    // We'll find the start of the current week (Monday), then add dayMap[dayName]-1
    // Or adapt to your preference if Sunday is the first day.
    DateTime now = DateTime.now();
    // get the most recent Monday
    DateTime monday = now.subtract(Duration(days: now.weekday - 1));
    // If your definition of Monday is different, adjust.

    for (final cls in classes) {
      if (cls.classSchedule == null) continue;
      for (final sched in cls.classSchedule!) {
        if (sched.time == 'None') continue;

        final dayName = sched.day; // e.g. "Monday"
        final dayIndex = dayMap[dayName];
        if (dayIndex == null) continue;

        // The day of that schedule in the current week
        final dateForDay = monday.add(Duration(days: dayIndex - 1));

        // We could parse the startTime, endTime for a more advanced approach,
        // but for display we'll just show them as text.
        final eventTitle =
            "${cls.className} (${cls.courseCode})\n$dayName ${sched.time}";

        // Put it in the _events map
        final dayKey = DateTime(dateForDay.year, dateForDay.month, dateForDay.day);
        _events.putIfAbsent(dayKey, () => []);
        _events[dayKey]!.add(eventTitle);
      }
    }
    setState(() {});
  }

  List<String> _getEventsForDay(DateTime day) {
    final key = DateTime(day.year, day.month, day.day);
    return _events[key] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Calendar View"),
        backgroundColor: const Color.fromARGB(255, 236, 220, 39),
      ),
      body: Column(
        children: [
          TableCalendar(
            firstDay: DateTime.now().subtract(const Duration(days: 365)),
            lastDay: DateTime.now().add(const Duration(days: 365)),
            focusedDay: _focusedDay,
            calendarFormat: _calendarFormat,
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            eventLoader: (day) {
              return _getEventsForDay(day);
            },
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                _selectedDay = selectedDay;
                _focusedDay = focusedDay; // update focused day
              });
            },
            onFormatChanged: (format) {
              setState(() {
                _calendarFormat = format;
              });
            },
            onPageChanged: (focusedDay) {
              _focusedDay = focusedDay;
            },
          ),
          const SizedBox(height: 8),
          // Display the events for the selected day
          Expanded(
            child: _buildEventList(),
          ),
        ],
      ),
    );
  }

  Widget _buildEventList() {
    final dayEvents = _selectedDay == null ? [] : _getEventsForDay(_selectedDay!);

    if (dayEvents.isEmpty) {
      return const Center(
        child: Text("No events"),
      );
    }
    return ListView.builder(
      itemCount: dayEvents.length,
      itemBuilder: (ctx, idx) {
        return ListTile(
          title: Text(dayEvents[idx]),
        );
      },
    );
  }
}