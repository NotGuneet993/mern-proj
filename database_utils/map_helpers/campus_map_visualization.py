'''
Overpass API query: 
    Link: https://overpass-turbo.eu/

Query:

[out:xml];
area[name="University of Central Florida"]->.searchArea;
(
  node(area.searchArea);
  way(area.searchArea);
  relation(area.searchArea);
);
out body;
'''


from math import radians, sin, cos, sqrt, atan2

def haversine_miles(lat1, lon1, lat2, lon2):
    R = 3958.8  # Earth's radius in miles

    # Convert degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Compute differences
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    # Apply Haversine formula
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c  # Distance in miles

# Path to your .osm file
import xml.etree.ElementTree as ET
import networkx as nx
import matplotlib.pyplot as plt

osm_file = "database_utils/map_helpers/map_data/campus_base_map.osm"

# Parse the OSM XML file
tree = ET.parse(osm_file)
root = tree.getroot()

# REMOVE ALL UNNECESSARY FEATURES
'''
- power poles
- power lines
- power switches
- power transformers
- no turning here signs
- cell phone towers
- trees
'''
nodes_to_remove = set()
for node in root.findall('node'):
    for tag in node.findall('tag'):
        # Remove power related nodes
        if tag.attrib['k'] == "power" and tag.attrib['v'] in {"pole", "line", "switch", "transformer", "portal"}:
            nodes_to_remove.add(int(node.attrib['id']))
            root.remove(node)
            break  # No need to check more tags for this node
        # Remove the cell phone towers
        elif tag.attrib['k'] == "tower:type" and tag.attrib['v'] == "communication":
            nodes_to_remove.add(int(node.attrib['id']))
            root.remove(node)
            break  # No need to check more tags for this node

        # Remove the trees
        elif tag.attrib['k'] == "natural" and tag.attrib['v'] in {"tree", "tree_row"}:
            nodes_to_remove.add(int(node.attrib['id']))
            root.remove(node)
            break  # No need to check more tags for this node


print(f'Removing {len(nodes_to_remove)} nodes from the graph')

# Create a list of all nodes (id -> node)
nodes = {}
for node in root.findall('node'):
    node_id = int(node.attrib['id'])
    if node_id not in nodes_to_remove:
        lat = float(node.attrib['lat'])
        lon = float(node.attrib['lon'])
        name = None
        for tag in node.findall('tag'):
            if tag.attrib['k'] == "name":
                name = tag.attrib['v']
                break
        nodes[node_id] = {"lat": lat, "lon": lon, "name": name}

# Create a list of valid edges
valid_edges = []
building_centroids = {}
building_entrances = {}
for way in root.findall('way'):
    is_power_line = False
    highway_type = None
    name = None
    building_nodes = []
    building_id = way.attrib['id']
    is_building = False
    
    for tag in way.findall('tag'):
        if tag.attrib['k'] == "power" and tag.attrib['v'] == "line":
            is_power_line = True
            break
        elif tag.attrib['k'] == "highway":
            highway_type = "highway"
        elif tag.attrib['k'] == "name":
            name = tag.attrib['v']
        elif tag.attrib['k'] == "building":
            is_building = True
    
    if is_power_line:
        continue
    
    way_nodes = []
    for nd in way.findall('nd'):
        node_id = int(nd.attrib['ref'])
        if node_id not in nodes_to_remove:
            way_nodes.append(node_id)
            if is_building:
                building_nodes.append(node_id)
    
    for i in range(len(way_nodes) - 1):
        u, v = way_nodes[i], way_nodes[i + 1]
        if u in nodes and v in nodes:
            valid_edges.append((u, v, {"highway": highway_type, "name": name}))


# Remove unwanted power-related relations (except substations, plants, generators)
for relation in root.findall('relation'):
    remove_relation = False
    for tag in relation.findall('tag'):
        if tag.attrib['k'] == "power" and tag.attrib['v'] in {"line", "switch", "transformer"}:
            remove_relation = True
            break
        # Remove driving restriction signs
        elif tag.attrib['k'] == "type" and tag.attrib['v'] == "restriction":
            remove_relation = True
            break

    
    if remove_relation:
        root.remove(relation)



print(f'Graph processing complete. Nodes: {len(nodes)}, Edges: {len(valid_edges)}')

# Create graph and add nodes
G = nx.Graph()

# Add nodes with lat/lon/name
for node_id, attr in nodes.items():
    G.add_node(node_id, lat=attr["lat"], lon=attr["lon"], name=attr["name"])

# Add valid edges
G.add_edges_from(valid_edges)



