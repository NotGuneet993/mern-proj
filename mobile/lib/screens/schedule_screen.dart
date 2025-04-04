// schedule_screen.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/globals.dart' as globals;
import 'add_class_dialog.dart';

/// Represents a single day's schedule info, e.g. "Monday 8:00 AM-9:00 AM".
class ClassSchedule {
  final String day;
  final String time; // e.g. "8:00 AM-9:00 AM" or "None"

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
  final String meetingType;
  final String type;
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
}

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

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
          final List<ClassData> loaded = data.map((e) => ClassData.fromJson(e)).toList();
          setState(() {
            _classes = loaded;
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
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Removes the class from the user's schedule by calling `PUT /users/removeClassFromUser`
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
        // Refresh the list
        await _fetchClasses();
      } else {
        print("Delete failed: ${response.statusCode} ${response.body}");
      }
    } catch (err) {
      print("Error deleting class: $err");
    }
  }

  /// Called when user completes the "Add Class" dialog.
  /// We must replicate: POST /schedule/getClass -> get classID -> PUT /users/addClassToUser
  Future<void> _handleAddClass(ClassData newClass) async {
    final username = globals.currentUser;
    if (username == null) return;

    try {
      // 1) POST /schedule/getClass with the new class data to get or create a class doc.
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
      if (resp1.statusCode != 200) {
        print("getClass call failed: ${resp1.statusCode} ${resp1.body}");
        return;
      }
      final decoded1 = jsonDecode(resp1.body);
      final classID = decoded1['classID'];

      // 2) PUT /users/addClassToUser with that classID
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
        // Refresh
        await _fetchClasses();
      } else {
        print("addClassToUser failed: ${resp2.statusCode} ${resp2.body}");
      }
    } catch (err) {
      print("Error adding class: $err");
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
                            // Buttons: Delete etc.
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                // Edit is optional, not implemented in this example
                                // ElevatedButton(
                                //   onPressed: () => _handleEditClass(cls),
                                //   child: const Text("Edit"),
                                // ),
                                const SizedBox(width: 8),
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
        onPressed: () async {
          // Show the AddClassDialog
          final result = await showDialog<ClassData>(
            context: context,
            builder: (ctx) => AddClassDialog(),
          );
          if (result != null) {
            // The user submitted new class data
            await _handleAddClass(result);
          }
        },
        child: const Icon(Icons.add, color: Colors.black),
      ),
    );
  }
}