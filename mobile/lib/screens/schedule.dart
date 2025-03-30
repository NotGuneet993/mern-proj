import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:syncfusion_flutter_calendar/calendar.dart';
import 'package:mobile/globals.dart' as globals;

final API_URL = dotenv.env['VITE_API_URL'];
class ClassSchedule {
  final String day;
  final String time; // e.g., "8:00 AM-9:00 AM" or "None"

  ClassSchedule({required this.day, required this.time});

  factory ClassSchedule.fromJson(Map<String, dynamic> json) {
    return ClassSchedule(
      day: json['day'] as String,
      time: json['time'] as String,
    );
  }
}

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
    var scheduleJson = json['class_schedule'] as List?;
    List<ClassSchedule>? schedule = scheduleJson != null
        ? scheduleJson.map((item) => ClassSchedule.fromJson(item)).toList()
        : null;

    return ClassData(
      id: json['_id'],
      courseCode: json['course_code'] as String,
      className: json['class_name'] as String,
      professor: json['professor'] as String,
      meetingType: json['meeting_type'] as String,
      type: json['type'] as String,
      building: json['building'] as String,
      buildingPrefix: json['building_prefix'],
      roomNumber: json['room_number'] as String,
      classSchedule: schedule,
    );
  }
}

class SchedulePage extends StatefulWidget {
  final String globalUser;
  const SchedulePage({Key? key, required this.globalUser}) : super(key: key);

  @override
  _SchedulePageState createState() => _SchedulePageState();
}

class _SchedulePageState extends State<SchedulePage> {
  List<ClassData> classes = [];

  @override
  void initState() {
    super.initState();
    loadClasses();
  }

