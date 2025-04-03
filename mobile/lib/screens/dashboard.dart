import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:collection/collection.dart'; // For firstWhereOrNull
import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'schedule.dart';
import 'package:mobile/globals.dart' as globals;
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:math';
import 'package:geolocator/geolocator.dart';

final API_URL = dotenv.env['VITE_API_URL'];

void main() {
  runApp(MaterialApp(
    home: DashboardScreen(),
    debugShowCheckedModeBanner: false,
  ));
}

// ----------------------- Graph Map Code -----------------------

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

class GraphMap extends StatefulWidget {
  const GraphMap({super.key});

  @override
  _GraphMapState createState() => _GraphMapState();
}

class _GraphMapState extends State<GraphMap> {
  List<Node> nodes = [];
  List<Node> pathNodes = [];
  List<Edge> edges = [];
  List<Polyline> geoJsonPolylines = [];
  
  List<String> buildingOptions = [];
  String? selectedFrom;
  String? selectedTo;
  Key fromAutocompleteKey = UniqueKey();
  Key toAutocompleteKey = UniqueKey();
  TextEditingController? _fromInternalController;
  TextEditingController? _toInternalController;

  final TextEditingController fromController = TextEditingController();
  final TextEditingController toController = TextEditingController();
  // Mode is kept in case you want to add interactions later.
  String mode = "none"; // "addNode", "connectNodes", "delete", or "none"
  List<Node> selectedNodes = [];
  String nodeLabel = "";
  TextEditingController nodeLabelController = TextEditingController();
  final MapController mapController = MapController();
  LatLng? userLocation;
  LatLng? nearestIndicatorPoint;
  double userHeading = 0.0;

  @override
  void initState() {
    super.initState();
    loadBuildingOptions();
    _initLocationTracking();
    _testCurrentPosition();
  }

  void _testCurrentPosition() async {
    try {
      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      print("Current position: ${position.latitude}, ${position.longitude}");
    } catch (e) {
      print("Error getting current position: $e");
    }
  }
  
  void clearMap() {
    setState(() {
      // Clear dropdown selections
      selectedFrom = null;
      selectedTo = null;

      // Clear the internal Autocomplete controllers if they exist
      _fromInternalController?.clear();
      _toInternalController?.clear();

      // Remove path nodes from the main nodes list
      for (final n in pathNodes) {
        nodes.remove(n);
      }
      pathNodes.clear();

      // Clear polylines
      geoJsonPolylines.clear();
    });
  }

