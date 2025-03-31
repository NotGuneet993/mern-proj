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


# for way in root.findall('way'):
#     for tag in way.findall('tag'):
#         if tag.attrib['k'] == "power" and tag.attrib['v'] == "line":
#             is_power_line = True
#             break
#         elif tag.attrib['k'] == "highway":
#             highway_type = "highway"
#         elif tag.attrib['k'] == "name":
#             name = tag.attrib['v']
#         elif tag.attrib['k'] == "building":
#             is_building = True
#         elif tag.attrib['k'] == "natural" and tag.attrib['v'] == "wetland":
#             is_power_line = True
#             for nd in way.findall('nd'):
#                 way.remove(nd)
#             root.remove(way)
#             break
#         elif tag.attrib['k'] == "water" and tag.attrib['v'] == "pond":
#             is_power_line = True
#             for nd in way.findall('nd'):
#                 way.remove(nd)
#             root.remove(way)
#             break
#         elif tag.attrib['k'] == "water" and tag.attrib['v'] == "river":
#             is_power_line = True
#             for nd in way.findall('nd'):
#                 way.remove(nd)
#             root.remove(way)
#             break
        
#         elif tag.attrib['k'] == "natural" and tag.attrib['v'] == "wood":
#             is_power_line = True
#             for nd in way.findall('nd'):
#                 way.remove(nd)
#             root.remove(way)
#             break
    
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
location_map = {}
for way in root.findall('way'):
    is_power_line = False
    highway_type = None
    name = None
    building_nodes = []
    building_id = way.attrib['id']  # this might need to be generated
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
        elif tag.attrib['k'] == "natural" and tag.attrib['v'] == "wetland":
            is_power_line = True
            # for nd in way.findall('nd'):
            #     way.remove(nd)
            #     nodes.pop(int(nd.attrib['ref']), None)
            # break
        elif tag.attrib['k'] == "water" and tag.attrib['v'] == "pond":
            is_power_line = True
            # for nd in way.findall('nd'):
            #     way.remove(nd)
            #     nodes.pop(int(nd.attrib['ref']), None)
            # break
        elif tag.attrib['k'] == "water" and tag.attrib['v'] == "river":
            is_power_line = True
            # for nd in way.findall('nd'):
            #     way.remove(nd)
            #     nodes.pop(int(nd.attrib['ref']), None)
            # break
        
        elif tag.attrib['k'] == "natural" and tag.attrib['v'] == "wood":
            is_power_line = True
            # for nd in way.findall('nd'):
            #     way.remove(nd)
            #     nodes.pop(int(nd.attrib['ref']), None)
            # break
    
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
    
    # Set the "close distance" threshold (in miles)
    CLOSE_DISTANCE_THRESHOLD_MILES = 0.0  # Example threshold of 0.1 miles (about 160 meters)

    if is_building and name and len(building_nodes) > 2:
        # Compute centroid of the building
        lat_mean = sum(nodes[n]["lat"] for n in building_nodes) / len(building_nodes)
        lon_mean = sum(nodes[n]["lon"] for n in building_nodes) / len(building_nodes)
        centroid_id = max(nodes.keys()) + 1  # Assign new node ID
        building_name = name if name else "centroid"
        nodes[centroid_id] = {"lat": lat_mean, "lon": lon_mean, "name": building_name, "highway": "highway"}
        #print(centroid_id, building_name)
        # print(centroid_id, nodes[centroid_id])
        location_map[building_name] = centroid_id

        building_centroids[building_id] = centroid_id

        # Identify entrances
        entrances = []
        for nd in way.findall('nd'):
            node_id = nd.attrib['ref']
            for node in root.findall(f"node[@id='{node_id}']"):
                for tag in node.findall('tag'):
                    if tag.attrib['k'] == "entrance" and tag.attrib['v'] in ["yes", "main"]:
                        entrance_id = int(node.attrib['id'])
                        entrances.append(entrance_id)

        if entrances:
            building_entrances[building_id] = entrances
        
        # Find all path nodes within the close distance threshold
        for path_node in nodes:
            if path_node == centroid_id:
                continue
            # Compute the Haversine distance to the centroid using your haversine_miles function
            dist = haversine_miles(lat_mean, lon_mean, nodes[path_node]["lat"], nodes[path_node]["lon"])
            
            # If the node is within the threshold, connect it to the centroid
            if dist <= CLOSE_DISTANCE_THRESHOLD_MILES:
                valid_edges.append((centroid_id, path_node, {"highway": "footway"}))

        # Connect centroid to entrances
        for entrance in entrances:
            valid_edges.append((centroid_id, entrance, {"highway": "entrance"}))
    
        building_nodes.append(centroid_id)
        
        # # Remove the name attribute from the building nodes, but keep the edges intact
        # for building_node in building_nodes:
        #     if building_node in nodes:
        #         nodes[building_node]['name'] = None  # Remove the 'name' attribute


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
    G.add_node(node_id, lat=attr["lat"], lon=attr["lon"], name=attr.get("name", None))
    if attr.get("name", None) and attr["name"] not in location_map.keys():
        location_map[attr["name"]] = node_id

