// add_class_dialog.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'schedule_screen.dart';

/// A dialog to add a new class, replicating your React AddModal structure.
/// On "Save", it returns a [ClassData] object with the user-specified fields.
class AddClassDialog extends StatefulWidget {
  const AddClassDialog({super.key});

  @override
  State<AddClassDialog> createState() => _AddClassDialogState();
}

class _AddClassDialogState extends State<AddClassDialog> {
  // Text fields
  final TextEditingController _courseCodeCtrl = TextEditingController();
  final TextEditingController _classNameCtrl = TextEditingController();
  final TextEditingController _professorCtrl = TextEditingController();
  final TextEditingController _buildingCtrl = TextEditingController();
  final TextEditingController _buildingPrefixCtrl = TextEditingController();
  final TextEditingController _roomNumberCtrl = TextEditingController();

  String _meetingType = '';
  String _type = '';

  // For auto-complete (optional)
  List<String> _matchedCourseCodes = [];
  List<String> _matchedClassNames = [];
  List<String> _matchedProfessors = [];
  String? _focusedField;
  int _searchCount = 0;

  // Days of week data
  final List<String> _daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  // We'll store each day in a structure
  // "enabled" means the user is actually scheduling that day,
  // startHour, etc. store the times.
  // This is a simplified approach.
  final List<_ScheduleDay> _schedule = [];

  String get apiUrl => dotenv.env['VITE_API_URL'] ?? '';

  @override
  void initState() {
    super.initState();
    // Initialize each day with default 8:00 AM -> 9:00 AM
    for (final day in _daysOfWeek) {
      _schedule.add(_ScheduleDay(
        day: day,
        enabled: false,
        startHour: '8',
        startMinute: '00',
        startAMPM: 'AM',
        endHour: '9',
        endMinute: '00',
        endAMPM: 'AM',
      ));
    }
  }

  @override
  void dispose() {
    _courseCodeCtrl.dispose();
    _classNameCtrl.dispose();
    _professorCtrl.dispose();
    _buildingCtrl.dispose();
    _buildingPrefixCtrl.dispose();
    _roomNumberCtrl.dispose();
    super.dispose();
  }

