import React, { useState, useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { GeoJSON } from "ol/format";
import OSM from "ol/source/OSM"; // OpenStreetMap tiles
import geojsonData from "../data/campus_map.json"; // Direct import

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: any[];
}


export default function GeoJSONMap() {
  const [map, setMap] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parse the GeoJSON data and read it as OpenLayers features
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonData, {
        featureProjection: "EPSG:3857", // Project to the map's projection (Web Mercator)
      }),
    });

    // Get the extent (bounds) of the GeoJSON data
    let extent = vectorSource.getExtent(); // Get bounds in EPSG:3857

    // Apply a buffer to the extent (increase the bounds by 10% for example)
    const bufferDistance = (extent[2] - extent[0]) * 0.1; // 10% of the width as a buffer
    extent = [
      extent[0] - bufferDistance, // Extend minX
      extent[1] - bufferDistance, // Extend minY
      extent[2] + bufferDistance, // Extend maxX
      extent[3] + bufferDistance, // Extend maxY
    ];

    // Create the map with the vector layer containing the GeoJSON data
    const olMap = new Map({
      target: mapRef.current!,
      layers: [
        new TileLayer({
          source: new OSM(), // Using OpenStreetMap tiles as base layer
        }),
        new VectorLayer({
          source: vectorSource, // Add the GeoJSON data as a vector layer
        }),
      ],
      view: new View({
        // Use the center of the bounds as the initial center of the map
        center: [
          (extent[0] + extent[2]) / 2,
          (extent[1] + extent[3]) / 2,
        ],
        zoom: 14, // Set the zoom level
        extent: extent, // Lock the map to the expanded bounds
      }),
    });

    // Set the map instance in state
    setMap(olMap);

    // Cleanup map on unmount
    return () => olMap.setTarget(undefined);
  }, []);

  return (
    <div className="w-full h-[500px]">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}


// import React, { useState, useEffect } from "react";
// import { Marker, Popup } from 'react-leaflet';
// import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";
// import geojsonData from "../data/campus_map.json"; // Direct import



// // Define GeoJSON Type
// interface GeoJSONFeatureCollection {
//   type: "FeatureCollection";
//   features: any[];
// }

// L.Icon.Default.mergeOptions({
//   iconUrl: "/leaflet/marker-icon.png",
//   iconRetinaUrl: "/leaflet/marker-icon-2x.png",
//   shadowUrl: "/leaflet/marker-shadow.png"
// });

// export default function GeoJSONMap() {
//   const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

//   useEffect(() => {
//     if ((geojsonData as GeoJSONFeatureCollection).type === "FeatureCollection") {
//       const layer = L.geoJSON(geojsonData as GeoJSONFeatureCollection);
//       setBounds(layer.getBounds());
//     }
//   }, []); // Runs only once since geojsonData is static

//   const geoJSONStyle = {
//     color: "blue",
//     weight: 2,
//     fillColor: "lightblue",
//     fillOpacity: 0.5,
//   };

//   return (
//     <div className="w-full h-[500px]">
//       {bounds && (
//         <MapContainer
//         bounds={bounds}
//         className="w-full h-full"
//         scrollWheelZoom={true} // Allow zoom with the scroll wheel
//         maxBounds={bounds} // Set the max bounds for panning
//         maxBoundsViscosity={1.0} // Optional: Prevent panning outside of bounds
//         preferCanvas={true}
//       >
//           <TileLayer
//             url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
//             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CartoDB</a>'
          
//             /*
//             url="https://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png"
//             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://stamen.com">Stamen Design</a>'

//             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            
//             url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
//             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org/copyright">OpenTopoMap</a>'

//             url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
//             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CartoDB</a>'

//             url="https://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg"
//             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://stamen.com">Stamen Design</a>'

//             url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
//             attribution='&copy; <a href="https://www.esri.com/en-us/arcgis/products/arcgis-online">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

//             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//             */
//           />
//           <GeoJSON data={geojsonData as GeoJSONFeatureCollection} style={geoJSONStyle} />
          
//         </MapContainer>
//       )}
//     </div>
//   );
// }