# Add valid edges
G.add_edges_from(valid_edges)

edges_to_add = [
    (12634159225, 3137212226, {"highway": "entrance"}),
    (12634159227, 3095789392, {"highway": "entrance"}),
    (12634159220, 8922223724, {"highway": "entrance"}),
    (893880700, 12634159191, {"highway": "entrance"}),
    (12597548239, 9661240583, {"highway": "entrance"}),
    (12597548239, 3972820188, {"highway": "entrance"}),
    (12597548239, 9661240582, {"highway": "entrance"}),
    (12597548239, 3456763127, {"highway": "entrance"}),
    (12597548239, 9661240584, {"highway": "entrance"}),
    (12597548239, 9326345827, {"highway": "entrance"}),
    (12597548239, 4687137242, {"highway": "entrance"}),
    (7745911631, 3456763130, {"highway": "entrance"}),
    (3420036612, 4687137243, {"highway": "entrance"}),
    (3420036612, 9661240585, {"highway": "entrance"}),
    (12597548239, 9661240585, {"highway": "entrance"}),
    (12634159193, 1668087207, {"highway": "entrance"}),
    (12634159193, 3420036308, {"highway": "entrance"}),
    (3137057801, 12634159236, {"highway": "entrance"}),
    (12634159324, 2762673598, {"highway": "entrance"}),
    (3456766459, 12634159220, {"highway": "entrance"}),
    (12634159267, 2762673704, {"highway": "entrance"}),
    (2762673605, 6083840333, {"highway": "entrance"}),
    (12634159203, 3148137796, {"highway": "entrance"}),
    (12634159203, 3456743117, {"highway": "entrance"}),
    (12634159190, 3456743102, {"highway": "entrance"}),
    (12634159201, 7783536108, {"highway": "entrance"}),
    (12634159189, 3153646700, {"highway": "entrance"}),
    (12634159189, 3153646713, {"highway": "entrance"}),
    (4725148053, 12634159241, {"highway": "entrance"}),
    (12634159320, 3148137926, {"highway": "entrance"}),
    (12634159320, 3148137930, {"highway": "entrance"}),
    (12634159320, 3148137928, {"highway": "entrance"}),
    (12634159195, 1668083714, {"highway": "entrance"}),
    (3147766616, 12634159195, {"highway": "entrance"}),
    (12634159217, 3137058032, {"highway": "entrance"}),
    (12634159217, 1672331173, {"highway": "entrance"}),
    (1719808115, 1672331173, {"highway": "entrance"}),
    (8925265164, 9590977214, {"highway": "entrance"}),
    (12634159300, 12479573277, {"highway": "entrance"}),
    (9590977215, 12634159301, {"highway": "entrance"}),
    (9590977214, 12634159301, {"highway": "entrance"}),
    (9590977215, 4267311909, {"highway": "entrance"}),

    (3456757093, 3456757091, {"highway": "entrance"}),


    (9273630918, 12470213244, {"highway": "entrance"}),
    (9273630918, 12470213236, {"highway": "entrance"}),
    (9273630918, 12470213232, {"highway": "entrance"}),
    (9273630918, 12470213240, {"highway": "entrance"}),
    (2762462863, 12479573263, {"highway": "entrance"}),
    (12479573271, 12479573287, {"highway": "entrance"}),
    (12469924926, 12469924984, {"highway": "entrance"}),
    (12469924928, 12469924977, {"highway": "entrance"}),
    (12469924929, 12469924980, {"highway": "entrance"}),
    (12469924931, 12469924973, {"highway": "entrance"}),
    (12469924932, 12469924969, {"highway": "entrance"}),
    (12469924934, 12469924976, {"highway": "entrance"}),
    (12469924935, 12469924972, {"highway": "entrance"}),
    (12469924937, 12469924965, {"highway": "entrance"}),
    (12469924968, 12469924907, {"highway": "entrance"}),
    (12479573287, 12469924906, {"highway": "entrance"}),
    (12469924953, 12469924999, {"highway": "entrance"}),
    (12469924954, 12469924998, {"highway": "entrance"}),
    (12469924956, 12469924995, {"highway": "entrance"}),
    (12469924957, 12469924994, {"highway": "entrance"}),
    (12469924959, 12469924991, {"highway": "entrance"}),
    (12469924960, 12469924990, {"highway": "entrance"}),
    (12469924962, 12469924987, {"highway": "entrance"}),
    (12469924963, 12469924986, {"highway": "entrance"}),
    (12634159235, 7725843220, {"highway": "entrance"}),
    (3136972001, 12634159197, {"highway": "entrance"}),
    (3148137803, 12634159197, {"highway": "entrance"}),
    (3148137809, 12634159197, {"highway": "entrance"}),
    (12634159305, 9507892200, {"highway": "entrance"}),
    (12634159305, 9507892202, {"highway": "entrance"}),
    (2980303892, 12634159192, {"highway": "entrance"}),
    (2980303892, 12634159183, {"highway": "entrance"}),
    (12634159307, 7783268122, {"highway": "entrance"}),
    (3456763131, 3128392703, {"highway": "entrance"}),
    (2980303903, 893880976, {"highway": "entrance"}),
    (9661240587, 6083840329, {"highway": "entrance"}),
    (9661240586, 6083840329, {"highway": "entrance"}),
    (12469925001, 3095789490, {"highway": "entrance"}),
    (12634159246, 1701706089, {"highway": "entrance"}),
    (1701706089, 3456757085, {"highway": "entrance"}),
    (1701706089, 12260370964, {"highway": "entrance"}),
    (12260370964, 3456757091, {"highway": "entrance"}),
    (3456757091, 12150621459, {"highway": "entrance"}),
    (3456757091, 12150621458, {"highway": "entrance"}),
    (2199385633, 6314866391, {"highway": "entrance"}),
    (3456766463, 7743185634, {"highway": "entrance"}),
    (3456766462, 7743185634, {"highway": "entrance"}),
    (4687137241, 3095577371, {"highway": "entrance"}),
    (3456763128, 3095577371, {"highway": "entrance"}),
    (3456763128, 3095577370, {"highway": "entrance"}),
    (1668088071, 3456763126, {"highway": "entrance"}),
    (8932946951, 8932946941, {"highway": "entrance"}),
    (8932946951, 3137212220, {"highway": "entrance"}),
    (12634159307, 7783592533, {"highway": "entrance"}),
    (12634159308, 12286263662, {"highway": "entrance"}),
    (12634159308, 12634159307, {"highway": "entrance"}),

    (12634159162, 12634159226, {"highway": "entrance"}),
    (12634159199, 7745913401, {"highway": "entrance"}),

    (7783536130, 7783536132, {"highway": "entrance"}),
    (7783536115, 7783536123, {"highway": "entrance"}),

    (893880669, 1719809142, {"highway": "entrance"}),
    (893880669, 7783536108, {"highway": "entrance"}),
    (7783536128, 7783536129, {"highway": "entrance"}),

    (1719808727, 7783521844, {"highway": "entrance"}),
    (7783521827, 7783521841, {"highway": "entrance"}),
    (7783521841, 7783521844, {"highway": "entrance"}),
    (7783521842, 7783521827, {"highway": "entrance"}),
    (7783521862, 7783521863, {"highway": "entrance"}),
    (7783521855, 7783521860, {"highway": "entrance"}),
    (7783521863, 7783521860, {"highway": "entrance"}),
    (7783536115, 7783536130, {"highway": "entrance"}),
    (7783536123, 7783536132, {"highway": "entrance"}),

    (6438179459, 7783536130, {"highway": "entrance"}),
    (3148137823, 3147766603, {"highway": "entrance"}),
    (3148137822, 3148137824, {"highway": "entrance"}),
    (3147766658, 3151833125, {"highway": "entrance"}),
    (3151833125, 1668083714, {"highway": "entrance"}),


    (4267311553, 4267311552, {"highway": "entrance"}),
    (3456763129, 3456766460, {"highway": "entrance"}),
    (3095788285, 2762462981, {"highway": "entrance"}),
    (12634159242, 5001725305, {"highway": "entrance"}),
    (12634159189, 3153646710, {"highway": "entrance"}),
    (12634159197, 3136972008, {"highway": "entrance"}),
]