for u, v in G.edges():
    lat1, lon1 = G.nodes[u]['lat'], G.nodes[u]['lon']
    lat2, lon2 = G.nodes[v]['lat'], G.nodes[v]['lon']
    
    distance = haversine_miles(lat1, lon1, lat2, lon2)
    
    # Store the distance as an edge attribute
    G[u][v]['distance'] = distance

# Display node and edge counts
print(f'There are {G.number_of_nodes()} nodes and {G.number_of_edges()} edges in this graph')

components = list(nx.connected_components(G))

# Print number of components
print(f"Number of connected components: {len(components)}")
component_sizes = [len(c) for c in components]
print(f"Smallest component size: {min(component_sizes)}")
print(f"Largest component size: {max(component_sizes)}")

if not nx.is_connected(G):
    print("Graph has disconnected components!")

import random
def connect_components(G):
    components = list(nx.connected_components(G))
    
    if len(components) == 1:
        print("Graph is already connected!")
        return

    print(f"Fixing {len(components)} disconnected components...")

    # Sort components by size (largest first)
    components = sorted(components, key=len, reverse=True)
    
    main_component = components[0]  # The largest connected component
    for i in range(1, len(components)):  # Iterate through smaller components
        component = components[i]
        
        # Pick a random node from the main component and one from the current component
        node_main = random.choice(list(main_component))
        node_other = random.choice(list(component))

        # Find the closest node in the main component
        min_dist = float("inf")
        best_pair = None
        for node_m in main_component:
            for node_c in component:
                lat1, lon1 = G.nodes[node_m]['lat'], G.nodes[node_m]['lon']
                lat2, lon2 = G.nodes[node_c]['lat'], G.nodes[node_c]['lon']
                dist = haversine_miles(lat1, lon1, lat2, lon2)
                
                if dist < min_dist:
                    min_dist = dist
                    best_pair = (node_m, node_c)

        # Add the best edge
        if best_pair:
            u, v = best_pair
            G.add_edge(u, v, distance=min_dist)
            print(f"Connected {u} ↔ {v} (distance: {min_dist:.3f} miles)")

    print("All components are now connected!")

# Run the function to connect all components
connect_components(G)

# Check again
print(f"New number of components: {len(list(nx.connected_components(G)))}")

# Plot the graph
pos = {node: (G.nodes[node]['lon'], G.nodes[node]['lat']) for node in G.nodes}

plt.figure(figsize=(12, 15), facecolor='black')
nx.draw(G, pos, node_size=1, node_color='white', edge_color=None, with_labels=False)
plt.savefig('database_utils/assets/map_img_base.png', facecolor='black')
nx.draw(G, pos, node_size=1, node_color='white', edge_color='green', with_labels=False)
plt.savefig('database_utils/assets/map_img_base_green.png', transparent=True)

lons = [G.nodes[node]['lon'] for node in G.nodes]
lats = [G.nodes[node]['lat'] for node in G.nodes]

# Plot nodes
plt.figure(figsize=(12, 15), facecolor='black')
plt.axis('off')
plt.scatter(lons, lats, s=1, c='white', marker='o')  # Adjust size and color as neededplt.savefig('assets/map_img_base_transparent.png', transparent=True)
plt.savefig('database_utils/assets/map_img_base_transparent.png', transparent=True)


# Save the graph as a json, then send to mongodb
import json
import networkx as nx
from networkx.readwrite import json_graph

# Convert the graph to a dictionary
graph_data = json_graph.node_link_data(G)

# Save to a JSON file
with open("database_utils/map_helpers/map_data/map.json", "w") as f:
    json.dump(graph_data, f, indent=4)

print("Graph saved as graph.json")


# Convert JSON to GeoJSON format
geojson = {
    "type": "FeatureCollection",
    "features": []
}

location_list = set()

# Extract nodes and convert to GeoJSON Points
for node in graph_data["nodes"]:
    if "lat" in node and "lon" in node:  # Ensure coordinates exist
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [node["lon"], node["lat"]]
            },
            "properties": {
                "id": node["id"],
                "name": node.get("name")
            }
        }
        if feature["properties"]["name"] not in location_list and feature["properties"]["name"] is not None and feature["properties"]["name"] != "null":
            location_list.add(feature["properties"]["name"])
        geojson["features"].append(feature)

