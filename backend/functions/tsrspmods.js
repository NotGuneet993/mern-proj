// Step 1: Import ../map.json

// Step 2: Make the first hashmap mapping two node id's to the distance between them
/*
the json contains an array titled "links"
for each link
    create an object mapping (source, target) to distance 
    **these are all fields in a link obj**
    append this object { (source, target) : distance } to the first hashmap
*/

// Step 3: Make a second hashmap mapping the nodes' labels to the nodes themselves
/*
the json contains an array titled "nodes"
for each node
    create an object mapping name to the node itself
    **name is a field in node obj**
    append this object { name : node } to the second hashmap
*/

// Step 4: Supposedly run Dijkstra's algorithm on the first hashmap
// TODO Boss up on some real shit