# Add these new nodes
for node1, node2, attributes in edges_to_add:
    G.add_edge(node1, node2, **attributes)  # Only add edge-specific data

edges_to_remove = [
    (12634159236, 3137057804),
    (12634159236, 3137057807),
    (3137058049, 3456766459),
    (893880671, 12634159201),
    (6438179451, 12634159189),
    (12634159241, 3095577382),
    (3148137931, 12634159318),
    (3137057818, 12634159217),
    (12634159300, 3678231228),
    (9273630918, 2762462834),
    (12479573271, 12470213229),
    (3128392670, 3456763131),
    (2980303903, 1668083140),
    (12634159199, 3128392699),
    (12634159199, 7742619966)
]

for node1, node2 in edges_to_remove:
    try:
        G.remove_edge(u, v)
    except:
        print(f'Removing edge ({u}, {v}) failed as it doesnt exist')
        continue

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
# 842 components now
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

with open("database_utils/map_helpers/map_data/id_map.json", "w") as f:
    json.dump(location_map, f, indent=4)

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
        if feature["properties"]["name"] is not None and feature["properties"]["name"] != "null":
            if feature["properties"]["name"] not in location_list:
                location_list.add(feature["properties"]["name"])
            else:
                print(f'DUPLICATE NAME: {feature["properties"]["name"]}')
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
        '''
        if feature["properties"]["name"] is not None and feature["properties"]["name"] != "null":
            if feature["properties"]["name"] not in location_list:
                location_list.add(feature["properties"]["name"])
            else:
                print(f'DUPLICATE NAME: {feature["properties"]["name"]}')
                print(feature["properties"])'''

        
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

# Insert the graph JSONs
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