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


print(f'Removing {len(nodes_to_remove)} nodes from the graph')

# Create a list of all nodes (id -> node)
nodes = {}
for node in root.findall('node'):
    node_id = int(node.attrib['id'])
    if node_id not in nodes_to_remove:  # Ignore node if necessary
        lat = float(node.attrib['lat'])
        lon = float(node.attrib['lon'])
        nodes[node_id] = (lat, lon)

# Create a list of valid edges
valid_edges = []
for way in root.findall('way'):
    # Remove ways that are power lines
    is_power_line = False
    for tag in way.findall('tag'):
        if tag.attrib['k'] == "power" and tag.attrib['v'] == "line":
            is_power_line = True
            break
    
    if is_power_line:
        root.remove(way)
        continue
    
    # Find all nodes in this way
    way_nodes = []
    for nd in way.findall('nd'):
        node_id = int(nd.attrib['ref'])
        if node_id not in nodes_to_remove:  # Ignore edges connected to removed nodes
            way_nodes.append(node_id)
    
    # Add edges if both nodes are valid
    for i in range(len(way_nodes) - 1):
        u, v = way_nodes[i], way_nodes[i + 1]
        if u in nodes and v in nodes:
            valid_edges.append((u, v))

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


# Dictionary to store entrances by building ID
building_entrances = {}

# Dictionary to store building centroids
building_centroids = {}

# Process buildings and compute centroids
for way in root.findall('way'):
    is_building = False
    building_nodes = []
    building_id = way.attrib['id']

    # Check if this way represents a building
    for tag in way.findall('tag'):
        if tag.attrib['k'] == "building":
            is_building = True
            break

    if is_building:
        # Collect all node references for this building
        for nd in way.findall('nd'):
            node_id = int(nd.attrib['ref'])
            if node_id in nodes:
                building_nodes.append(node_id)

        if len(building_nodes) > 2:  # Ensure we have enough nodes to compute a centroid
            # Compute centroid as mean latitude and longitude
            lat_mean = sum(nodes[n][0] for n in building_nodes) / len(building_nodes)
            lon_mean = sum(nodes[n][1] for n in building_nodes) / len(building_nodes)

            # Assign a synthetic node ID for the centroid
            centroid_id = max(nodes.keys()) + 1
            nodes[centroid_id] = (lat_mean, lon_mean)
            building_centroids[building_id] = centroid_id  # Store the centroid ID for this building

        # Find entrances for this building
        entrances = []
        for nd in way.findall('nd'):
            node_id = nd.attrib['ref']
            for node in root.findall(f"node[@id='{node_id}']"):
                for tag in node.findall('tag'):
                    if tag.attrib['k'] == "entrance" and tag.attrib['v'] in ["yes", "main"]:
                        entrances.append(int(node.attrib['id']))  # Store entrance node ID

        if entrances:
            building_entrances[building_id] = entrances

# Create graph and add nodes
G = nx.Graph()

# Add nodes with lat/lon
for node_id, (lat, lon) in nodes.items():
    G.add_node(node_id, lat=lat, lon=lon, x=lon, y=lat)

# Add valid edges
G.add_edges_from(valid_edges)

# Connect centroids to entrances
for building_id, centroid_id in building_centroids.items():
    if building_id in building_entrances:
        for entrance in building_entrances[building_id]:
            G.add_edge(centroid_id, entrance)  # Connect centroid to entrance

# Display node and edge counts
print(f'There are {G.number_of_nodes()} nodes and {G.number_of_edges()} edges in this graph')

# Plot the graph
pos = {node: (G.nodes[node]['lon'], G.nodes[node]['lat']) for node in G.nodes}

plt.figure(figsize=(12, 15))
nx.draw(G, pos, node_size=10, node_color='blue', edge_color='gray', with_labels=False)
plt.savefig('database_utils/map_helpers/map_data/map_img_base.png')
plt.show()

