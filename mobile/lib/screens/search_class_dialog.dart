// search_class_dialog.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'schedule_screen.dart';

/// A simple model returned by this dialog:
/// - A ClassData if user selected a found class
/// - null if user wants to open the AddClassDialog
class SearchClassResult {
  final ClassData? selectedClass;
  final bool createNew;

  SearchClassResult({
    this.selectedClass,
    required this.createNew,
  });
}

/// A dialog that prompts the user for (course code, class name, professor),
/// performs a partial search on /schedule/search, displays up to 10 matches.
/// The user can pick one OR tap "Not my class" to create a new one.
class SearchClassDialog extends StatefulWidget {
  const SearchClassDialog({Key? key}) : super(key: key);

  @override
  State<SearchClassDialog> createState() => _SearchClassDialogState();
}

class _SearchClassDialogState extends State<SearchClassDialog> {
  final TextEditingController _courseCodeCtrl = TextEditingController();
  final TextEditingController _classNameCtrl = TextEditingController();
  final TextEditingController _professorCtrl = TextEditingController();

  bool _isSearching = false;
  List<ClassData> _searchResults = [];

  String get apiUrl => dotenv.env['VITE_API_URL'] ?? '';

  @override
  void dispose() {
    _courseCodeCtrl.dispose();
    _classNameCtrl.dispose();
    _professorCtrl.dispose();
    super.dispose();
  }

  Future<void> _performSearch() async {
    setState(() {
      _isSearching = true;
      _searchResults.clear();
    });

    final queryParams = <String, String>{};
    if (_courseCodeCtrl.text.trim().isNotEmpty) {
      queryParams['courseCode'] = _courseCodeCtrl.text.trim();
    }
    if (_professorCtrl.text.trim().isNotEmpty) {
      queryParams['professor'] = _professorCtrl.text.trim();
    }
    if (_classNameCtrl.text.trim().isNotEmpty) {
      queryParams['className'] = _classNameCtrl.text.trim();
    }

    // If user didn’t type anything, skip calling the server
    if (queryParams.isEmpty) {
      setState(() {
        _isSearching = false;
      });
      return;
    }

    final uri = Uri.parse("$apiUrl/api/schedule/search")
        .replace(queryParameters: queryParams);

    try {
      final resp = await http.get(uri);
      setState(() => _isSearching = false);

      if (resp.statusCode == 200) {
        final data = ClassData.parseSearchList(resp.body);
        setState(() {
          _searchResults = data;
        });
      } else {
        debugPrint("Search failed: ${resp.statusCode} ${resp.body}");
      }
    } catch (err) {
      debugPrint("Error searching classes: $err");
      setState(() => _isSearching = false);
    }
  }

  void _handleSelectClass(ClassData cls) {
    // Return the chosen ClassData
    final result = SearchClassResult(selectedClass: cls, createNew: false);
    Navigator.pop(context, result);
  }

  void _handleCreateNew() {
    // Return with createNew=true, so parent shows the AddClassDialog
    final result = SearchClassResult(selectedClass: null, createNew: true);
    Navigator.pop(context, result);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Search Existing Class"),
      // Instead of SingleChildScrollView, use a SizedBox with fixed size
      content: SizedBox(
        width: 300, 
        height: 500,
        child: Column(
          children: [
            // Text fields & search button
            TextField(
              controller: _courseCodeCtrl,
              decoration: const InputDecoration(labelText: "Course Code"),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _classNameCtrl,
              decoration: const InputDecoration(labelText: "Class Name"),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _professorCtrl,
              decoration: const InputDecoration(labelText: "Professor"),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: _performSearch,
              child: _isSearching
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text("Search"),
            ),
            const SizedBox(height: 8),

            // Show results or message in an Expanded
            Expanded(child: _buildResults()),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _handleCreateNew,
          child: const Text("Not my class"),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context, null),
          child: const Text("Cancel"),
        ),
      ],
    );
  }

  Widget _buildResults() {
    if (_searchResults.isEmpty) {
      return const Center(
        child: Text(
          "No results yet. Try searching above.\nIf nothing matches, press \"Not my class\".",
          textAlign: TextAlign.center,
        ),
      );
    }

    // If search results exist, display them in a scrollable ListView
        return ListView.separated(
    itemCount: _searchResults.length,
    // A small Divider widget for your border/separator
    separatorBuilder: (context, index) => const Divider(
        color: Colors.grey,    // customize color here
        thickness: 1,          // thickness of the line
        height: 1,             // space the divider takes vertically
    ),
    itemBuilder: (ctx, i) {
        final cls = _searchResults[i];
        return ListTile(
        title: Text("${cls.className} (${cls.courseCode})"),
        subtitle: Text("Prof: ${cls.professor} | ${cls.building} Room: ${cls.roomNumber}"),
        onTap: () => _handleSelectClass(cls),
        );
    },
    );
  }
}