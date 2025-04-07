// add_class_dialog.dart
import 'package:flutter/material.dart';
import 'schedule_screen.dart';

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
    this.enabled = false,
    this.startHour = '8',
    this.startMinute = '00',
    this.startAMPM = 'AM',
    this.endHour = '9',
    this.endMinute = '00',
    this.endAMPM = 'AM',
  });
}

class AddClassDialog extends StatefulWidget {
  const AddClassDialog({super.key});

  @override
  State<AddClassDialog> createState() => _AddClassDialogState();
}

class _AddClassDialogState extends State<AddClassDialog> {
  // Basic text controllers
  final TextEditingController _courseCodeCtrl = TextEditingController();
  final TextEditingController _classNameCtrl = TextEditingController();
  final TextEditingController _professorCtrl = TextEditingController();
  final TextEditingController _buildingCtrl = TextEditingController();
  final TextEditingController _buildingPrefixCtrl = TextEditingController();
  final TextEditingController _roomNumberCtrl = TextEditingController();

  String _meetingType = '';
  String _type = '';

  final List<String> _daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  late final List<_ScheduleDay> _schedule;

  @override
  void initState() {
    super.initState();
    // Initialize each day
    _schedule = _daysOfWeek.map((day) => _ScheduleDay(day: day)).toList();
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

  void _submit() {
    final classSchedule = _schedule.map((day) {
      if (!day.enabled) {
        return ClassSchedule(day: day.day, time: 'None');
      } else {
        final start = "${day.startHour}:${day.startMinute} ${day.startAMPM}";
        final end = "${day.endHour}:${day.endMinute} ${day.endAMPM}";
        return ClassSchedule(day: day.day, time: "$start-$end");
      }
    }).toList();

    final result = ClassData(
      courseCode: _courseCodeCtrl.text.trim(),
      className: _classNameCtrl.text.trim(),
      professor: _professorCtrl.text.trim(),
      meetingType: _meetingType,
      type: _type,
      building: _buildingCtrl.text.trim(),
      buildingPrefix: _buildingPrefixCtrl.text.trim(),
      roomNumber: _roomNumberCtrl.text.trim(),
      classSchedule: classSchedule,
    );

    Navigator.pop(context, result);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Add Class"),
      
      // Wrap content in a SizedBox + SingleChildScrollView
      content: SizedBox(
        // You can adjust these values to your preference.
        width: 400,   // sets the desired width
        height: 500,  // sets the desired height
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // COURSE CODE
              TextField(
                controller: _courseCodeCtrl,
                decoration: const InputDecoration(labelText: "Course Code"),
              ),
              const SizedBox(height: 8),

              // CLASS NAME
              TextField(
                controller: _classNameCtrl,
                decoration: const InputDecoration(labelText: "Class Name"),
              ),
              const SizedBox(height: 8),

              // PROFESSOR
              TextField(
                controller: _professorCtrl,
                decoration: const InputDecoration(labelText: "Professor"),
              ),
              const SizedBox(height: 8),

              // MEETING TYPE
              DropdownButtonFormField<String>(
                value: _meetingType.isEmpty ? null : _meetingType,
                decoration: const InputDecoration(labelText: "Meeting Type"),
                items: const [
                  DropdownMenuItem(value: 'in-person', child: Text("In Person")),
                  DropdownMenuItem(value: 'mixed-mode', child: Text("Mixed Mode")),
                  DropdownMenuItem(value: 'online', child: Text("Online")),
                ],
                onChanged: (val) {
                  setState(() => _meetingType = val ?? '');
                },
              ),
              const SizedBox(height: 8),

              // TYPE
              DropdownButtonFormField<String>(
                value: _type.isEmpty ? null : _type,
                decoration: const InputDecoration(labelText: "Class Type"),
                items: const [
                  DropdownMenuItem(value: 'lecture', child: Text("Lecture")),
                  DropdownMenuItem(value: 'lab', child: Text("Lab")),
                  DropdownMenuItem(value: 'discussion', child: Text("Discussion")),
                ],
                onChanged: (val) {
                  setState(() => _type = val ?? '');
                },
              ),
              const SizedBox(height: 8),

              // BUILDING
              TextField(
                controller: _buildingCtrl,
                decoration: const InputDecoration(labelText: "Building"),
              ),
              const SizedBox(height: 8),

              // BUILDING PREFIX
              TextField(
                controller: _buildingPrefixCtrl,
                decoration: const InputDecoration(labelText: "Building Prefix (optional)"),
              ),
              const SizedBox(height: 8),

              // ROOM NUMBER
              TextField(
                controller: _roomNumberCtrl,
                decoration: const InputDecoration(labelText: "Room Number"),
              ),
              const SizedBox(height: 16),

              // SCHEDULE
              const Text("Class Schedule (Enable and set times)"),
              const SizedBox(height: 8),
              ..._schedule.map(_buildScheduleRow),
            ],
          ),
        ),
      ),

      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("Cancel"),
        ),
        ElevatedButton(
          onPressed: _submit,
          child: const Text("Save"),
        ),
      ],
    );
  }

  Widget _buildScheduleRow(_ScheduleDay day) {
    return Column(
      children: [
        Row(
          children: [
            Checkbox(
              value: day.enabled,
              onChanged: (val) {
                setState(() {
                  day.enabled = val ?? false;
                });
              },
            ),
            Text(day.day),
          ],
        ),
        if (day.enabled)
          Padding(
          padding: const EdgeInsets.only(left: 40, bottom: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // START ROW
              Row(
                children: [
                  const Text("Start: "),
                  _buildTimeDropdown(
                    day.startHour,
                    (val) => setState(() => day.startHour = val),
                    12,
                  ),
                  _buildMinuteDropdown(
                    day.startMinute,
                    (val) => setState(() => day.startMinute = val),
                  ),
                  _buildAmPmDropdown(
                    day.startAMPM,
                    (val) => setState(() => day.startAMPM = val),
                  ),
                ],
              ),
              // END ROW
              Row(
                children: [
                  const Text("End: "),
                  _buildTimeDropdown(
                    day.endHour,
                    (val) => setState(() => day.endHour = val),
                    12,
                  ),
                  _buildMinuteDropdown(
                    day.endMinute,
                    (val) => setState(() => day.endMinute = val),
                  ),
                  _buildAmPmDropdown(
                    day.endAMPM,
                    (val) => setState(() => day.endAMPM = val),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimeDropdown(String currentVal, ValueChanged<String> onChanged, int maxHour) {
    final items = List.generate(maxHour, (i) => '${i + 1}');
    return DropdownButton<String>(
      value: currentVal,
      onChanged: (String? val) {
        if (val != null) onChanged(val);
      },
      items: items.map((val) => DropdownMenuItem(value: val, child: Text(val))).toList(),
    );
  }

  Widget _buildMinuteDropdown(String currentVal, ValueChanged<String> onChanged) {
    final items = ['00', '15', '30', '45'];
    return DropdownButton<String>(
      value: currentVal,
      onChanged: (String? val) {
        if (val != null) onChanged(val);
      },
      items: items.map((val) => DropdownMenuItem(value: val, child: Text(val))).toList(),
    );
  }

  Widget _buildAmPmDropdown(String currentVal, ValueChanged<String> onChanged) {
    return DropdownButton<String>(
      value: currentVal,
      onChanged: (String? val) {
        if (val != null) onChanged(val);
      },
      items: const [
        DropdownMenuItem(value: 'AM', child: Text('AM')),
        DropdownMenuItem(value: 'PM', child: Text('PM')),
      ],
    );
  }
}