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
  List<Edge> edges = [];
  // Mode is kept in case you want to add interactions later.
  String mode = "none"; // "addNode", "connectNodes", "delete", or "none"
  List<Node> selectedNodes = [];
  String nodeLabel = "";
  TextEditingController nodeLabelController = TextEditingController();
  final MapController mapController = MapController();

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

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        FlutterMap(
          mapController: mapController,
          options: MapOptions(
            initialCenter: LatLng(28.6024, -81.2001),
            initialZoom: 15.0,
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
                return Marker(
                  point: node.latlng,
                  width: 20,
                  height: 20,
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
          ],
        ),
        // Greeting overlay at the top.
        SafeArea(
          child: Container(
            margin: const EdgeInsets.all(8.0),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.8),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              "Hello, ${globals.currentUser ?? 'Guest'}",
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
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

class _DashboardScreenState extends State<DashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        backgroundColor: const Color.fromARGB(255, 236, 220, 39),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: "Dashboard"),
            Tab(text: "Graph Map"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Blank dashboard screen.
          SchedulePage(globalUser: "testUser"),
          // Map screen.
          GraphMap(),
        ],
      ),
    );
  }
}
