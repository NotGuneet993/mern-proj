'''
Overpass API query: 
    Link: https://overpass-turbo.eu/

[out:xml];
area[name="University of Central Florida"]->.searchArea;
(
  node(area.searchArea);
  way(area.searchArea);
  relation(area.searchArea);
);
out body;
'''

# Path to your .osm file
import xml.etree.ElementTree as ET
import networkx as nx
import matplotlib.pyplot as plt

import xml.etree.ElementTree as ET

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
    
    if is_building and len(building_nodes) > 2:
        lat_mean = sum(nodes[n]["lat"] for n in building_nodes) / len(building_nodes)
        lon_mean = sum(nodes[n]["lon"] for n in building_nodes) / len(building_nodes)
        centroid_id = max(nodes.keys()) + 1
        nodes[centroid_id] = {"lat": lat_mean, "lon": lon_mean, "name": None, "highway": "highway"}
        building_centroids[building_id] = centroid_id
        
        entrances = []
        for nd in way.findall('nd'):
            node_id = nd.attrib['ref']
            for node in root.findall(f"node[@id='{node_id}']"):
                for tag in node.findall('tag'):
                    if tag.attrib['k'] == "entrance" and tag.attrib['v'] in ["yes", "main"]:
                        entrance_id = int(node.attrib['id'])
                        entrances.append(entrance_id)
                        valid_edges.append((entrance_id, centroid_id, {"highway": "entrance"}))
        
        if entrances:
            building_entrances[building_id] = entrances

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



for u, v in G.edges():
    lat1, lon1 = G.nodes[u]['lat'], G.nodes[u]['lon']
    lat2, lon2 = G.nodes[v]['lat'], G.nodes[v]['lon']
    
    distance = haversine_miles(lat1, lon1, lat2, lon2)
    
    # Store the distance as an edge attribute
    G[u][v]['distance'] = distance

# Display node and edge counts
print(f'There are {G.number_of_nodes()} nodes and {G.number_of_edges()} edges in this graph')

# Plot the graph
pos = {node: (G.nodes[node]['lon'], G.nodes[node]['lat']) for node in G.nodes}

plt.figure(figsize=(12, 15), facecolor='black')
nx.draw(G, pos, node_size=1, node_color='white', edge_color=None, with_labels=False)
plt.savefig('assets/map_img_base.png', facecolor='black')
plt.savefig('assets/map_img_base_transparent.png', transparent=True)
plt.show()


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