  /// We replicate the React calls to /schedule/search for auto-complete.
  Future<void> _searchAutocomplete(String field, String value) async {
    if (value.trim().isEmpty || _searchCount > 50) {
      // No search if empty or we've done a bunch
      return;
    }
    setState(() {
      _searchCount++;
    });
    final queryParams = {field: value};
    final uri = Uri.parse("$apiUrl/schedule/search").replace(queryParameters: queryParams);
    try {
      final resp = await http.get(uri);
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        if (data is List) {
          final results = data.map((cls) => cls[field]).toSet().cast<String>().toList();
          setState(() {
            if (field == 'courseCode') _matchedCourseCodes = results;
            if (field == 'className') _matchedClassNames = results;
            if (field == 'professor') _matchedProfessors = results;
          });
        }
      } else {
        print("Error fetching search data: ${resp.statusCode} ${resp.body}");
      }
    } catch (err) {
      print("Error searching: $err");
    }
  }

  /// The user picks one from the suggestions
  void _selectSuggestion(String field, String selection) {
    setState(() {
      if (field == 'courseCode') {
        _courseCodeCtrl.text = selection;
        _matchedCourseCodes = [];
      }
      if (field == 'className') {
        _classNameCtrl.text = selection;
        _matchedClassNames = [];
      }
      if (field == 'professor') {
        _professorCtrl.text = selection;
        _matchedProfessors = [];
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Add Class"),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // COURSE CODE
            TextField(
              controller: _courseCodeCtrl,
              decoration: const InputDecoration(labelText: "Course Code"),
              onChanged: (val) {
                setState(() {
                  _focusedField = 'courseCode';
                });
                _searchAutocomplete('courseCode', val);
              },
              onTap: () => _focusedField = 'courseCode',
            ),
            if (_focusedField == 'courseCode' && _matchedCourseCodes.isNotEmpty)
              _buildSuggestionList('courseCode', _matchedCourseCodes),

            // CLASS NAME
            TextField(
              controller: _classNameCtrl,
              decoration: const InputDecoration(labelText: "Class Name"),
              onChanged: (val) {
                setState(() {
                  _focusedField = 'className';
                });
                _searchAutocomplete('className', val);
              },
              onTap: () => _focusedField = 'className',
            ),
            if (_focusedField == 'className' && _matchedClassNames.isNotEmpty)
              _buildSuggestionList('className', _matchedClassNames),

            // PROFESSOR
            TextField(
              controller: _professorCtrl,
              decoration: const InputDecoration(labelText: "Professor"),
              onChanged: (val) {
                setState(() {
                  _focusedField = 'professor';
                });
                _searchAutocomplete('professor', val);
              },
              onTap: () => _focusedField = 'professor',
            ),
            if (_focusedField == 'professor' && _matchedProfessors.isNotEmpty)
              _buildSuggestionList('professor', _matchedProfessors),

            // MEETING TYPE
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _meetingType.isEmpty ? null : _meetingType,
              decoration: const InputDecoration(labelText: "Meeting Type"),
              items: const [
                DropdownMenuItem(value: 'in-person', child: Text("In-person")),
                DropdownMenuItem(value: 'mixed-mode', child: Text("Mixed mode")),
                DropdownMenuItem(value: 'online', child: Text("Online")),
              ],
              onChanged: (val) {
                if (val != null) {
                  setState(() => _meetingType = val);
                }
              },
            ),

            // TYPE
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _type.isEmpty ? null : _type,
              decoration: const InputDecoration(labelText: "Type"),
              items: const [
                DropdownMenuItem(value: 'lecture', child: Text("Lecture")),
                DropdownMenuItem(value: 'lab', child: Text("Lab")),
                DropdownMenuItem(value: 'discussion', child: Text("Discussion")),
              ],
              onChanged: (val) {
                if (val != null) {
                  setState(() => _type = val);
                }
              },
            ),

            // BUILDING
            TextField(
              controller: _buildingCtrl,
              decoration: const InputDecoration(labelText: "Building (Required)"),
            ),
            // BUILDING PREFIX
            TextField(
              controller: _buildingPrefixCtrl,
              decoration: const InputDecoration(labelText: "Building Prefix (Optional)"),
            ),
            // ROOM
            TextField(
              controller: _roomNumberCtrl,
              decoration: const InputDecoration(labelText: "Room Number (Required)"),
            ),

            const SizedBox(height: 12),
            const Text("Class Schedule: Check days + select start/end times"),
            const SizedBox(height: 8),

            ..._schedule.map((dayData) => _buildDayRow(dayData)).toList(),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("Cancel"),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color.fromARGB(255, 236, 220, 39),
          ),
          onPressed: _submit,
          child: const Text("Save", style: TextStyle(color: Colors.black)),
        ),
      ],
    );
  }

  Widget _buildSuggestionList(String field, List<String> suggestions) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      constraints: const BoxConstraints(maxHeight: 150),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey),
      ),
      child: ListView.builder(
        shrinkWrap: true,
        itemCount: suggestions.length,
        itemBuilder: (ctx, idx) {
          final suggestion = suggestions[idx];
          return InkWell(
            onTap: () => _selectSuggestion(field, suggestion),
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text(suggestion),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDayRow(_ScheduleDay data) {
    return Column(
      children: [
        Row(
          children: [
            Checkbox(
              value: data.enabled,
              onChanged: (val) {
                setState(() {
                  data.enabled = val ?? false;
                });
              },
            ),
            Text(data.day),
          ],
        ),
        if (data.enabled)
          Padding(
            padding: const EdgeInsets.only(left: 40),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Start time
                const Text("Start:"),
                _buildTimeDropdown(
                  data.startHour,
                  (val) => setState(() => data.startHour = val),
                  12,
                ),
                _buildMinuteDropdown(data.startMinute, (val) => setState(() => data.startMinute = val)),
                _buildAmPmDropdown(data.startAMPM, (val) => setState(() => data.startAMPM = val)),

                const SizedBox(width: 8),

                // End time
                const Text("End:"),
                _buildTimeDropdown(
                  data.endHour,
                  (val) => setState(() => data.endHour = val),
                  12,
                ),
                _buildMinuteDropdown(data.endMinute, (val) => setState(() => data.endMinute = val)),
                _buildAmPmDropdown(data.endAMPM, (val) => setState(() => data.endAMPM = val)),
              ],
            ),
          ),
        const Divider(height: 1),
      ],
    );
  }

  Widget _buildTimeDropdown(String current, ValueChanged<String> onChanged, int max) {
    final items = List.generate(max, (i) => '${i + 1}');
    return DropdownButton<String>(
      value: current,
      // Now onChanged: (String? val)
      onChanged: (String? val) {
        if (val != null) {
          onChanged(val);
        }
      },
      items: items.map((val) => DropdownMenuItem(value: val, child: Text(val))).toList(),
      style: const TextStyle(color: Colors.black),
    );
  }

  Widget _buildMinuteDropdown(String current, ValueChanged<String> onChanged) {
    final items = <String>['00', '15', '30', '45'];
    return DropdownButton<String>(
      value: current,
      onChanged: (String? val) {
        if (val != null) {
          onChanged(val);
        }
      },
      items: items.map((val) => DropdownMenuItem(value: val, child: Text(val))).toList(),
      style: const TextStyle(color: Colors.black),
    );
  }

  Widget _buildAmPmDropdown(String current, ValueChanged<String> onChanged) {
    return DropdownButton<String>(
      value: current,
      onChanged: (String? val) {
        if (val != null) {
          onChanged(val);
        }
      },
      items: const [
        DropdownMenuItem(value: 'AM', child: Text('AM')),
        DropdownMenuItem(value: 'PM', child: Text('PM')),
      ],
      style: const TextStyle(color: Colors.black),
    );
  }

  /// When the user taps "Save", we build a ClassData object and pop it.
  void _submit() {
    final classSchedule = _schedule.map((dayData) {
      if (!dayData.enabled) {
        return {
          'day': dayData.day,
          'time': 'None',
        };
      } else {
        final start = "${dayData.startHour}:${dayData.startMinute} ${dayData.startAMPM}";
        final end = "${dayData.endHour}:${dayData.endMinute} ${dayData.endAMPM}";
        return {
          'day': dayData.day,
          'time': "$start-$end",
        };
      }
    }).toList();

    final result = ClassData(
      courseCode: _courseCodeCtrl.text,
      className: _classNameCtrl.text,
      professor: _professorCtrl.text,
      meetingType: _meetingType,
      type: _type,
      building: _buildingCtrl.text,
      buildingPrefix: _buildingPrefixCtrl.text,
      roomNumber: _roomNumberCtrl.text,
      classSchedule: classSchedule
          .map((e) => ClassSchedule(day: e['day']!, time: e['time']!))
          .toList(),
    );

    Navigator.pop(context, result);
  }
}

/// Internal helper class to track day/time input
class _ScheduleDay {
  String day;
  bool enabled;
  String startHour;
  String startMinute;
  String startAMPM;
  String endHour;
  String endMinute;
  String endAMPM;

  _ScheduleDay({
    required this.day,
    required this.enabled,
    required this.startHour,
    required this.startMinute,
    required this.startAMPM,
    required this.endHour,
    required this.endMinute,
    required this.endAMPM,
  });
}