import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'add_class_dialog.dart';
import 'search_class_dialog.dart';
import 'package:mobile/globals.dart' as globals;
import 'package:table_calendar/table_calendar.dart';
import 'package:mobile/screens/loginScreen.dart';

/// Represents a single day's schedule info, e.g. "Monday 8:00 AM-9:00 AM" or "None".
class ClassSchedule {
  final String day;
  final String time;

  ClassSchedule({required this.day, required this.time});

  factory ClassSchedule.fromJson(Map<String, dynamic> json) {
    return ClassSchedule(
      day: json['day'] as String,
      time: json['time'] as String,
    );
  }
}

/// Represents one class entry (as returned by your backend).
class ClassData {
  final String? id;
  final String courseCode;
  final String className;
  final String professor;
  final String meetingType; // in-person, mixed-mode, etc.
  final String type; // lecture, lab, etc.
  final String building;
  final String? buildingPrefix;
  final String roomNumber;
  final List<ClassSchedule>? classSchedule;

  ClassData({
    this.id,
    required this.courseCode,
    required this.className,
    required this.professor,
    required this.meetingType,
    required this.type,
    required this.building,
    this.buildingPrefix,
    required this.roomNumber,
    this.classSchedule,
  });

  factory ClassData.fromJson(Map<String, dynamic> json) {
    return ClassData(
      id: json['_id'] as String?,
      courseCode: json['course_code'] ?? '',
      className: json['class_name'] ?? '',
      professor: json['professor'] ?? '',
      meetingType: json['meeting_type'] ?? '',
      type: json['type'] ?? '',
      building: json['building'] ?? '',
      buildingPrefix: json['building_prefix'],
      roomNumber: json['room_number'] ?? '',
      classSchedule: (json['class_schedule'] as List<dynamic>?)
          ?.map((sched) => ClassSchedule.fromJson(sched))
          .toList(),
    );
  }

  /// Helper to parse partial search results from the server.
  static List<ClassData> parseSearchList(String responseBody) {
    final data = jsonDecode(responseBody);
    if (data is List) {
      return data.map((e) => ClassData.fromJson(e)).toList();
    }
    return [];
  }
}

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({Key? key}) : super(key: key);

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  List<ClassData> _classes = [];
  bool _isLoading = false;
  // List to hold the building options loaded from the API.
  List<String> buildingOptions = [];

  // Semester bounds for the calendar.
  final DateTime _startOfSemester = DateTime(2025, 1, 9);
  final DateTime _endOfSemester = DateTime(2025, 4, 30);

  // Map from DateTime to list of event titles.
  final Map<DateTime, List<String>> _events = {};

  // Calendar variables.
  CalendarFormat _calendarFormat = CalendarFormat.week;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  String get apiUrl => dotenv.env['VITE_API_URL'] ?? '';

  @override
  void initState() {
    super.initState();

    // Ensure the focused day is within semester bounds.
    final now = DateTime.now();
    _focusedDay = now.isAfter(_endOfSemester) ? _endOfSemester : now;
    // Initialize selected day so that events are shown immediately.
    _selectedDay = _focusedDay;

    _fetchClasses();
    loadBuildingOptions();
  }

  Future<void> _fetchClasses() async {
    final username = globals.currentUser;
    if (username == null) {
      print("No current user found. Cannot fetch classes.");
      return;
    }
    setState(() {
      _isLoading = true;
    });
    try {
      final url = Uri.parse('$apiUrl/api/users/classes?username=$username');
      final response = await http.get(url, headers: {'Content-Type': 'application/json'});

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          final loaded = data.map((e) => ClassData.fromJson(e)).toList();
          setState(() {
            _classes = List<ClassData>.from(loaded);
          });
          // Build events from the class schedule for the entire semester.
          _buildEventsForSemester(loaded);
        }
      } else {
        print("Failed to fetch classes: ${response.statusCode}, ${response.body}");
      }
    } catch (err) {
      print("Error fetching schedule: $err");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _buildEventsForSemester(List<ClassData> classes) {
    _events.clear();

    // Map weekday names to numbers: Monday=1, ..., Sunday=7.
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

        // Find the first occurrence of that weekday on or after _startOfSemester.
        final firstOccur = _findFirstOccurrenceOfWeekday(dayIndex, _startOfSemester);
        if (firstOccur == null) continue;

        // Add events for every subsequent week until _endOfSemester.
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

  /// Loads building options from the API.
  Future<void> loadBuildingOptions() async {
    try {
      String options = await getBuildings();
      var decoded = jsonDecode(options) as List;
      setState(() {
        buildingOptions = decoded.map((option) => option.toString()).toList();
        if (buildingOptions.isEmpty) {
          buildingOptions = [
            "Main Building",
            "Annex",
            "Science Center",
            "Library",
            "Engineering Hall",
            "A Building With A Very Long Name That Might Overflow The Layout"
          ];
        }
      });
    } catch (error) {
      print("Error loading building options: $error");
      setState(() {
        buildingOptions = [
          "Main Building",
          "Annex",
          "Science Center",
          "Library",
          "Engineering Hall",
          "A Building With A Very Long Name That Might Overflow The Layout"
        ];
      });
    }
  }

  Future<String> getBuildings() async {
    final url = Uri.parse('$apiUrl/api/locations/getLocation');
    final response = await http.get(url, headers: {'Content-Type': 'application/json'});
    return response.body;
  }

  Future<void> _deleteClass(String? classId) async {
    final username = globals.currentUser;
    if (classId == null || username == null) return;
    try {
      final url = Uri.parse('$apiUrl/api/users/removeClassFromUser');
      final response = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "username": username,
          "classId": classId,
        }),
      );
      if (response.statusCode == 200) {
        await _fetchClasses();
      } else {
        print("Delete failed: ${response.statusCode} ${response.body}");
      }
    } catch (err) {
      print("Error deleting class: $err");
    }
  }

