import GetStartedButton from "../components/GetStartedButton";
import { FaPlus } from "react-icons/fa";
import { useState } from "react";

export default function StimPage() {
    const [count, setCount] = useState(0);
    const [rotated, setRotated] = useState(false);

    const stim = () => {
        setCount(prev => prev + 1);
    }

    return (
        <div className="h-screen flex flex-col items-center justify-center">
            <GetStartedButton buttonText={`Count: ${count}`} behavior={stim} />
            <br />
            <div
                onClick={() => setRotated(!rotated)}
                className="border rounded-full bg-stone-100 text-4xl p-3 hover:border-amber-500 cursor-pointer mx-3"
            >
                <FaPlus
                    className={`text-black transition-transform duration-300 ease-in-out hover:text-amber-500 ${
                        rotated ? 'rotate-45' : '-rotate-0'
                    }`}
                />
            </div>

        </div>
    );
}