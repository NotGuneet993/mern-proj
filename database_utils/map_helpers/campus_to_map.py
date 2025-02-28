import osmnx as ox
import osmium
from shapely.geometry import Point, Polygon

# ======= Step 1: Load OSM Data =======
osm_file = 'database_utils/map_helpers/map_data/my_map.osm'

# Load the graph from the OSM XML file
G = ox.graph_from_xml(osm_file, retain_all=True)

# Save the graph as a GraphML file
ox.save_graphml(G, "database_utils/map_helpers/map_data/base_ucf_graph.graphml")
ox.plot_graph(G)  # Plot the graph

# FIX THIS TODO

# ======= Step 2: Extract Buildings and Entrances =======
# Create an osmium handler to extract buildings and entrances
class OSMHandler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.buildings = []
        self.entrances = []

    def node(self, n):
        if "building" in n.tags:
            self.buildings.append(n)
        if "entrance" in n.tags:
            self.entrances.append(n)

    def way(self, w):
        if "building" in w.tags:
            self.buildings.append(w)
        if "entrance" in w.tags:
            self.entrances.append(w)

# Initialize the osmium handler and apply it to the OSM file
handler = OSMHandler()
handler.apply_file(osm_file)


# TODO Fix the centroid finding

# ======= Step 3: Add Helper Nodes for Each Building =======
for building in handler.buildings:
    if isinstance(building, osmium.osm.Node):
        # For nodes, simply use their lat/lon
        center_node = (building.location.lat, building.location.lon)
    else:
        # For ways, calculate the centroid of the building way
        nodes = [Point(building.nodes[i].lat, building.nodes[i].lon) for i in range(len(building.nodes))]
        polygon = Polygon([(n.x, n.y) for n in nodes])
        center = polygon.centroid
        center_node = (center.x, center.y)

    # Add the center node to the graph
    G.add_node(center_node, building=True)
    
    # Assuming that entrances are extracted by their lat/lon as well (example points)
    for entrance in handler.entrances:
        entrance_point = Point(entrance.location.lon, entrance.location.lat)
        nearest_node = ox.distance.nearest_nodes(G, X=entrance_point.x, Y=entrance_point.y)
        
        # Connect entrance to building center
        G.add_edge(nearest_node, center_node, weight=1)


