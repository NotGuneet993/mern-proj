import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { CiEraser } from "react-icons/ci";
import Select from 'react-select';

const API_URL = import.meta.env.VITE_API_URL;

type PathBarProps = {
    username: string;
    setPath: (validNodes: any) => void;
    setDistance: (distance: number) => void;
}

export default function PathBar({ username, setPath, setDistance } : PathBarProps) {

    const [locations, setLocations] = useState([]);
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');

    const handleSearch = async () => {
        const src = startLocation;
        const dst = endLocation;

        let distance = 0;
        const edgePath = [];

        try {
            const response = await fetch(`${API_URL}/locations/getPath?location1=${encodeURIComponent(src)}&location2=${encodeURIComponent(dst)}`)
            if (!response.ok) throw new Error("Couldn't fetch path")
            
            const data = await response.json();

            edgePath.push(data.path[0])
            for (let item of data.path) {
                if (item.geometry.type === 'LineString') {
                    distance += item.properties.distance;
                    edgePath.push(item);
                }
            }

            edgePath.push(data.path[data.path.length - 1]);
            setDistance(Math.round((60/3) * distance));

            setPath({
                "type": "FeatureCollection",
                "features": edgePath
            });

        } catch (error) {
            console.log(error);
        }
    };

    const handleClear = () => {
        setDistance(0);
        setPath({
            "type": "FeatureCollection",
            "features": []
        });
    }

    useEffect(() => {
        const getLocations = async () => {
            try {
                const res = await fetch(`${API_URL}/locations/getLocation`)
                if (!res.ok) throw new Error("Couldn't get location");

                const data = await res.json();
                setLocations(data);

            } catch (error) {
                console.log(error);
            }
        }

        getLocations();

    }, []);

    return (
        <div className="z-1 flex flex-wrap w-[90vw] h-[55px] bg-white justify-center items-center mt-[10px] border-stone-400 rounded-full drop-shadow-lg">
            <p className="text-stone-700 mx-1">Hello, {username.charAt(0).toUpperCase() + username.slice(1)}! Find the path from</p>

            <div className="mx-1 min-w-[200px]">
                <Select
                    options={locations.map(loc => ({ value: loc, label: loc }))}
                    value={startLocation ? { value: startLocation, label: startLocation } : null}
                    onChange={(selectedOption) => {
                    if (selectedOption) {
                        setStartLocation(selectedOption.value);
                    }
                    }}
                    placeholder="Start location"
                    maxMenuHeight={200}
                />
            </div>

            <p className="text-stone-700 mx-1">to</p>

            <div className="mx-1 min-w-[200px]">
                <Select
                    options={locations.map(loc => ({ value: loc, label: loc }))}
                    value={endLocation ? { value: endLocation, label: endLocation } : null}
                    onChange={(selectedOption) => {
                    if (selectedOption) {
                        setEndLocation(selectedOption.value);
                    }
                    }}
                    placeholder="End location"
                    maxMenuHeight={200}
                />
            </div>

            <span 
                className="text-stone-700 text-2xl m-1 hover:text-blue-600 hover:cursor-pointer"
                onClick={handleSearch}  
            >
                <FaSearch />
            </span>

            <span 
                className="text-stone-700 text-4xl m-1 hover:text-blue-600 hover:cursor-pointer"
                onClick={handleClear}  // Trigger search on click
            >
                <CiEraser />
            </span>
        </div>
    );
}