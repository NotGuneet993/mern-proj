import { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { GeoJSON } from "ol/format";
import OSM from "ol/source/OSM"; 
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Icon from "ol/style/Icon";
import icon from "../assets/pin.svg";

type GeoJSONMapProps = {
  path: any;
}

export default function GeoJSONMap({ path } : GeoJSONMapProps) {
  const mapRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    // Parse the GeoJSON data and read it as OpenLayers features
    const source = new VectorSource({
      features: new GeoJSON().readFeatures(path, {
        featureProjection: "EPSG:3857",
      }),
    });

    // Filter out edge features
    const edgeFeatures = source.getFeatures().filter((feature: any) => {
      return feature.getGeometry().getType() === 'LineString'; // Only keep LineString geometries (edges)
    });

    // For when you want all nodes:
    // Get valid node features to display (only nodes whose IDs are in validNodeIds)
    const nodeFeatures = source.getFeatures().filter((feature: any) => {
      const featureId = feature.get('id'); // Access the 'id' property from the 'properties' object
      return featureId; // Keep all nodes, no filtering based on validNodes
    });

    const nodeStyle = new Style({
      image: new Icon({
        src: icon, 
        scale: 0.04,
        anchor: [0.5, 1],
      }),
    });

    // Define the style for the edge features
    const edgeStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 1)', 
        width: 5,
      }),
    });

    // Apply styles to the node and edge features
    nodeFeatures.forEach((feature: any) => {
      feature.setStyle(nodeStyle); // Apply the node style
    });

    edgeFeatures.forEach((feature: any) => {
      feature.setStyle(edgeStyle); // Apply the edge style
    });

    // Clear the vector source and add only the edge and valid node features
    source.clear();
    source.addFeatures(edgeFeatures); // Add edge features
    source.addFeatures(nodeFeatures); // Add valid node features

    // Get the extent (bounds) of the filtered GeoJSON data (only edges and nodes)
    let extent = source.getExtent(); // Get bounds in EPSG:3857

    // Apply a buffer to the extent
    extent = [
      -9040587.189786093, // Extend minX
      3322798.3912665765, // Extend minY
      -9037165.56259758, // Extend maxX
      3326826.042694283, // Extend maxY
    ];

    // Create the map with the vector layer containing both the edges and the nodes
    const olMap = new Map({
      target: mapRef.current!,
      layers: [
        new TileLayer({
          source: new OSM(), // OpenStreetMap tiles as base layer
        }),
        new VectorLayer({
          source, // Add only the edge and node features
        }),
      ],
      view: new View({
        center: [
          -9038876.38,
          3324912.22,
        ],
        zoom: 16, // Set the zoom level
        extent: extent, // Lock the map to the expanded bounds
      }),
    });

// Cleanup map and pop-up on unmount
return () => {
  olMap.setTarget(undefined);
};
}, [path]); // Re-run effect when validNodes changes

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}