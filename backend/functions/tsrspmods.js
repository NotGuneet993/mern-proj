const dijkstras = require("./dijkstra.js");

async function pmo() {
    // Step 1: Import ../../assets/map.json
    const map = require(`../assets/map.json`);

    let nodes = map["nodes"];

    // Step 1.5: "Preprocess" the entire graph
    /*
    For each node
        map the node ID to its real ID (node number)
        assign it an actual name if it doesn't have one
    Leverage this map to correctly assign node numbers in steps 2 and 3
    */
    let keys = {};
    console.log("Preprocessing graph...");
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        let id = node["id"];
        keys[id] = i + 1; // The djk's implementation uses 1-based node indexing
        node["id"] = i + 1;

        if (!node["name"]) {
            node["name"] = `unnamed_${i+1}`;
        }
    }
    console.log("Preprocessing complete.");

    // Step 2: Make the first hashmap mapping two node id's to the distance between them
    /*
    the json contains an array titled "links"
    for each link
        create an object mapping (source, target) to distance 
        **these are all fields in a link obj**
        append this object { (source, target) : distance } to the first hashmap
    */
    console.log("Assembling edges...");
    let djkEdges = []; // Different edge formatting to be compatible with djk's implementation
    let edges = {};
    let links = map["links"];
    for (let i = 0; i < links.length; i++) {
        let link = links[i];
        edges[ [ keys[link["source"]], keys[link["target"]] ] ] = link["distance"];
        
        djkEdges.push( [ keys[link["source"]], keys[link["target"]], link["distance"] ] );
    }
    console.log("Assembly complete.");

    // Step 3: Make a second hashmap mapping the nodes' labels to the nodes themselves
    /*
    the json contains an array titled "nodes"
    for each node
        create an object mapping name to the node itself
        **name is a field in node obj**
        append this object { name : node } to the second hashmap
    */
    console.log("Assembling the ******** label mappings Guneet asked for...");
    let labels = {};
    // let nodes = map["nodes"]; Already happened
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        labels[ node["name"] ] = node;
    }
    console.log("Assembly complete (again).");
    
    // Step 4: Run Dijkstra's algorithm for every node???
    console.log("Computing all sets of shortest paths...");
    let shortestPaths = {};
    let n = nodes.length;
    for (let i = 0; i < n; i++) {
        let src = nodes[i]["id"]; // Node ID is already the real ID at this point
        let shortest = dijkstras(n, djkEdges, src);
        shortestPaths[src] = shortest;
    }
    console.log("All sets of shortest paths successfully computed.");

    return { "edges" : edges, "labels" : labels , "shortestPaths" : shortestPaths};
}

module.exports = pmo;