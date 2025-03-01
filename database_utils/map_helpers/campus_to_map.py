import osmnx as ox
import matplotlib.pyplot as plt

# Define the place name for University of Central Florida
place_name = "University of Central Florida"

# 1. Download road network (path/streets)
G = ox.graph_from_place(place_name, network_type='all')

# 2. Download geometries (buildings, parks, etc.)
gdf = ox.features_from_place(place_name, tags=None)

# 3. Extract nodes and edges from the road network
nodes, edges = ox.graph_to_gdfs(G)

# Plotting the graph (paths/streets)
fig, ax = plt.subplots(figsize=(12, 12))

# Plot the roads (edges)
edges.plot(ax=ax, linewidth=0.5, edgecolor='gray')

# Plot the buildings and other geometries (gdf contains buildings, parks, etc.)
gdf.plot(ax=ax, color='lightblue', edgecolor='black', alpha=0.7)

# Optional: Add some customizations
ax.set_title(f"University of Central Florida Map", fontsize=15)
ax.set_xlabel("Longitude")
ax.set_ylabel("Latitude")

# Show the plot
plt.show()



# ======= Step 1: Load OSM Data =======
osm_file = 'database_utils/map_helpers/map_data/my_map.osm'

osm_tmp = 'tmp_ucf.osm'
ox.utils.download_osm(bbox=(28.59065, -81.20757, 28.61195, -81.18697), filepath=osm_tmp)

# Load the graph from the OSM XML file
G = ox.graph_from_xml(osm_file, retain_all=True)

traffic_signal_nodes = [node for node, data in G.nodes(data=True) if data.get('highway') == 'traffic_signals']

# Remove the traffic signal nodes from the graph
G.remove_nodes_from(traffic_signal_nodes)

unique_refs = set()
unique_highways = set()

# Iterate through the nodes and collect unique 'ref' and 'highway' values
for node, data in G.nodes(data=True):
    if 'ref' in data:
        unique_refs.add(data['ref'])
    if 'highway' in data:
        unique_highways.add(data['highway'])

# Print the unique values
print("Unique 'ref' values:")
for ref in unique_refs:
    print(ref)

print("\nUnique 'highway' values:")
for highway in unique_highways:
    print(highway)

# Save the graph as a GraphML file
ox.save_graphml(G, "database_utils/map_helpers/map_data/base_ucf_graph.graphml")
ox.plot_graph(G)  # Plot the graph


# Data exploration
print(G.graph)

node_attributes = [data for _, data in G.nodes(data=True)]

# Extract the unique keys (attributes)
unique_attributes = set()
for attributes in node_attributes:
    unique_attributes.update(attributes.keys())

# Print the unique node attributes
print(unique_attributes)

for node, data in list(G.nodes(data=True))[:10]:
    print(f"Node {node}: {data}")



# FIX THIS TODO
'''
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


'''