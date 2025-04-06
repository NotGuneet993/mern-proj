// schedule_screen.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/globals.dart' as globals;
import 'add_class_dialog.dart';
import 'search_class_dialog.dart';

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
  final String meetingType;   // in-person, mixed-mode, etc.
  final String type;          // lecture, lab, etc.
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

  /// Helper to parse partial search results from the server
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

  String get apiUrl => dotenv.env['VITE_API_URL'] ?? '';

  @override
  void initState() {
    super.initState();
    _fetchClasses();
  }

  /// Fetch the current user's classes from: GET /api/users/classes?username=...
  Future<void> _fetchClasses() async {
    final username = globals.currentUser;
    if (username == null) {
      print("No current user found. Cannot fetch classes.");
      return;
    }
    setState(() => _isLoading = true);

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
        } else {
          print("Unexpected response format: not a list");
        }
      } else {
        print("Failed to fetch classes: ${response.statusCode}, ${response.body}");
      }
    } catch (err) {
      print("Error fetching schedule: $err");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// Removes the class from the user's schedule via PUT /api/users/removeClassFromUser
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

  /// Called when user completes the "Add Class" flow
  /// We replicate: POST /api/schedule/getClass -> get classID -> PUT /api/users/addClassToUser
  Future<void> _handleAddClass(ClassData newClass) async {
    final username = globals.currentUser;
    if (username == null) return;

    try {
      // 1) POST /api/schedule/getClass
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
          'class_schedule': newClass.classSchedule?.map((sched) => {
            'day': sched.day,
            'time': sched.time,
          }).toList(),
        }),
      );

      if (resp1.statusCode != 200 && resp1.statusCode != 201) {
        print("getClass call failed: ${resp1.statusCode} ${resp1.body}");
        return;
      }

      final decoded1 = jsonDecode(resp1.body);
      final classID = decoded1['classID'];

      // 2) PUT /api/users/addClassToUser
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

  /// The user wants to add a class:
  /// 1) Show SearchClassDialog
  ///    - If user picks a class => call _handleAddClass(...)
  ///    - If user chooses "Not my class" => show AddClassDialog
  Future<void> _onFabPressed() async {
    final searchResult = await showDialog<SearchClassResult>(
      context: context,
      builder: (ctx) => const SearchClassDialog(),
    );
    if (searchResult == null) return; // user canceled

    if (searchResult.createNew) {
      // Show AddClassDialog
      final newClassData = await showDialog<ClassData>(
        context: context,
        builder: (ctx) => const AddClassDialog(),
      );
      if (newClassData != null) {
        await _handleAddClass(newClassData);
      }
    } else {
      // They selected an existing class
      final selectedClass = searchResult.selectedClass;
      if (selectedClass != null) {
        await _handleAddClass(selectedClass);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = globals.currentUser ?? 'Guest';

    return Scaffold(
      appBar: AppBar(
        title: Text("My Classes ($user)"),
        backgroundColor: const Color.fromARGB(255, 236, 220, 39),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _classes.isEmpty
              ? const Center(
                  child: Text("No classes found. Tap + to add one."),
                )
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
                            // Title row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  cls.className,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  "(${cls.courseCode})",
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontStyle: FontStyle.italic,
                                  ),
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

                            // Class schedule times
                            if (cls.classSchedule != null && cls.classSchedule!.isNotEmpty)
                              ...cls.classSchedule!
                                  .where((sched) => sched.time != 'None')
                                  .map((sched) => Text("${sched.day}: ${sched.time}"))
                                  .toList(),

                            // Delete button
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.red,
                                  ),
                                  onPressed: () => _deleteClass(cls.id),
                                  child: const Text("Delete"),
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
        backgroundColor: const Color.fromARGB(255, 236, 220, 39),
        onPressed: _onFabPressed,
        child: const Icon(Icons.add, color: Colors.black),
      ),
    );
  }
}