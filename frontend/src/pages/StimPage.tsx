import GetStartedButton from "../components/GetStartedButton";
import { useState } from "react";

export default function StimPage() {
    const [count, setCount] = useState(0);

    const stim = () => {
        setCount(prev => prev + 1);
    }

    return (
        <div className="h-screen flex items-center justify-center">
            <GetStartedButton buttonText={`Count: ${count}`} behavior={stim} />
        </div>
    );
}