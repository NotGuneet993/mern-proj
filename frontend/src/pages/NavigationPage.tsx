import { useState } from "react";
import GeoJSONMap from "../components/GeoJSONMap.tsx";
import PathBar from "./../components/PathBar.tsx";

export default function NavigationPage(){
  
    const [path, setPath] = useState({});

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
          <h1 className="text-3xl font-bold mb-4 text-center text-white">GeoJSON Map</h1>
          <PathBar username={'Plaeholder'} onSearch={setPath}/>  {/* This is just what Guneet had */}
          <div className="w-full max-w-4xl p-4 bg-gray-900 rounded-lg shadow-lg">
            <GeoJSONMap path={path}/>
          </div>
        </div>
      );
};