Future<void> _confirmDelete(BuildContext ctx, ClassData cls) async {
  final bool? shouldDelete = await showDialog<bool>(
    context: ctx,
    builder: (context) => AlertDialog(
      title: const Text('Delete class?'),
      content: Text(
        'Are you sure you want to remove "${cls.className}" (${cls.courseCode}) from your schedule?',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Yes, delete', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );

  if (shouldDelete == true) {
    await _deleteClass(cls.id);
  }
}

  Future<void> _handleAddClass(ClassData newClass) async {
    final username = globals.currentUser;
    if (username == null) return;
    try {
      // POST to get or create the class.
      final getClassUrl = Uri.parse('$apiUrl/api/schedule/getClass');
      final resp1 = await http.post(
        getClassUrl,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'course_code': newClass.courseCode,
          'class_name': newClass.className,
          'professor': newClass.professor,
          'meeting_type': newClass.meetingType,
          'type': newClass.type,
          'building': newClass.building,
          'building_prefix': newClass.buildingPrefix,
          'room_number': newClass.roomNumber,
          'class_schedule': newClass.classSchedule
              ?.map((sched) => {'day': sched.day, 'time': sched.time})
              .toList(),
        }),
      );

      if (resp1.statusCode != 200 && resp1.statusCode != 201) {
        print("getClass call failed: ${resp1.statusCode} ${resp1.body}");
        return;
      }

      final decoded1 = jsonDecode(resp1.body);
      final classID = decoded1['classID'];

      // PUT to add the class to the user.
      final addToUserUrl = Uri.parse('$apiUrl/api/users/addClassToUser');
      final resp2 = await http.put(
        addToUserUrl,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "username": username,
          "classId": classID,
        }),
      );
      if (resp2.statusCode == 200) {
        await _fetchClasses();
      } else {
        print("addClassToUser failed: ${resp2.statusCode} ${resp2.body}");
      }
    } catch (err) {
      print("Error adding class: $err");
    }
  }

  Future<void> _onFabPressed() async {
    final searchResult = await showDialog<SearchClassResult>(
      context: context,
      builder: (ctx) => const SearchClassDialog(),
    );
    if (searchResult == null) return;
    if (searchResult.createNew) {
      final newClassData = await showDialog<ClassData>(
        context: context,
        builder: (ctx) => AddClassDialog(buildingOptions: buildingOptions),
      );
      if (newClassData != null) {
        await _handleAddClass(newClassData);
      }
    } else {
      final selectedClass = searchResult.selectedClass;
      if (selectedClass != null) {
        await _handleAddClass(selectedClass);
      }
    }
  }

  /// Sign out the user.
  
  void _signOut() {
  setState(() {
    globals.currentUser = null;
  });
  Navigator.pushReplacement(
    context,
    MaterialPageRoute(builder: (context) =>  LoginScreen()),
  );
}

  @override
  Widget build(BuildContext context) {
    final user = globals.currentUser ?? 'Guest';

    return Scaffold(
      appBar: AppBar(
        title: Text("My Classes ($user)"),
        backgroundColor: const Color.fromARGB(255, 255, 196, 0),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: "Sign Out",
            onPressed: _signOut,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _classes.isEmpty
              ? const Center(child: Text("No classes found. Tap + to add one."))
              : ListView.builder(
                  itemCount: _classes.length,
                  itemBuilder: (context, index) {
                    final cls = _classes[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Title row.
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  cls.className,
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  "(${cls.courseCode})",
                                  style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text("Professor: ${cls.professor}"),
                            if (cls.buildingPrefix != null && cls.buildingPrefix!.isNotEmpty)
                              Text("Location: ${cls.buildingPrefix} ${cls.building} ${cls.roomNumber}")
                            else
                              Text("Location: ${cls.building} ${cls.roomNumber}"),
                            const SizedBox(height: 6),
                            // Display class schedule times.
                            if (cls.classSchedule != null && cls.classSchedule!.isNotEmpty)
                              ...cls.classSchedule!
                                  .where((sched) => sched.time != 'None')
                                  .map((sched) => Text("${sched.day}: ${sched.time}")),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                  onPressed: () => _confirmDelete(context, cls),
                                  child: const Text('Delete', style: TextStyle(color: Colors.black)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: Color.fromARGB(255, 255, 196, 0),
        onPressed: _onFabPressed,
        child: const Icon(Icons.add, color: Colors.black),
      ),
    );
  }
}