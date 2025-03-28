import { useState } from "react";
import { FaPlus } from "react-icons/fa";

export default function PlusButtonMenu() {

    const [rotated, setRotated] = useState(false);

    return (
        <div
            onClick={() => setRotated(!rotated)}
            className="border rounded-full bg-stone-100 text-4xl p-3 hover:border-amber-500 cursor-pointer "
        >
            <FaPlus
                className={`text-black transition-transform duration-300 ease-in-out hover:text-amber-500 ${
                    rotated ? 'rotate-45' : '-rotate-0'
                }`}
            />
        </div>
    );
}