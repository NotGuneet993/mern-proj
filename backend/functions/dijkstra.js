const { PriorityQueue } = require('@datastructures-js/priority-queue');


/**
 * Implementation for Dijkstra's shortest path algorithm
 * @param {number} n Number of nodes in the graph
 * @param {number[][]} edges List of edges [src, dst, weight]
 * @param {number} src Source node
 * @returns {Object} Shortest distances from source node to other nodes
 */
async function shortestPath(n, edges, src, keys) {
    const adj = {};
    for (let i = 1; i < n + 1; i++) {
        adj[i] = [];
    }

    for (const [s, d, w] of edges) {
        try {
            adj[s].push([d, w]);
        } catch (error) {
            console.log(error);
            console.log(`${adj}\n${s}, ${d}, ${w}`);
            return {};
        }
    }

    const shortest = {};
    const minHeap = new PriorityQueue((a, b) => a[0] - b[0]);
    minHeap.enqueue([0, src]);

    while (!minHeap.isEmpty()) {
        const [w1, n1] = minHeap.dequeue();
        if (shortest.hasOwnProperty(n1)) {
            continue;
        }
        shortest[n1] = w1;

        for (const [n2, w2] of adj[n1]) {
            if (!shortest.hasOwnProperty(n2)) {
                minHeap.enqueue([w1 + w2, n2]);
            }
        }
    }
    return shortest;
}

module.exports = shortestPath;
