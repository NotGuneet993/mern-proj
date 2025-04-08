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
      debugPrint("Current position: ${position.latitude}, ${position.longitude}");
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
              onPressed: () => Navigator.of(context).pop(), child: const Text('OK')),
        ],
      ),
    );
  }

  /// Make a GET request to fetch a route from "from" to "to".
  /// This method extracts the first and last coordinates from all LineString features,
  /// then creates a polyline along with start and end markers.
  Future<void> navigation(String? from, String? to) async {
    if (from == null || to == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select both From and To locations.")),
      );
      return;
    }
    debugPrint("Navigating from: $from to: $to");

    final encodedFrom = Uri.encodeComponent(from);
    final encodedTo = Uri.encodeComponent(to);
    final url = Uri.parse(
        '$apiUrl/api/locations/getPath?location1=$encodedFrom&location2=$encodedTo');
    final response =
        await http.get(url, headers: {'Content-Type': 'application/json'});

    debugPrint("Response status: ${response.statusCode}");
    debugPrint("Response body: ${response.body}");

    // Check if the response body is HTML rather than JSON.
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
      // Initialize the first and last coordinate variables.
      LatLng? firstCoord;
      LatLng? lastCoord;
      List<Polyline> newPolylines = [];

      // Process each feature.
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
            Polyline(
              points: points,
              strokeWidth: 4.0,
              color: Colors.blueAccent,
            ),
          );
          if (coordsList.isNotEmpty) {
            if (firstCoord == null) {
              final c = coordsList.first;
              firstCoord = LatLng(c[1], c[0]);
            }
            final cLast = coordsList.last;
            lastCoord = LatLng(cLast[1], cLast[0]);
          }
        }
      }

      // Check that we obtained valid start and end coordinates.
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

          // Add the new polyline(s) and markers.
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
    final response =
        await http.get(url, headers: {'Content-Type': 'application/json'});
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

  /// Called when tapping on an existing node (if in connect or delete mode).
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

  /// Delete a node and its associated edges.
  void deleteNode(String id) {
    setState(() {
      nodes.removeWhere((n) => n.id == id);
      edges.removeWhere((e) => e.node1 == id || e.node2 == id);
    });
  }

  /// Delete an edge.
  void deleteEdge(String id) {
    setState(() {
      edges.removeWhere((e) => e.id == id);
      mode = "none";
    });
  }

  /// Save graph data as JSON to a file on device storage.
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

  /// Load graph data from a local JSON file.
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

    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    ).listen(
      (Position position) {
        debugPrint(
            "User location updated: ${position.latitude}, ${position.longitude}");
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

  /// Simple Euclidean distance (for demonstration).
  double _distanceBetween(LatLng a, LatLng b) {
    return sqrt(pow(a.latitude - b.latitude, 2) + pow(a.longitude - b.longitude, 2));
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        /// The map
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
              urlTemplate: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
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
                      child: const Icon(Icons.navigation, color: Colors.blue, size: 30),
                    ),
                  ),
                if (nearestIndicatorPoint != null)
                  Marker(
                    point: nearestIndicatorPoint!,
                    width: 20,
                    height: 20,
                    child: const Icon(Icons.arrow_upward, color: Colors.green, size: 20),
                  ),
              ],
            ),
          ],
        ),

        /// Controls overlay.
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
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Row(
                  children: [
                    const Text("From:", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Autocomplete<String>(
                        optionsBuilder: (TextEditingValue textEditingValue) {
                          if (textEditingValue.text.isEmpty) {
                            return buildingOptions;
                          } else {
                            return buildingOptions.where((option) =>
                                option.toLowerCase().contains(textEditingValue.text.toLowerCase()));
                          }
                        },
                        fieldViewBuilder: (
                          BuildContext context,
                          TextEditingController textEditingController,
                          FocusNode focusNode,
                          VoidCallback onFieldSubmitted,
                        ) {
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
                          debugPrint("From: $fromSelection");
                        },
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Text("To:", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Autocomplete<String>(
                        optionsBuilder: (TextEditingValue textEditingValue) {
                          if (textEditingValue.text.isEmpty) {
                            return buildingOptions;
                          } else {
                            return buildingOptions.where((option) =>
                                option.toLowerCase().contains(textEditingValue.text.toLowerCase()));
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
                TextButton(
                  onPressed: () {
                    FocusScope.of(context).unfocus();
                    navigation(selectedFrom, selectedTo);
                  },
                  child: const Text(
                    "Navigate",
                    style: TextStyle(fontSize: 16, color: Color.fromARGB(255, 236, 220, 39)),
                  ),
                ),
                TextButton(
                  onPressed: clearMap,
                  child: const Text(
                    "Clear",
                    style: TextStyle(fontSize: 16, color: Color.fromARGB(255, 236, 220, 39)),
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