# Extract edges and convert to GeoJSON LineStrings
for link in graph_data["links"]:
    source_node = next((n for n in graph_data["nodes"] if n["id"] == link["source"]), None)
    target_node = next((n for n in graph_data["nodes"] if n["id"] == link["target"]), None)
    
    if source_node and target_node:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [source_node["lon"], source_node["lat"]],
                    [target_node["lon"], target_node["lat"]]
                ]
            },
            "properties": {
                "name": link.get("name"),
                "distance": link.get("distance"),
                "source": link["source"],
                "target": link["target"]
            }
        }
        if feature["properties"]["name"] not in location_list and feature["properties"]["name"] is not None and feature["properties"]["name"] != "null":
            location_list.add(feature["properties"]["name"])
        
        geojson["features"].append(feature)



geojson["locations"] = list(location_list)

# Save the GeoJSON file
geojson_path = "database_utils/map_helpers/map_data/map.geojson"
with open(geojson_path, "w") as f:
    json.dump(geojson, f, indent=4)

print(f"GeoJSON saved as {geojson_path}")

'''from pymongo import MongoClient

# --- Upload to MongoDB ---
# Connect to MongoDB (ensure MongoDB is running)
client = MongoClient("mongodb://localhost:27017/")
db = client["campus_navigation"]  # Replace with your DB name
collection = db["maps"]  # Replace with your collection name

# Insert the graph JSON
collection.delete_many({})  # Clears old data before inserting new
collection.insert_one(graph_data)

# Insert the GeoJSON data
collection.insert_one({"geojson": geojson})

print("Graph and GeoJSON uploaded to MongoDB!")

# Close MongoDB connection
client.close()'''
print("Graph and GeoJSON uploaded to MongoDB!")

'''from pyvis.network import Network

# Convert to Pyvis
net = Network(notebook=True, directed=False)

# Function to update the Pyvis graph from NetworkX
def update_pyvis():
    net.from_nx(G)
    net.show("graph.html")

# Function to edit node attributes
def edit_attributes(node_id):
    if node_id not in G.nodes:
        print(f"Node {node_id} does not exist.")
        return
    
    key = input(f"Enter attribute name to update/add for Node {node_id}: ")
    value = input(f"Enter value for '{key}': ")
    G.nodes[node_id][key] = value
    print(f"Updated Node {node_id}: {G.nodes[node_id]}")
    update_pyvis()

# Function to remove a node
def remove_node(node_id):
    if node_id in G.nodes:
        G.remove_node(node_id)
        print(f"Removed Node {node_id}.")
        update_pyvis()
    else:
        print(f"Node {node_id} does not exist.")

# Function to remove an edge
def remove_edge(node1, node2):
    if G.has_edge(node1, node2):
        G.remove_edge(node1, node2)
        print(f"Removed Edge ({node1}, {node2}).")
        update_pyvis()
    else:
        print(f"Edge ({node1}, {node2}) does not exist.")

# Display Initial Graph
update_pyvis()

# Instructions
print("📌 Instructions:")
print("- Open 'graph.html' in a browser to view the graph.")
print("- Run edit_attributes(node_id) to edit a node's attributes.")
print("- Run remove_node(node_id) to delete a node.")
print("- Run remove_edge(node1, node2) to delete an edge.")'''

'''from networkx.readwrite import json_graph

# Generate layout
pos = nx.spring_layout(G)

def draw_graph():
    """ Draws the NetworkX graph with attributes. """
    plt.clf()  # Clear previous plot
    colors = [G.nodes[n].get("color", "gray") for n in G.nodes]
    nx.draw(G, pos, with_labels=True, node_color=colors, edge_color='gray', node_size=15, font_size=10)
    plt.draw()

def on_click(event):
    """ Handles mouse clicks to edit node attributes. """
    if event.xdata is None or event.ydata is None:
        return

    # Find nearest node
    nearest_node = min(G.nodes, key=lambda n: (pos[n][0] - event.xdata) ** 2 + (pos[n][1] - event.ydata) ** 2)

    print(f"Selected node: {nearest_node}, Current Attributes: {G.nodes[nearest_node]}")

    # Ask user for a new color
    new_color = input(f"Enter new color for node {nearest_node} (or press Enter to keep current): ").strip()
    if new_color:
        G.nodes[nearest_node]["color"] = new_color
        draw_graph()

def save_graph_to_json(filename="database_utils/map_helpers/map_data/edited_graph.json"):
    """ Saves the graph to a JSON file. """
    data = json_graph.node_link_data(G)
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)
    print(f"Graph saved to {filename} ✅")

# Setup Matplotlib figure
fig, ax = plt.subplots()
draw_graph()

fig.canvas.mpl_connect("button_press_event", on_click)  # Mouse click listener

plt.show()

# Save graph after editing
save_graph_to_json()'''