import pandas as pd
'''
# Convert node data to a pandas DataFrame, ensuring to include all attributes
node_data = []
# Determine all unique attributes across all nodes
all_node_attributes = set()
for node_id, data in G.nodes(data=True):
    all_node_attributes.update(data.keys())

# Now add each node's information, including missing attributes as NaN
for node_id, data in G.nodes(data=True):
    node_info = {'node_id': node_id}
    for attribute in all_node_attributes:
        node_info[attribute] = data.get(attribute, None)  # Use None (NaN) if the attribute is missing
    node_data.append(node_info)

# Create DataFrame for nodes
nodes_df = pd.DataFrame(node_data)

# Convert edge data to a pandas DataFrame
edge_data = []
for u, v in G.edges():
    edge_data.append({
        'node1': u,
        'node2': v
    })
edges_df = pd.DataFrame(edge_data)

# Optional: Include additional edge features like distance, road type, etc. if applicable
# Example: add a distance feature (use haversine formula or similar)
def haversine(lat1, lon1, lat2, lon2):
    import math
    R = 6371  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c  # Distance in km

# Add distance to edge DataFrame
edges_df['distance'] = edges_df.apply(lambda row: haversine(
    nodes_df.loc[nodes_df['node_id'] == row['node1'], 'lat'].values[0],
    nodes_df.loc[nodes_df['node_id'] == row['node1'], 'lon'].values[0],
    nodes_df.loc[nodes_df['node_id'] == row['node2'], 'lat'].values[0],
    nodes_df.loc[nodes_df['node_id'] == row['node2'], 'lon'].values[0]
), axis=1)

# Save DataFrames to CSV
nodes_df.to_csv("campus_nodes.csv", index=False)
edges_df.to_csv("campus_edges.csv", index=False)


# Collect unique node labels (building names, landmarks, etc.)
node_labels = set()

for node in root.findall('node'):
    for tag in node.findall('tag'):
        if tag.attrib['k'] == "name":  # Check if the tag represents a name
            node_labels.add(tag.attrib['v'])

# Print all unique node labels
print("=== Unique Node Labels (Buildings, Landmarks) ===")
for label in sorted(node_labels):
    print(label)

# Natural features (focus on things like parks, lakes, etc.)
natural_features = set()

# Look at ways and relations (natural features are usually stored here)
for element in root.findall('way') + root.findall('relation'):
    for tag in element.findall('tag'):
        if tag.attrib['k'] in ["natural", "landuse", "leisure"]:  # Check relevant tags
            natural_features.add(f"{tag.attrib['k']}={tag.attrib['v']}")

# Print all unique natural features
print("=== Unique Natural Features (Grass, Lakes, Parks, Forests, etc.) ===")
for feature in sorted(natural_features):
    print(feature)

# Create a dictionary to store building entrances
building_entrances = {}

# Find all buildings (ways with 'building' tag)
for way in root.findall('way'):
    is_building = False
    building_id = way.attrib['id']
    
    # Check if this way represents a building
    for tag in way.findall('tag'):
        if tag.attrib['k'] == "building":
            is_building = True
            break

    if is_building:
        # Store entrances for this building
        entrances = []

        # Check each node in the building way
        for nd in way.findall('nd'):
            node_id = nd.attrib['ref']
            for node in root.findall(f"node[@id='{node_id}']"):
                for tag in node.findall('tag'):
                    if tag.attrib['k'] == "entrance":
                        entrances.append((node.attrib['id'], tag.attrib['v']))  # Store entrance type

        if entrances:
            building_entrances[building_id] = entrances

# Print all buildings with their entrances
print("=== Building Entrances & Exits ===")
for building, entrances in building_entrances.items():
    print(f"Building ID: {building}")
    for entrance_id, entrance_type in entrances:
        print(f"  - Entrance Node {entrance_id}: {entrance_type}")
    print()

# Optionally, clean up by filtering out unnecessary nodes/ways based on the data above
# Example: remove nodes that are not related to buildings or natural features

# Create a set of valid node IDs to keep (those that are either buildings, landmarks, or natural features)
valid_node_ids = set()

# Add building nodes (those involved in buildings and entrances)
for building_id, entrances in building_entrances.items():
    for entrance_id, _ in entrances:
        valid_node_ids.add(int(entrance_id))  # Add entrance nodes

# Add nodes involved in natural features
for feature in natural_features:
    for element in root.findall('way'):
        for tag in element.findall('tag'):
            if tag.attrib['k'] in ["natural", "landuse", "leisure"]:
                for nd in element.findall('nd'):
                    valid_node_ids.add(int(nd.attrib['ref']))  # Add related node ids

# Now you can filter the nodes in your graph or data, keeping only those in valid_node_ids
print(f"Nodes to keep (valid node IDs): {valid_node_ids}")'''