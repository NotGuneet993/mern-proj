import React from "react";
import GeoJSONMap from "./../components/Graph.tsx";

export default function NavigationPage(){
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
          <h1 className="text-3xl font-bold mb-4 text-center text-white">GeoJSON Map</h1>
          <div className="w-full max-w-4xl p-4 bg-gray-900 rounded-lg shadow-lg">
            <GeoJSONMap />
          </div>
        </div>
      );
};