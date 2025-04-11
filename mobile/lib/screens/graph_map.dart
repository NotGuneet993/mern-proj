import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:collection/collection.dart'; // For firstWhereOrNull
import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:mobile/globals.dart' as globals;
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:math';
import 'package:geolocator/geolocator.dart';
import 'dart:async'; // For StreamSubscription

/// A class representing a node on the map (e.g., a building or waypoint).
class Node {
  String id;
  LatLng latlng;
  String label;
  Color color;

  Node({
    required this.id,
    required this.latlng,
    required this.label,
    required this.color,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'latlng': {'lat': latlng.latitude, 'lng': latlng.longitude},
        'label': label,
        'color': label.isNotEmpty ? 'red' : 'blue',
      };

  factory Node.fromJson(Map<String, dynamic> json) {
    final latlngJson = json['latlng'];
    return Node(
      id: json['id'],
      latlng: LatLng(latlngJson['lat'], latlngJson['lng']),
      label: json['label'] ?? '',
      color: (json['label'] != null && json['label'].toString().isNotEmpty)
          ? Colors.red
          : Colors.blue,
    );
  }
}

/// A class representing the nearest node returned by the server.
class NearestNode {
  final String name;
  final double long;
  final double lat;

  NearestNode({
    required this.name,
    required this.long,
    required this.lat,
  });

  factory NearestNode.fromJson(Map<String, dynamic> json) {
    return NearestNode(
      name: json['name'],
      long: (json['long'] is num)
          ? json['long'].toDouble()
          : double.parse(json['long']),
      lat: (json['lat'] is num)
          ? json['lat'].toDouble()
          : double.parse(json['lat']),
    );
  }
}

/// A class representing an edge (connection) between two nodes on the map.
class Edge {
  String id;
  String node1;
  String node2;

  Edge({
    required this.id,
    required this.node1,
    required this.node2,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'node1': node1,
        'node2': node2,
      };

  factory Edge.fromJson(Map<String, dynamic> json) {
    return Edge(
      id: json['id'],
      node1: json['node1'],
      node2: json['node2'],
    );
  }
}

/// The main map widget that handles navigation, drawing edges/nodes, etc.
class GraphMap extends StatefulWidget {
  const GraphMap({super.key});

  @override
  _GraphMapState createState() => _GraphMapState();
}

class _GraphMapState extends State<GraphMap> {
  final String? apiUrl = dotenv.env['VITE_API_URL'];

  // Data structures to store nodes, edges, and polylines
  List<Node> nodes = [];
  List<Node> pathNodes = [];
  List<Edge> edges = [];
  List<Polyline> geoJsonPolylines = [];
  List<Marker> routeMarkers = [];

  // Autocomplete building options
  List<String> buildingOptions = [];
  String? selectedFrom;
  String? selectedTo;
  TextEditingController? _fromInternalController;
  TextEditingController? _toInternalController;

  // For user input
  final TextEditingController fromController = TextEditingController();
  final TextEditingController toController = TextEditingController();

  // For node editing
  String mode = "none"; // "addNode", "connectNodes", "delete", or "none"
  List<Node> selectedNodes = [];
  String nodeLabel = "";
  TextEditingController nodeLabelController = TextEditingController();

  // Map and location tracking
  final MapController mapController = MapController();
  LatLng? userLocation;
  LatLng? nearestIndicatorPoint;
  double userHeading = 0.0;

  // Save the subscription so that we can cancel it on dispose.
  StreamSubscription<Position>? _positionStreamSubscription;

  @override
  void initState() {
    super.initState();
    loadBuildingOptions();
    _initLocationTracking();
    _testCurrentPosition();
  }

  /// Test the current position once, primarily for debugging.
  void _testCurrentPosition() async {
    try {
      Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);
      // Use position as needed...
    } catch (e) {
      debugPrint("Error getting current position: $e");
    }
  }

