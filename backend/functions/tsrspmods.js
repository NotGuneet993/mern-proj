async function pmo() {
    // Step 1: Import ../map.json
    const map = require(`../map.json`);

    // Step 2: Make the first hashmap mapping two node id's to the distance between them
    /*
    the json contains an array titled "links"
    for each link
        create an object mapping (source, target) to distance 
        **these are all fields in a link obj**
        append this object { (source, target) : distance } to the first hashmap
    */
    let edges = {};
    let links = map["links"];
    for (let i = 0; i < links.length; i++) {
        let link = links[i]
        //edges[ (`${link["source"]}, ${link["target"]}`) ] = link["distance"];
        // TODO Above makes the tuple a string, below uses an array acting as a tuple. Which is better?
        edges[ [ link["source"], link["target"] ] ] = link["distance"];
    }

    // Step 3: Make a second hashmap mapping the nodes' labels to the nodes themselves
    /*
    the json contains an array titled "nodes"
    for each node
        create an object mapping name to the node itself
        **name is a field in node obj**
        append this object { name : node } to the second hashmap
    */
    let labels = {};
    let nodes = map["nodes"];
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        labels[ node["name"] ] = node;
    }

    //Uncomment to do print checks
    //console.log(edges);
    //console.log(labels);
    
    // Step 4: Supposedly run Dijkstra's algorithm on the first hashmap
    // TODO Boss up on some real shit
}

module.exports = pmo;