  // When the map is tapped, add a node if in "addNode" mode.
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
            child: const Text('OK'),
          )
        ],
      ),
    );
  }

  // Implement navigation for map
  Future<void> navigation(String? from, String? to) async {
  if (from == null || to == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Please select both From and To locations.")),
    );
    return;
  }
  print("Navigating from: $from to: $to");

  final encodedFrom = Uri.encodeComponent(from);
  final encodedTo = Uri.encodeComponent(to);

  final response = await http.get(
    Uri.parse('$API_URL/api/locations/getPath?location1=$encodedFrom&location2=$encodedTo'),
    headers: {'Content-Type': 'application/json'},
  );

  print("Response status: ${response.statusCode}");
  print("Response body: ${response.body}");

  // Check if the response body is HTML rather than JSON.
  if (response.body.trim().startsWith('<')) {
    print("Received HTML response instead of JSON.");
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Error: Unexpected HTML response from server.")),
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
    // Make sure 'path' exists and is a List
    if (!geoJson.containsKey('path') || geoJson['path'] is! List) {
      print('Invalid JSON structure - missing "path"');
      return;
    }
    
    final features = geoJson['path'] as List;
    List<Node> newNodes = [];
    List<Polyline> newPolylines = [];

    for (var feature in features) {
      final geometry = feature['geometry'];
      final properties = feature['properties'];
      final type = geometry['type'];
      if (type == 'Point') {
        // Coordinates are [lng, lat]
        final coords = geometry['coordinates'];
        double lng = coords[0];
        double lat = coords[1];
        String id = properties['id']?.toString() ?? 'node-${DateTime.now().millisecondsSinceEpoch}';
        String label = properties['name']?.toString() ?? '';
        newNodes.add(Node(
          id: id,
          latlng: LatLng(lat, lng),
          label: label,
          color: label.isNotEmpty ? Colors.red : Colors.blue,
        ));
      } else if (type == 'LineString') {
        // Coordinates is a list of [lng, lat] pairs
        final coordsList = geometry['coordinates'] as List;
        List<LatLng> points = [];
        for (var coords in coordsList) {
          double lng = coords[0];
          double lat = coords[1];
          points.add(LatLng(lat, lng));
        }
          newPolylines.add(Polyline(
            points: points,
            strokeWidth: 4.0,
            color: Colors.blueAccent,
          ));
      }
    }

    setState(() {
      // 1. Remove any old path nodes
      for (final n in pathNodes) {
        nodes.remove(n);
      }
      pathNodes.clear();

      // 2. Clear the old polylines
      geoJsonPolylines.clear();

      // 3. Add new path data
      pathNodes.addAll(newNodes);
      nodes.addAll(newNodes);
      geoJsonPolylines.addAll(newPolylines);
    });

    print('Added ${newNodes.length} nodes and ${newPolylines.length} polylines from GeoJSON.');
    } catch (e) {
      print("JSON decoding error: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("JSON decoding error")),
      );
    }
  }

  Future<String> getClasses() async {
    final response = await http.get(
        Uri.parse('$API_URL/api/locations/getLocation'),
        headers: {'Content-Type': 'application/json'},
      );
    
    return response.body;
  }

  Future<void> loadBuildingOptions() async {
    String options = await getClasses();
    var decoded = jsonDecode(options) as List;
    setState(() {
      buildingOptions = decoded.map((option) => option.toString()).toList();
    });
  }

  // When a node is tapped.
  void handleNodeTap(Node node) {
    if (mode == "connectNodes") {
      if (selectedNodes.isEmpty) {
        setState(() {
          selectedNodes.add(node);
          node.color = Colors.yellow; // indicate selection
        });
      } else {
        Node node1 = selectedNodes.first;
        Node node2 = node;
        if (node1.id == node2.id) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("A node cannot connect to itself!")),
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
          // Restore original colors for the nodes.
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

  // Delete a node and its associated edges.
  void deleteNode(String id) {
    setState(() {
      nodes.removeWhere((n) => n.id == id);
      edges.removeWhere((e) => e.node1 == id || e.node2 == id);
    });
  }

  // Delete an edge.
  void deleteEdge(String id) {
    setState(() {
      edges.removeWhere((e) => e.id == id);
      mode = "none";
    });
  }

  // Save graph data as JSON to a file.
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

  // Load graph data from a JSON file.
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
          SnackBar(content: Text("Graph loaded from file.")),
        );
      } catch (error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Invalid file format.")),
        );
      }
    }
  }

  Future<void> _initLocationTracking() async {
    print("Initializing location tracking...");
 
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showMessageDialog("Error!", "Please enable location services.");
      print("ERROR WITH LOCATION SERVICES 1");
      return;
    }
 
    LocationPermission permission = await Geolocator.checkPermission();
 
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
 
      if (permission == LocationPermission.denied) {
        print("ERROR WITH LOCATION SERVICES 2");
        _showMessageDialog("Error!", "Please enable location services.");
        return;
      }
 
      if (permission == LocationPermission.deniedForever) {
        print("ERROR WITH LOCATION SERVICES 3");
        _showMessageDialog("Error!", "Location permissions are permanently denied. Please enable them in settings.");
        await Geolocator.openAppSettings();
        return;
      }
    } else if (permission == LocationPermission.deniedForever) {
      print("ERROR WITH LOCATION SERVICES 3");
      _showMessageDialog("Error!", "Location permissions are permanently denied. Please enable them in settings.");
      await Geolocator.openAppSettings();
      return;
    }
 
    // If we reach here, permissions are granted.
    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    ).listen(
      (Position position) {
        print("User location updated: ${position.latitude}, ${position.longitude}");
        setState(() {
          userLocation = LatLng(position.latitude, position.longitude);
          userHeading = position.heading; // Update heading
          _updateNearestIndicator();
        });
      },
      onError: (error) {
        print("Error receiving location updates: $error");
      },
    );
  }

  void _updateNearestIndicator() {
    if (userLocation == null || geoJsonPolylines.isEmpty) return;
    // Use the first polyline's points as the path.
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

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        FlutterMap(
          mapController: mapController,
          options: MapOptions(
            interactionOptions: InteractionOptions(
                    flags: InteractiveFlag.all),
            initialCenter: LatLng(28.6024, -81.2001),
            initialZoom: 15.0,
            minZoom: 2.0,   // allow zooming out further
            maxZoom: 19.0,  // allow zooming in closer
            onTap: (tapPosition, latlng) {
              handleMapTap(latlng);
            },
          ),
          children: [
            TileLayer(
              urlTemplate: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
              subdomains: ['a', 'b', 'c'],
            ),
            // Draw edges as polylines.
            PolylineLayer(
              polylines: edges.map((edge) {
                Node? node1 = nodes.firstWhereOrNull((n) => n.id == edge.node1);
                Node? node2 = nodes.firstWhereOrNull((n) => n.id == edge.node2);
                if (node2 == null) return null;
                return Polyline(
                  points: [node1!.latlng, node2.latlng],
                  strokeWidth: 3.0,
                  color: Colors.black,
                );
              }).whereType<Polyline>().toList(),
            ),
            // Draw polylines from GeoJSON
            PolylineLayer(
              polylines: geoJsonPolylines,
            ),
            // Overlay a transparent marker at each edge's midpoint for deletion.
            MarkerLayer(
              markers: edges.map((edge) {
                Node? node1 = nodes.firstWhereOrNull((n) => n.id == edge.node1);
                Node? node2 = nodes.firstWhereOrNull((n) => n.id == edge.node2);
                if (node2 == null) return null;
                LatLng mid = LatLng(
                  (node1!.latlng.latitude + node2.latlng.latitude) / 2,
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
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.transparent,
                      ),
                    ),
                  ),
                );
              }).whereType<Marker>().toList(),
            ),
            // Draw nodes as markers.
            MarkerLayer(
              markers: nodes.map((node) {
                bool isPathNode = pathNodes.any((pn) => pn.id == node.id);
                return Marker(
                  point: node.latlng,
                  width: isPathNode ? 10 : 20,
                  height: isPathNode ? 10 : 20,
                  child: GestureDetector(
                    onTap: () {
                      handleNodeTap(node);
                    },
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
            MarkerLayer(
              markers: [
                // Marker for the user's current location
                if (userLocation != null)
                  Marker(
                    point: userLocation!,
                    width: 30,
                    height: 30,
                    child: Transform.rotate(
                      angle: userHeading * 3.14159265359 / 180, // Convert degrees to radians
                      child: Icon(
                        Icons.navigation,
                        color: Colors.blue,
                        size: 30,
                      ),
                    ),
                  ),
                // Marker for the nearest point on the generated path
                if (nearestIndicatorPoint != null)
                  Marker(
                    point: nearestIndicatorPoint!,
                    width: 20,
                    height: 20,
                    child: const Icon(
                      Icons.arrow_upward,
                      color: Colors.green,
                      size: 20,
                    ),
                  ),
              ],
            ),
          ],
        ),
        // Greeting overlay at the top.
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
                  "Hello, ${globals.currentUser ?? 'Guest'}",
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Row(
                  children: [
                    Text(
                      "From: ",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: Autocomplete<String>(
                        // Removed the key parameter to let the widget manage its internal controller
                        optionsBuilder: (TextEditingValue textEditingValue) {
                          if (textEditingValue.text.isEmpty) {
                            return buildingOptions;
                          } else {
                            return buildingOptions.where((String option) =>
                                option.toLowerCase().contains(textEditingValue.text.toLowerCase()));
                          }
                        },
                        fieldViewBuilder: (
                          BuildContext context,
                          TextEditingController textEditingController,
                          FocusNode focusNode,
                          VoidCallback onFieldSubmitted,
                        ) {
                          // Capture the provided controller for later use
                          _fromInternalController = textEditingController;
                          return TextField(
                            controller: textEditingController,
                            focusNode: focusNode,
                            onEditingComplete: onFieldSubmitted,
                            decoration: const InputDecoration(
                              hintText: 'Type building name...',
                            ),
                          );
                        },
                        onSelected: (String fromSelection) {
                          setState(() {
                            selectedFrom = fromSelection;
                          });
                          print("From: $fromSelection");
                        },
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Text(
                      "To: ",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: Autocomplete<String>(
                        // Removed the key parameter
                        optionsBuilder: (TextEditingValue textEditingValue) {
                          if (textEditingValue.text.isEmpty) {
                            return buildingOptions;
                          } else {
                            return buildingOptions.where((String option) =>
                                option.toLowerCase().contains(textEditingValue.text.toLowerCase()));
                          }
                        },
                        fieldViewBuilder: (
                          BuildContext context,
                          TextEditingController textEditingController,
                          FocusNode focusNode,
                          VoidCallback onFieldSubmitted,
                        ) {
                          // Capture the provided controller for later use
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
                          print("To: $toSelection");
                        },
                      ),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () {
                    FocusScope.of(context).unfocus();
                    navigation(selectedFrom, selectedTo);
                  },
                  child: const Text(
                    "Navigate",
                    style: TextStyle(fontSize: 16, color:  Color.fromARGB(255, 236, 220, 39)),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    clearMap();
                  },
                  child: const Text(
                    "Clear",
                    style: TextStyle(fontSize: 16, color:  Color.fromARGB(255, 236, 220, 39)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ----------------------- Dashboard Code -----------------------

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    SchedulePage(globalUser: "testUser"),
    GraphMap(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex], // Show the selected page
      bottomNavigationBar: SafeArea(
      child: BottomAppBar(
        height: 44, // Increase slightly to avoid overflow
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            GestureDetector(
              onTap: () => setState(() => _currentIndex = 0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.schedule,
                      size: 20,
                      color: _currentIndex == 0 ? Colors.blue : Colors.grey)
                ],
              ),
            ),
            GestureDetector(
              onTap: () => setState(() => _currentIndex = 1),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.map,
                      size: 20,
                      color: _currentIndex == 1 ? Colors.blue : Colors.grey)
                ],
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }
}