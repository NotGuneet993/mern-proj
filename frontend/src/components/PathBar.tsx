import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import geojsonData from "../../../backend/data/campus_map.json";  // Direct import
import id_map from "../../../backend/data/id_map.json";

interface IdMap {
    [key: string]: number; // Assuming the value is a string (node ID)
  }

type PathBarProps = {
    username: string;
    onSearch: (validNodes: any[]) => void; // Callback function to send the nodeIds to GeoJSONMap component
}

export default function PathBar({ username, onSearch } : PathBarProps) {
    const locations: string[] = (geojsonData as any).locations;
    const [startLocation, setStartLocation] = useState<string>(locations[0]);
    const [endLocation, setEndLocation] = useState<string>(locations[1]);

    // Handle generating the path on the graph
    // NEED TO UPDATE THIS TO CALL API TO GET DIJKSTRA PATH
    const handleSearch = () => {
        const startNode = (id_map as IdMap)[startLocation];
        const endNode = (id_map as IdMap)[endLocation];

        if (startNode && endNode) {
            // Update this to send the actual path, not just the two nodes
            onSearch([startNode, endNode]);  // Send valid node IDs to the parent component
        }
        // Debug REMOVE LATER
        else{
            console.log('MISSING A NODE');
        }
    };

    return (
        <div className="z-1 flex flex-wrap w-[90vw] h-[55px] bg-white justify-center items-center mt-[10px] border-stone-400 rounded-full drop-shadow-lg">
            <p className="text-stone-700 mx-1">Hello, {username}! Find the path from</p>

            <select 
                className="border border-stone-400 rounded px-2 mx-1"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
            >
                {locations.map((loc, index) => (
                    <option key={index} value={loc}>{loc}</option>
                ))}
            </select>

            <p className="text-stone-700 mx-1">to</p>

            <select 
                className="border border-stone-400 rounded px-2 mx-1"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
            >
                {locations.map((loc, index) => (
                    <option key={index} value={loc}>{loc}</option>
                ))}
            </select>

            <span 
                className="text-stone-700 text-2xl m-1 hover:text-blue-600 hover:cursor-pointer"
                onClick={handleSearch}  // Trigger search on click
            >
                <FaSearch />
            </span>
        </div>
    );
}