  /// Clear the route from the map and reset selected locations.
  void clearMap() {
    setState(() {
      selectedFrom = null;
      selectedTo = null;
      _fromInternalController?.clear();
      _toInternalController?.clear();
      for (final n in pathNodes) {
        nodes.remove(n);
      }
      pathNodes.clear();
      geoJsonPolylines.clear();
      routeMarkers.clear();
    });
  }

  /// Handle a tap on the map: if in "addNode" mode, create a new node.
  void handleMapTap(LatLng latlng) {
    if (mode == "addNode") {
      Node newNode = Node(
        id: 'node-${DateTime.now().millisecondsSinceEpoch}',
        latlng: latlng,
        label: nodeLabel,
        color: nodeLabel.isNotEmpty ? Colors.red : Colors.blue,
      );
      setState(() {
        nodes.add(newNode);
        nodeLabel = "";
        nodeLabelController.clear();
      });
    }
  }

  void _showMessageDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK')),
        ],
      ),
    );
  }

  // Grab the label of the nearest node.
  Future<NearestNode?> getNearestNode() async {
    if (userLocation == null) return null;

    double userLong = userLocation!.longitude;
    double userLat = userLocation!.latitude;

    final encodedLong = Uri.encodeComponent(userLong.toString());
    final encodedLat = Uri.encodeComponent(userLat.toString());

    final url = Uri.parse('$apiUrl/api/locations/nearest?lat=$encodedLat&long=$encodedLong');

    try {
      final response = await http.get(url, headers: {'Content-Type': 'application/json'});
      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        NearestNode nearestNode = NearestNode.fromJson(jsonResponse);
        return nearestNode;
      } else {
        debugPrint("Error: ${response.statusCode}");
        return null;
      }
    } catch (e) {
      debugPrint("Exception while fetching nearest node: $e");
      return null;
    }
  }

  /// Make a GET request to fetch a route from "from" to "to".
  Future<void> navigation(String? from, String? to) async {
    NearestNode? nearestNode = await getNearestNode();
    debugPrint("Nearest Building: ${nearestNode?.name}");

    from = nearestNode?.name;

    if (from == null || to == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select both From and To locations.")),
      );
      return;
    }
    debugPrint("Navigating from: $from to: $to");

    final encodedFrom = Uri.encodeComponent(from);
    final encodedTo = Uri.encodeComponent(to);
    final url = Uri.parse('$apiUrl/api/locations/getPath?location1=$encodedFrom&location2=$encodedTo');
    final response = await http.get(url, headers: {'Content-Type': 'application/json'});

    debugPrint("Response status: ${response.statusCode}");
    debugPrint("Response body: ${response.body}");

    if (response.body.trim().startsWith('<')) {
      debugPrint("Received HTML response instead of JSON.");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Error: Unexpected HTML response from server.")),
      );
      return;
    }

    if (response.statusCode != 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: ${response.statusCode}")),
      );
      return;
    }

    try {
      final geoJson = jsonDecode(response.body);
      if (!geoJson.containsKey('path') || geoJson['path'] is! List) {
        debugPrint('Invalid JSON structure - missing "path"');
        return;
      }

      final features = geoJson['path'] as List;
      LatLng? firstCoord;
      LatLng? lastCoord;
      List<Polyline> newPolylines = [];

      for (var feature in features) {
        final geometry = feature['geometry'];
        final type = geometry['type'];
        if (type == 'LineString') {
          final coordsList = geometry['coordinates'] as List;
          List<LatLng> points = [];
          for (var coords in coordsList) {
            double lng = coords[0];
            double lat = coords[1];
            points.add(LatLng(lat, lng));
          }
          newPolylines.add(
            Polyline(points: points, strokeWidth: 4.0, color: Colors.blueAccent),
          );
          if (coordsList.isNotEmpty) {
            firstCoord ??= LatLng(nearestNode!.lat, nearestNode.long);
            final cLast = coordsList.last;
            lastCoord = LatLng(cLast[1], cLast[0]);
          }
        }
      }

      if (firstCoord != null && lastCoord != null) {
        final startMarker = Marker(
          point: firstCoord,
          width: 40,
          height: 40,
          child: const Icon(Icons.location_on, color: Colors.red, size: 40),
        );
        final endMarker = Marker(
          point: lastCoord,
          width: 40,
          height: 40,
          child: const Icon(Icons.flag, color: Colors.red, size: 40),
        );

        setState(() {
          for (final n in pathNodes) {
            nodes.remove(n);
          }
          pathNodes.clear();
          geoJsonPolylines.clear();
          routeMarkers.clear();

          geoJsonPolylines.addAll(newPolylines);
          routeMarkers.addAll([startMarker, endMarker]);
        });
        debugPrint('Created polyline with start and end markers.');
      } else {
        debugPrint("No valid line coordinates found in the route.");
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("No valid route data returned.")),
        );
      }
    } catch (e) {
      debugPrint("JSON decoding error: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("JSON decoding error")),
      );
    }
  }

  Future<String> getClasses() async {
    final url = Uri.parse('$apiUrl/api/locations/getLocation');
    final response = await http.get(url, headers: {'Content-Type': 'application/json'});
    return response.body;
  }

  /// Fetch building options for the "From" and "To" autocomplete.
  Future<void> loadBuildingOptions() async {
    String options = await getClasses();
    var decoded = jsonDecode(options) as List;
    setState(() {
      buildingOptions = decoded.map((option) => option.toString()).toList();
    });
  }

  void handleNodeTap(Node node) {
    if (mode == "connectNodes") {
      if (selectedNodes.isEmpty) {
        setState(() {
          selectedNodes.add(node);
          node.color = Colors.yellow;
        });
      } else {
        Node node1 = selectedNodes.first;
        Node node2 = node;
        if (node1.id == node2.id) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("A node cannot connect to itself!")),
          );
          setState(() {
            selectedNodes.clear();
          });
          return;
        }
        Edge newEdge = Edge(
          id: 'edge-${DateTime.now().millisecondsSinceEpoch}',
          node1: node1.id,
          node2: node2.id,
        );
        setState(() {
          edges.add(newEdge);
          selectedNodes.clear();
          for (var n in nodes) {
            if (n.id == node1.id || n.id == node2.id) {
              n.color = n.label.isNotEmpty ? Colors.red : Colors.blue;
            }
          }
        });
      }
    } else if (mode == "delete") {
      deleteNode(node.id);
      setState(() {
        mode = "none";
      });
    }
  }

  void deleteNode(String id) {
    setState(() {
      nodes.removeWhere((n) => n.id == id);
      edges.removeWhere((e) => e.node1 == id || e.node2 == id);
    });
  }

  void deleteEdge(String id) {
    setState(() {
      edges.removeWhere((e) => e.id == id);
      mode = "none";
    });
  }

  Future<void> saveGraphToFile() async {
    var graphData = jsonEncode({
      'nodes': nodes.map((n) => n.toJson()).toList(),
      'edges': edges.map((e) => e.toJson()).toList(),
    });
    Directory directory = await getApplicationDocumentsDirectory();
    String path = directory.path;
    File file = File('$path/graph_data.json');
    await file.writeAsString(graphData);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Graph saved to $path/graph_data.json")),
    );
  }

  Future<void> loadGraphFromFile() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['json'],
    );
    if (result != null && result.files.single.path != null) {
      File file = File(result.files.single.path!);
      String content = await file.readAsString();
      try {
        var data = jsonDecode(content);
        List<dynamic> loadedNodes = data['nodes'];
        List<dynamic> loadedEdges = data['edges'];
        setState(() {
          nodes = loadedNodes.map((json) => Node.fromJson(json)).toList();
          edges = loadedEdges.map((json) => Edge.fromJson(json)).toList();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Graph loaded from file.")),
        );
      } catch (error) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Invalid file format.")),
        );
      }
    }
  }

  /// Initialize location tracking for the user.
  Future<void> _initLocationTracking() async {
    debugPrint("Initializing location tracking...");

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showMessageDialog("Error!", "Please enable location services.");
      debugPrint("ERROR WITH LOCATION SERVICES 1");
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        debugPrint("ERROR WITH LOCATION SERVICES 2");
        _showMessageDialog("Error!", "Please enable location services.");
        return;
      }
      if (permission == LocationPermission.deniedForever) {
        debugPrint("ERROR WITH LOCATION SERVICES 3");
        _showMessageDialog("Error!",
            "Location permissions are permanently denied. Please enable them in settings.");
        await Geolocator.openAppSettings();
        return;
      }
    } else if (permission == LocationPermission.deniedForever) {
      debugPrint("ERROR WITH LOCATION SERVICES 3");
      _showMessageDialog("Error!",
          "Location permissions are permanently denied. Please enable them in settings.");
      await Geolocator.openAppSettings();
      return;
    }

    // Save the subscription so we can cancel it in dispose.
    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    ).listen(
      (Position position) {
        if (!mounted) return; // Check if widget is still mounted.
        debugPrint("User location updated: ${position.latitude}, ${position.longitude}");
        setState(() {
          userLocation = LatLng(position.latitude, position.longitude);
          userHeading = position.heading;
          _updateNearestIndicator();
        });
      },
      onError: (error) {
        debugPrint("Error receiving location updates: $error");
      },
    );
  }

  /// Update the nearest path indicator on the polylines.
  void _updateNearestIndicator() {
    if (userLocation == null || geoJsonPolylines.isEmpty) return;
    final points = geoJsonPolylines.first.points;
    if (points.isEmpty) return;

    double minDistance = double.infinity;
    LatLng closest = points.first;
    for (var point in points) {
      double distance = _distanceBetween(userLocation!, point);
      if (distance < minDistance) {
        minDistance = distance;
        closest = point;
      }
    }
    setState(() {
      nearestIndicatorPoint = closest;
    });
  }

  double _distanceBetween(LatLng a, LatLng b) {
    return sqrt(pow(a.latitude - b.latitude, 2) + pow(a.longitude - b.longitude, 2));
  }

  // ======================================================================
  // New Methods: Weekday Menu, Fetch Classes, and Display Classes
  // ======================================================================

  void _showWeekdayMenu() {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext context) {
        return ListView(
          children: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
              .map((String day) {
            return ListTile(
              title: Text(day),
              onTap: () {
                Navigator.pop(context); // Close the bottom sheet.
                _fetchClassesByWeekday(day);
              },
            );
          }).toList(),
        );
      },
    );
  }

  Future<void> _fetchClassesByWeekday(String day) async {
    final Map<String, int> weekdayMap = {
      "Monday": 0,
      "Tuesday": 1,
      "Wednesday": 2,
      "Thursday": 3,
      "Friday": 4,
    };
    int weekdayInt = weekdayMap[day]!;

    final classesUrl = Uri.parse('$apiUrl/api/users/classes?username=${globals.currentUser}');
    final classesResponse = await http.get(classesUrl, headers: {'Content-Type': 'application/json'});

    if (classesResponse.statusCode != 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error fetching classes: ${classesResponse.statusCode}")),
      );
      return;
    }

    List<dynamic> classesData = jsonDecode(classesResponse.body);

    final cbwUrl = Uri.parse('$apiUrl/api/schedule/cbw');
    final cbwResponse = await http.post(
      cbwUrl,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        "classes": classesData,
        "weekday": weekdayInt,
      }),
    );

    if (cbwResponse.statusCode != 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error fetching schedule: ${cbwResponse.statusCode}")),
      );
      return;
    }

    List<dynamic> sortedClasses = jsonDecode(cbwResponse.body);
    _showClassesDialog(sortedClasses, day);
  }

    void _showClassesDialog(List<dynamic> classes, String day) {
    if (classes.isEmpty) {
      showDialog(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: Text("Classes for $day"),
            content: const Text("No classes found for the selected day."),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text("Close"),
              ),
            ],
          );
        },
      );
      return;
    }
    
    // Create a list of booleans for selection state.
    List<bool> selected = List.filled(classes.length, false);
    
    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setStateDialog) {
            return AlertDialog(
              title: Text("Select Classes for $day"),
              content: SizedBox(
                width: double.maxFinite,
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: classes.length,
                  itemBuilder: (BuildContext context, int index) {
                    final classItem = classes[index];
                    String className = classItem["class_name"] ?? "Unnamed Class";
                    String building = classItem["building"] ?? "Unknown";
                    
                    return CheckboxListTile(
                      value: selected[index],
                      onChanged: (bool? value) {
                        setStateDialog(() {
                          selected[index] = value ?? false;
                        });
                      },
                      title: Text(className),
                      subtitle: Text("Building: $building"),
                    );
                  },
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    // Build a list of only the selected classes.
                    List<dynamic> selectedClasses = [];
                    for (int i = 0; i < classes.length; i++) {
                      if (selected[i]) {
                        selectedClasses.add(classes[i]);
                      }
                    }
                    Navigator.pop(context);
                    _traceClassPaths(day, selectedClasses);
                  },
                  child: const Text("Trace Path"),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("Close"),
                ),
              ],
            );
          },
        );
      },
    );
  }
  
  Future<void> _traceClassPaths(String day, List<dynamic> sortedClasses) async {
  // Extract building names from the sorted classes.
  List<String> buildingNames =
      sortedClasses.map((classItem) => classItem["building"] as String).toList();

  if (buildingNames.length < 2) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Not enough classes to trace a path.")),
    );
    return;
  }

  List<Polyline> combinedPolylines = [];
  // This map stores a marker coordinate for each building index.
  Map<int, LatLng> buildingMarkerCoords = {};

  // Loop over consecutive pairs of buildings.
  for (int i = 0; i < buildingNames.length - 1; i++) {
    final from = buildingNames[i];
    final to = buildingNames[i + 1];

    // Detect consecutive duplicates.
    if (from == to) {
      // Notify the user that the two classes are in the same building.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Classes at '$from' are in the same building. Skipping trace between them."),
        ),
      );
      continue;
    }

    // Proceed normally if the two buildings differ.
    final encodedFrom = Uri.encodeComponent(from);
    final encodedTo = Uri.encodeComponent(to);
    final url = Uri.parse(
      '$apiUrl/api/locations/getPath?location1=$encodedFrom&location2=$encodedTo',
    );

    try {
      final response =
          await http.get(url, headers: {'Content-Type': 'application/json'});
      if (response.statusCode != 200) {
        debugPrint("Error fetching path between '$from' and '$to': ${response.statusCode}");
        continue;
      }
      // Skip if the response appears to be an HTML error page.
      if (response.body.trim().startsWith('<')) {
        debugPrint("Unexpected HTML response for path between '$from' and '$to'");
        continue;
      }

      final geoJson = jsonDecode(response.body);
      if (!geoJson.containsKey('path') || geoJson['path'] is! List) {
        debugPrint("Invalid JSON structure for path between '$from' and '$to'");
        continue;
      }

      final features = geoJson['path'] as List;
      // Variables to capture the starting and ending coordinates for this segment.
      LatLng? segmentStart;
      LatLng? segmentEnd;

      // Loop through each feature and process LineStrings.
      for (var feature in features) {
        final geometry = feature['geometry'];
        if (geometry['type'] == 'LineString') {
          final coordsList = geometry['coordinates'] as List;
          List<LatLng> points = [];
          for (var coords in coordsList) {
            // Note: Coordinates are given as [lng, lat].
            double lng = coords[0];
            double lat = coords[1];
            points.add(LatLng(lat, lng));
          }
          if (points.isNotEmpty) {
            // Add the polyline segment to the route.
            combinedPolylines.add(
              Polyline(points: points, strokeWidth: 4.0, color: Colors.blueAccent),
            );
            // Record the first valid coordinate (if not already set) and always update the last one.
            segmentStart ??= points.first;
            segmentEnd = points.last;
          }
        }
      }

      // If valid coordinates were obtained, update the marker coordinate mapping.
      if (segmentStart != null && segmentEnd != null) {
        // For the very first segment, assign the starting coordinate.
        if (i == 0) {
          buildingMarkerCoords[0] = segmentStart;
        }
        // For each segment, assign the destination coordinate.
        buildingMarkerCoords[i + 1] = segmentEnd;
      }
    } catch (e) {
      debugPrint("Error tracing path between '$from' and '$to': $e");
      continue;
    }
  }

  // Create markers for each building.
  // In the case of consecutive duplicates, only one marker is created.
  List<Marker> buildingMarkers = [];
  for (int index = 0; index < buildingNames.length; index++) {
    // Skip if this is a duplicate of the previous building.
    if (index > 0 && buildingNames[index] == buildingNames[index - 1]) {
      continue;
    }
    if (buildingMarkerCoords.containsKey(index)) {
      LatLng pos = buildingMarkerCoords[index]!;
      Widget iconWidget;
      // Customize the marker icon depending on the building's position in the route.
      if (index == 0) {
        // Start marker.
        iconWidget = const Icon(Icons.location_on, color: Colors.red, size: 40);
      } else if (index == buildingNames.length - 1) {
        // End marker.
        iconWidget = const Icon(Icons.flag, color: Colors.red, size: 40);
      } else {
        // Intermediate building marker.
        iconWidget = const Icon(Icons.location_city, color: Colors.green, size: 40);
      }
      buildingMarkers.add(
        Marker(
          point: pos,
          width: 40,
          height: 40,
          child: iconWidget,
        ),
      );
    }
  }

  // If we successfully created polylines and have markers, update the map.
  if (combinedPolylines.isNotEmpty && buildingMarkers.isNotEmpty) {
    setState(() {
      geoJsonPolylines.clear();
      geoJsonPolylines.addAll(combinedPolylines);
      routeMarkers.clear();
      routeMarkers.addAll(buildingMarkers);
    });
    debugPrint("Traced path between classes for $day");
  } else {
    debugPrint("No valid paths found for classes on $day");
  }
}

  @override
  void dispose() {
    // Cancel the location stream subscription to avoid setState after widget is disposed.
    _positionStreamSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        /// The map.
        FlutterMap(
          mapController: mapController,
          options: MapOptions(
            interactionOptions: InteractionOptions(flags: InteractiveFlag.all),
            initialCenter: LatLng(28.6024, -81.2001),
            initialZoom: 15.0,
            minZoom: 2.0,
            maxZoom: 19.0,
            onTap: (tapPosition, latlng) => handleMapTap(latlng),
          ),
          children: [
            /// Base tile layer.
            TileLayer(
              urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              subdomains: ['a', 'b', 'c'],
            ),

            /// Edges as polylines.
            PolylineLayer(
              polylines: edges.map((edge) {
                Node? node1 = nodes.firstWhereOrNull((n) => n.id == edge.node1);
                Node? node2 = nodes.firstWhereOrNull((n) => n.id == edge.node2);
                if (node1 == null || node2 == null) return null;
                return Polyline(
                  points: [node1.latlng, node2.latlng],
                  strokeWidth: 3.0,
                  color: Colors.black,
                );
              }).whereType<Polyline>().toList(),
            ),

            /// GeoJSON polylines (route).
            PolylineLayer(
              polylines: geoJsonPolylines,
            ),

            /// Invisible markers for edge deletion.
            MarkerLayer(
              markers: edges.map((edge) {
                Node? node1 = nodes.firstWhereOrNull((n) => n.id == edge.node1);
                Node? node2 = nodes.firstWhereOrNull((n) => n.id == edge.node2);
                if (node1 == null || node2 == null) return null;
                LatLng mid = LatLng(
                  (node1.latlng.latitude + node2.latlng.latitude) / 2,
                  (node1.latlng.longitude + node2.latlng.longitude) / 2,
                );
                return Marker(
                  point: mid,
                  width: 20,
                  height: 20,
                  child: GestureDetector(
                    onTap: () {
                      if (mode == "delete") {
                        deleteEdge(edge.id);
                      }
                    },
                    child: Container(
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.transparent,
                      ),
                    ),
                  ),
                );
              }).whereType<Marker>().toList(),
            ),

            /// Nodes as markers.
            MarkerLayer(
              markers: nodes.map((node) {
                bool isPathNode = pathNodes.any((pn) => pn.id == node.id);
                return Marker(
                  point: node.latlng,
                  width: isPathNode ? 10 : 20,
                  height: isPathNode ? 10 : 20,
                  child: GestureDetector(
                    onTap: () => handleNodeTap(node),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: node.color,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            /// Route markers (start and end).
            MarkerLayer(
              markers: routeMarkers,
            ),

            /// User location and nearest path indicator.
            MarkerLayer(
              markers: [
                if (userLocation != null)
                  Marker(
                    point: userLocation!,
                    width: 30,
                    height: 30,
                    child: Transform.rotate(
                      angle: userHeading * pi / 180.0,
                      child: const Icon(Icons.navigation,
                          color: Colors.blue, size: 30),
                    ),
                  ),
              ],
            ),
          ],
        ),

        /// Controls overlay at the top.
        SafeArea(
          child: Container(
            margin: const EdgeInsets.all(8.0),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  "Hello, ${(globals.currentUser == null || globals.currentUser!.isEmpty) ? 'Guest' : globals.currentUser![0].toUpperCase() + globals.currentUser!.substring(1)}",
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Row(
                  children: [
                    const Text("To:",
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w500)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Autocomplete<String>(
                        optionsBuilder: (TextEditingValue textEditingValue) {
                          if (textEditingValue.text.isEmpty) {
                            return buildingOptions;
                          } else {
                            return buildingOptions.where((option) => option
                                .toLowerCase()
                                .contains(textEditingValue.text.toLowerCase()));
                          }
                        },
                        fieldViewBuilder: (
                          BuildContext context,
                          TextEditingController textEditingController,
                          FocusNode focusNode,
                          VoidCallback onFieldSubmitted,
                        ) {
                          _toInternalController = textEditingController;
                          return TextField(
                            controller: textEditingController,
                            focusNode: focusNode,
                            onEditingComplete: onFieldSubmitted,
                            decoration: const InputDecoration(
                              hintText: 'Type building name...',
                            ),
                          );
                        },
                        onSelected: (String toSelection) {
                          setState(() {
                            selectedTo = toSelection;
                          });
                          debugPrint("To: $toSelection");
                        },
                      ),
                    ),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextButton(
                      onPressed: () {
                        FocusScope.of(context).unfocus();
                        navigation(selectedFrom, selectedTo);
                      },
                      child: const Text(
                        "Navigate",
                        style: TextStyle(
                            fontSize: 16,
                            color: Color.fromARGB(255, 255, 196, 0)),
                      ),
                    ),
                    TextButton(
                      onPressed: clearMap,
                      child: const Text(
                        "Clear",
                        style: TextStyle(
                            fontSize: 16,
                            color: Color.fromARGB(255, 255, 196, 0)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        /// New button at the bottom left for "Classes By Day".
        Stack(
          children: [
            Positioned(
              bottom: 16.0,
              left: 16.0,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                ),
                onPressed: _showWeekdayMenu,
                child: const Text(
                  "Classes By Day",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Colors.black,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}