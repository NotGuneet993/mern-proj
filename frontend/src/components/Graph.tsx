import { useState, useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { GeoJSON } from "ol/format";
import { Overlay } from 'ol';
import OSM from "ol/source/OSM";  // OpenStreetMap tiles as base layer
import geojsonData from "../../../backend/data/campus_map.json";  // Direct import
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";

// interface GeoJSONFeatureCollection {  // blocking deplyment
//   type: "FeatureCollection";
//   features: any[];
//   locations: string[];
//   uniqueFeatres: any[];
// }

type GeoJSONMapProps = {
  validNodes: any[];
}

export default function GeoJSONMap({ validNodes } : GeoJSONMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [popup, setPopup] = useState<Overlay | null>(null); // State to manage the pop-up
  map; // Map has to be used at least once
  setMap; // setMap has to be used at least once

  useEffect(() => {
    // Parse the GeoJSON data and read it as OpenLayers features
    const source = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonData, {
        featureProjection: "EPSG:3857",
      }),
    });

    // Filter out edge features
    const edgeFeatures = source.getFeatures().filter((feature: any) => {
      return feature.getGeometry().getType() === 'LineString'; // Only keep LineString geometries (edges)
    });

    // Get valid node features to display (only nodes whose IDs are in validNodeIds)
    const nodeFeatures = source.getFeatures().filter((feature: any) => {
      const featureId = feature.get('id'); // Access the 'id' property from the 'properties' object
      return featureId && validNodes.includes(featureId); // Keep node if its ID is in validNodes
    });

    // For when you want all nodes:
    // Get valid node features to display (only nodes whose IDs are in validNodeIds)
    // const nodeFeatures = source.getFeatures().filter((feature: any) => {
    //   const featureId = feature.get('id'); // Access the 'id' property from the 'properties' object
    //   return featureId; // Keep all nodes, no filtering based on validNodes
    // });

    // Define the style for the node (point) features
    const nodeStyle = new Style({
      image: new Circle({
        radius: 5, // Adjust the size of the node point
        fill: new Fill({
          color: 'rgba(255, 0, 0, 1)', // Red color for nodes
        }),
      }),
    });

    // Define the style for the edge features
    const edgeStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.0)', // Black color with 20% opacity
        width: 1, // Line width
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
    const bufferDistance = (extent[2] - extent[0]) * 0.1; // 10% of the width as a buffer
    extent = [
      extent[0] - bufferDistance, // Extend minX
      extent[1] - bufferDistance, // Extend minY
      extent[2] + bufferDistance, // Extend maxX
      extent[3] + bufferDistance, // Extend maxY
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
          (extent[0] + extent[2]) / 2,
          (extent[1] + extent[3]) / 2,
        ],
        zoom: 14, // Set the zoom level
        extent: extent, // Lock the map to the expanded bounds
      }),
    });
// Create and set up the pop-up overlay
const popupOverlay = new Overlay({
  element: document.createElement('div'), // Create a div for the pop-up content
  positioning: 'bottom-center',
  stopEvent: false,
});

// Set the pop-up element's styles
popupOverlay.getElement()!.classList.add('ol-popup');
popupOverlay.getElement()!.style.backgroundColor = 'white';
popupOverlay.getElement()!.style.padding = '10px';
popupOverlay.getElement()!.style.borderRadius = '5px';
popupOverlay.getElement()!.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

// Add pop-up to the map
olMap.addOverlay(popupOverlay);
setPopup(popupOverlay); // Set the popup state

// Listen for click events on the map
olMap.on('singleclick', (event: any) => {
  const pixel = event.pixel;

  olMap.forEachFeatureAtPixel(pixel, (feature: any) => {
    const featureType = feature.getGeometry().getType(); // Get the type of geometry
    if (featureType === 'Point') { // Make sure the clicked feature is a node (Point)
      const nodeId = feature.get('id'); // Get the ID of the clicked feature
      const nodeName = feature.get('name'); // Get the Name (or other property) of the clicked feature
      const coordinates = feature.getGeometry().getCoordinates(); // Get the coordinates of the clicked feature

      if (nodeId) {
        // Only display node info (ID and name) if nodeId exists
        const displayName = nodeName ? nodeName : "No Name Provided"; // Fallback if name is null or undefined
        const popupContent = `<strong>Node ID:</strong> ${nodeId}<br><strong>Node Name:</strong> ${displayName}`;
        popupOverlay.getElement()!.innerHTML = popupContent;
        popupOverlay.setPosition(coordinates); // Set the position of the pop-up on the map
      }
    }
  });
});

// Cleanup map and pop-up on unmount
return () => {
  olMap.setTarget(undefined);
  if (popup) {
    olMap.removeOverlay(popup); // Remove pop-up overlay
  }
};
}, [validNodes]); // Re-run effect when validNodes changes

  return (
    <div className="w-full h-[750px]">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}