  Future<void> loadClasses() async {
    final username = widget.globalUser;
    if (username.isEmpty) {
      print("No username provided for fetching schedule.");
      return;
    }
    final url = Uri.parse("$API_URL/users/classes?username=${Uri.encodeComponent(username)}");
    try {
      final response =
          await http.get(url, headers: {"Content-Type": "application/json"});
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print("Fetched schedule data: $data");
        setState(() {
          if (data is List) {
            classes = data.map((item) => ClassData.fromJson(item)).toList();
          } else {
            classes = [];
          }
        });
      } else {
        print("Error fetching schedule: ${response.statusCode}");
      }
    } catch (err) {
      print("Error fetching schedule: $err");
    }
  }

  // Helper: Map day name to numeric value
  // Note: In Dart DateTime.weekday, Monday = 1 and Sunday = 7.
  int dayNameToNumber(String dayName) {
    final mapping = {
      "Sunday": 7,
      "Monday": 1,
      "Tuesday": 2,
      "Wednesday": 3,
      "Thursday": 4,
      "Friday": 5,
      "Saturday": 6,
    };
    return mapping[dayName] ?? 1;
  }

  // Helper: Get next occurrence of a given day name
  DateTime getNextDateForDay(String dayName) {
    final today = DateTime.now();
    int targetWeekday = dayNameToNumber(dayName);
    int diff = targetWeekday - today.weekday;
    if (diff < 0) diff += 7;
    return today.add(Duration(days: diff));
  }

  // Helper: Parse a time string like "8:00 AM" into hour/minute in 24h format
  Map<String, int> parseTimeString(String timeStr) {
    // Expecting format "8:00 AM"
    final parts = timeStr.split(' ');
    if (parts.length != 2) return {"hour": 0, "minute": 0};
    final timePart = parts[0];
    final modifier = parts[1];
    final timeParts = timePart.split(':');
    int hours = int.tryParse(timeParts[0]) ?? 0;
    int minutes = int.tryParse(timeParts[1]) ?? 0;
    if (modifier == 'PM' && hours != 12) {
      hours += 12;
    }
    if (modifier == 'AM' && hours == 12) {
      hours = 0;
    }
    return {"hour": hours, "minute": minutes};
  }

  // Helper: Create a DateTime from a day name and a time string
  DateTime createDateTime(String dayName, String timeStr) {
    DateTime date = getNextDateForDay(dayName);
    final timeData = parseTimeString(timeStr);
    return DateTime(date.year, date.month, date.day, timeData["hour"]!, timeData["minute"]!);
  }

  // Convert classes into calendar events (using Syncfusion Appointment)
  List<Appointment> getCalendarEvents() {
    List<Appointment> events = [];
    for (var cls in classes) {
      if (cls.classSchedule != null) {
        for (var sched in cls.classSchedule!) {
          if (sched.time != 'None') {
            // Expect time format "8:00 AM-9:00 AM"
            final timeParts = sched.time.split('-');
            if (timeParts.length == 2) {
              final startTimeStr = timeParts[0].trim();
              final endTimeStr = timeParts[1].trim();
              DateTime start = createDateTime(sched.day, startTimeStr);
              DateTime end = createDateTime(sched.day, endTimeStr);
              events.add(
                Appointment(
                  startTime: start,
                  endTime: end,
                  subject: "${cls.className} (${cls.courseCode})",
                  color: Color(0xFFD4AF37), // Gold color
                  notes: "Prof: ${cls.professor}\nLoc: ${(cls.buildingPrefix ?? '')} ${cls.building} ${cls.roomNumber}".trim(),
                ),
              );
            }
          }
        }
      }
    }
    return events;
  }

  Future<void> handleDeleteClass(String? classId) async {
    if (classId == null) return;
    final url = Uri.parse("$API_URL/users/removeClassFromUser");
    try {
      final response = await http.put(url,
          headers: {"Content-Type": "application/json"},
          body: json.encode({"username": widget.globalUser, "classId": classId}));
      final result = json.decode(response.body);
      print("Delete result: $result");
      await loadClasses();
    } catch (err) {
      print("Error deleting class: $err");
    }
  }

  void handleEditClass(ClassData classToEdit) {
    print("Edit class: $classToEdit");
    // TODO: Implement edit functionality (perhaps open a dialog with pre-filled values)
  }

  Future<void> handleAddClass(ClassData newClassData) async {
    try {
      // First, get the class details from backend
      final urlGetClass = Uri.parse("$API_URL/schedule/getClass");
      final responseGet = await http.post(urlGetClass,
          headers: {"Content-Type": "application/json"},
          body: json.encode({
            "course_code": newClassData.courseCode,
            "class_name": newClassData.className,
            "professor": newClassData.professor,
            "meeting_type": newClassData.meetingType,
            "type": newClassData.type,
            "building": newClassData.building,
            "building_prefix": newClassData.buildingPrefix,
            "room_number": newClassData.roomNumber,
            "class_schedule": newClassData.classSchedule
                ?.map((cs) => {"day": cs.day, "time": cs.time})
                .toList()
          }));
      final getClassResult = json.decode(responseGet.body);
      final String classID = getClassResult["classID"];

      // Add the class to the user
      final urlAddClass = Uri.parse("$API_URL/users/addClassToUser");
      final responseAdd = await http.put(urlAddClass,
          headers: {"Content-Type": "application/json"},
          body: json.encode({"username": widget.globalUser, "classId": classID}));
      final addToUserResult = json.decode(responseAdd.body);
      print("Added class to user: $addToUserResult");
      await loadClasses();
    } catch (err) {
      print("Error in adding class or updating user: $err");
    }
  }

  // Show the modal dialog to add a class
  void showAddClassDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AddClassDialog(
          onSave: (ClassData newClassData) {
            handleAddClass(newClassData);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final calendarEvents = getCalendarEvents();
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text("Schedule Page"),
        backgroundColor: Colors.black,
      ),
      body: Row(
        children: [
          // LEFT COLUMN: List of classes
          Container(
            width: MediaQuery.of(context).size.width * 0.33,
            color: Colors.black,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(
                    "My Classes",
                    style: TextStyle(
                      color: Colors.yellow,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  child: classes.isEmpty
                      ? Center(
                          child: Text(
                            "No classes added yet. Click 'Add Class' to begin.",
                            style: TextStyle(color: Colors.yellowAccent),
                          ),
                        )
                      : ListView.builder(
                          itemCount: classes.length,
                          itemBuilder: (context, index) {
                            final cls = classes[index];
                            return Card(
                              color: Colors.black,
                              shape: RoundedRectangleBorder(
                                side: BorderSide(color: Colors.yellow, width: 1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              margin: EdgeInsets.all(8),
                              child: Padding(
                                padding: const EdgeInsets.all(8.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          cls.className,
                                          style: TextStyle(
                                            color: Colors.yellowAccent,
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          "(${cls.courseCode})",
                                          style: TextStyle(
                                            color: Colors.yellowAccent,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      "Prof: ${cls.professor}",
                                      style: TextStyle(
                                        color: Colors.yellowAccent,
                                        fontSize: 12,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      "Loc: ${(cls.buildingPrefix ?? "")} ${cls.building} ${cls.roomNumber}",
                                      style: TextStyle(
                                        color: Colors.yellowAccent,
                                        fontSize: 12,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    if (cls.classSchedule != null)
                                      Column(
                                        children: cls.classSchedule!
                                            .where((sched) => sched.time != 'None')
                                            .map((sched) => Row(
                                                  mainAxisAlignment:
                                                      MainAxisAlignment
                                                          .spaceBetween,
                                                  children: [
                                                    Text(
                                                      sched.day,
                                                      style: TextStyle(
                                                        color:
                                                            Colors.yellowAccent,
                                                        fontSize: 12,
                                                        fontWeight:
                                                            FontWeight.w500,
                                                      ),
                                                    ),
                                                    Text(
                                                      sched.time,
                                                      style: TextStyle(
                                                        color:
                                                            Colors.yellowAccent,
                                                        fontSize: 12,
                                                        fontWeight:
                                                            FontWeight.w600,
                                                      ),
                                                    ),
                                                  ],
                                                ))
                                            .toList(),
                                      ),
                                    ButtonBar(
                                      alignment: MainAxisAlignment.end,
                                      children: [
                                        TextButton.icon(
                                          onPressed: () {
                                            handleEditClass(cls);
                                          },
                                          icon: Icon(Icons.edit,
                                              color: Colors.black),
                                          label: Text("Edit",
                                              style: TextStyle(
                                                  color: Colors.black,
                                                  fontSize: 12)),
                                          style: TextButton.styleFrom(
                                            backgroundColor: Colors.yellow,
                                          ),
                                        ),
                                        TextButton.icon(
                                          onPressed: () {
                                            handleDeleteClass(cls.id);
                                          },
                                          icon: Icon(Icons.delete,
                                              color: Colors.white),
                                          label: Text("Delete",
                                              style: TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 12)),
                                          style: TextButton.styleFrom(
                                            backgroundColor: Colors.red,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      side: BorderSide(color: Colors.yellow, width: 1),
                    ),
                    onPressed: showAddClassDialog,
                    child: Text(
                      "Add Class",
                      style: TextStyle(color: Colors.yellow),
                    ),
                  ),
                ),
                Container(
                  margin: EdgeInsets.all(8),
                  padding: EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.yellow),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      "Aux Spot",
                      style: TextStyle(color: Colors.yellow),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // RIGHT COLUMN: Calendar view
          Expanded(
            child: Container(
              margin: EdgeInsets.all(8),
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.yellow),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Text(
                    "Calendar View",
                    style: TextStyle(
                      color: Colors.yellow,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Expanded(
                    child: SfCalendar(
                      view: CalendarView.week,
                      dataSource: MeetingDataSource(calendarEvents),
                      timeSlotViewSettings: TimeSlotViewSettings(
                        timeIntervalHeight: 60,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// DataSource for Syncfusion Calendar
class MeetingDataSource extends CalendarDataSource {
  MeetingDataSource(List<Appointment> source) {
    appointments = source;
  }
}

// A simple dialog widget to add a class
class AddClassDialog extends StatefulWidget {
  final Function(ClassData) onSave;
  const AddClassDialog({Key? key, required this.onSave}) : super(key: key);

  @override
  _AddClassDialogState createState() => _AddClassDialogState();
}

class _AddClassDialogState extends State<AddClassDialog> {
  final _formKey = GlobalKey<FormState>();
  // Controllers for form fields
  final TextEditingController courseCodeController = TextEditingController();
  final TextEditingController classNameController = TextEditingController();
  final TextEditingController professorController = TextEditingController();
  final TextEditingController meetingTypeController = TextEditingController();
  final TextEditingController typeController = TextEditingController();
  final TextEditingController buildingController = TextEditingController();
  final TextEditingController buildingPrefixController = TextEditingController();
  final TextEditingController roomNumberController = TextEditingController();
  // For simplicity, handling schedule as one entry
  final TextEditingController dayController = TextEditingController();
  final TextEditingController timeController = TextEditingController(); // e.g., "8:00 AM-9:00 AM"

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text("Add Class"),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: courseCodeController,
                decoration: InputDecoration(labelText: "Course Code"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
              TextFormField(
                controller: classNameController,
                decoration: InputDecoration(labelText: "Class Name"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
              TextFormField(
                controller: professorController,
                decoration: InputDecoration(labelText: "Professor"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
              TextFormField(
                controller: meetingTypeController,
                decoration: InputDecoration(labelText: "Meeting Type"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
              TextFormField(
                controller: typeController,
                decoration: InputDecoration(labelText: "Type"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
              TextFormField(
                controller: buildingController,
                decoration: InputDecoration(labelText: "Building"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
              TextFormField(
                controller: buildingPrefixController,
                decoration: InputDecoration(labelText: "Building Prefix"),
              ),
              TextFormField(
                controller: roomNumberController,
                decoration: InputDecoration(labelText: "Room Number"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
              TextFormField(
                controller: dayController,
                decoration: InputDecoration(labelText: "Day (e.g., Monday)"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
              TextFormField(
                controller: timeController,
                decoration:
                    InputDecoration(labelText: "Time (e.g., 8:00 AM-9:00 AM)"),
                validator: (value) =>
                    value == null || value.isEmpty ? "Required" : null,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
          },
          child: Text("Cancel", style: TextStyle(color: Colors.red)),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              // Create new class data from the form values
              ClassData newClass = ClassData(
                courseCode: courseCodeController.text,
                className: classNameController.text,
                professor: professorController.text,
                meetingType: meetingTypeController.text,
                type: typeController.text,
                building: buildingController.text,
                buildingPrefix: buildingPrefixController.text,
                roomNumber: roomNumberController.text,
                classSchedule: [
                  ClassSchedule(
                    day: dayController.text,
                    time: timeController.text,
                  )
                ],
              );
              widget.onSave(newClass);
              Navigator.of(context).pop();
            }
          },
          child: Text("Save"),
        ),
      ],
    );
  }
}
