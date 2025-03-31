import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

type PathBarProps = {
    username: string;
    setPath: (validNodes: any) => void;
    
}

export default function PathBar({ username, setPath } : PathBarProps) {

    let locations: any[] = [];

    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');

    const handleSearch = () => {

    };

    useEffect(() => {
        const getLocations = async () => {
            try {
                const res = await fetch(`${API_URL}/locations/getLocation`)
                if (!res.ok) throw new Error("Couldn't get location");

                locations = await res.json();

            } catch (error) {
                console.log(error);
            }
        }

        getLocations();
        console.log(locations);
    }, []);

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