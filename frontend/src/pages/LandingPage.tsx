import nodemap from "../assets/nodemap.png"
import { useState } from "react";
import GetStartedButton from "../components/GetStartedButton";

export default function LandingPage() {
    const [count, setCount] = useState(0);

    const stim = () => {
        setCount(prev => prev + 1);
    }

    return (        
        <div className="flex h-screen overflow-hidden">

            <div className="w-1/2 h-full">
                <img 
                    src={nodemap}
                    alt="Map of UCF" 
                    className="w-full h-full object-cover rotate-[-90]" 
                />
            </div>
 
            <div className="w-1/2 flex flex-col justify-center items-center h-auto bg-yellow-300">
                <div className="bg-white text-center rounded-4xl border border-black pb-16 pt-16 pl-4 pr-4">

                    <h1 className="text-4xl font-bold">KnightNav</h1>
                    <h2 className="text-2xl text-gray-600">Find Your Way With Ease</h2>
                    <p className="text-lg text-gray-500 max-w-md mt-4">
                        Navigate UCF's campus effortlessly with our app, designed to help you get to your class on time.
                    </p>
                    <GetStartedButton buttonText="Get Started" />
                    <br />
                    <GetStartedButton buttonText={`Count: ${count}`} behavior={stim} />
                </div>
            </div>
        </div>
    );
}

{/* 
some styling tailwind made by default 
<button 
    onClick={stim} 
    className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 hover:cursor-pointer transition"
>
    Count: {count}
</button>

*/}
