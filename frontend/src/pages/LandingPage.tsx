import "../styles/LandingPage.css"
import nodemap from "../assets/nodemap.png"

import { useState } from "react";

export default function LandingPage() {

    const [count, setCount] = useState(0);


    return (        
        <div className="flex h-screen overflow-hidden">

            <div className="w-1/2 h-full">
                <img 
                    src={nodemap}
                    alt="Map of UCF" 
                    className="w-full h-full object-cover rotate-[-90]" 
                />
            </div>
 
            <div className="w-1/2 flex flex-col justify-center items-center bg-white text-center p-8">
                <h1 className="text-4xl font-bold">KnightNav</h1>
                <h2 className="text-2xl text-gray-600">Find Your Way With Ease</h2>
                <p className="text-lg text-gray-500 max-w-md mt-4">
                    Navigate UCF's campus effortlessly with our app, designed to help you get to your class on time.
                </p>
                <button className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition">
                    Get Started
                </button>
                <br />
                <button onClick={() => setCount(prev => prev + 1)}>
                    Count: {count}
                </button>
            </div>
        </div>
    );
}