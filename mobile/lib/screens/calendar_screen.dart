// calendar_screen.dart
import 'dart:convert';
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
  final Map<DateTime, List<String>> _events = {};

  // For TableCalendar
  CalendarFormat _calendarFormat = CalendarFormat.week;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  // Adjust these as needed for your semester
  final DateTime _startOfSemester = DateTime(2025, 1, 9);
  final DateTime _endOfSemester = DateTime(2025, 4, 30);

  String get apiUrl => dotenv.env['VITE_API_URL'] ?? '';

  @override
  void initState() {
    super.initState();

    // Ensure _focusedDay is not after _endOfSemester
    final now = DateTime.now();
    if (now.isAfter(_endOfSemester)) {
      _focusedDay = _endOfSemester;
    } else {
      _focusedDay = now;
    }

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
          // Build events for the entire semester
          _buildEventsForSemester(loaded);
        }
      } else {
        debugPrint("Error fetching classes for calendar: ${resp.statusCode} ${resp.body}");
      }
    } catch (err) {
      debugPrint("Error: $err");
    }
  }

  /// Build a map from date -> list of event titles, for each week
  /// between _startOfSemester and _endOfSemester.
  void _buildEventsForSemester(List<ClassData> classes) {
    // Clear old events
    _events.clear();

    // Monday=1, Tuesday=2, ..., Sunday=7
    final Map<String, int> dayMap = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7,
    };

    for (final cls in classes) {
      if (cls.classSchedule == null) continue;

      for (final sched in cls.classSchedule!) {
        if (sched.time == 'None') continue;
        final dayName = sched.day;
        final dayIndex = dayMap[dayName];
        if (dayIndex == null) continue;

        // Find the first occurrence of that weekday on/after _startOfSemester
        final firstOccur = _findFirstOccurrenceOfWeekday(dayIndex, _startOfSemester);
        if (firstOccur == null) continue;

        // Keep adding 7 days until we pass _endOfSemester
        DateTime current = firstOccur;
        while (!current.isAfter(_endOfSemester)) {
          final eventTitle = "${cls.className} (${cls.courseCode})\n$dayName ${sched.time}";
          final dayKey = DateTime(current.year, current.month, current.day);
          _events.putIfAbsent(dayKey, () => []);
          _events[dayKey]!.add(eventTitle);

          current = current.add(const Duration(days: 7));
        }
      }
    }

    setState(() {});
  }

  /// Finds the first occurrence of `targetWeekday` on or after [startDate].
  /// Monday=1, Tuesday=2, ... Sunday=7
  DateTime? _findFirstOccurrenceOfWeekday(int targetWeekday, DateTime startDate) {
    if (targetWeekday < 1 || targetWeekday > 7) return null;

    if (startDate.weekday == targetWeekday) {
      return startDate;
    }

    int diff = targetWeekday - startDate.weekday;
    if (diff < 0) diff += 7;
    return startDate.add(Duration(days: diff));
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
        backgroundColor: const Color.fromARGB(255, 255, 196, 0),
      ),
      body: Column(
        children: [
          TableCalendar(
            firstDay: _startOfSemester,
            lastDay: _endOfSemester,
            focusedDay: _focusedDay,
            calendarFormat: _calendarFormat,
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            eventLoader: (day) => _getEventsForDay(day),
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                _selectedDay = selectedDay;
                _focusedDay = focusedDay;
              });
            },
            onFormatChanged: (format) {
              setState(() {
                _calendarFormat = format;
              });
            },
            onPageChanged: (focusedDay) {
              // If the new page is after endOfSemester, clamp it
              if (focusedDay.isAfter(_endOfSemester)) {
                _focusedDay = _endOfSemester;
              } else {
                _focusedDay = focusedDay;
              }
            },
          ),
          const SizedBox(height: 8),
          // Display the events for the selected day
          const Divider(
          height: 1,
          thickness: 1,
          color: Colors.grey,
        ),
          Expanded(
            child: _buildEventList(),
          ),
        ],
      ),
    );
  }

  Widget _buildEventList() {
    final DateTime displayDay = _selectedDay ?? _focusedDay;
    final dayEvents = _getEventsForDay(displayDay);
    if (dayEvents.isEmpty) {
      return const Center(child: Text("No events"));
    }
    return ListView.builder(
      itemCount: dayEvents.length,
      itemBuilder: (ctx, idx) => ListTile(
        title: Text(dayEvents[idx]),
      ),
    );
  }
}