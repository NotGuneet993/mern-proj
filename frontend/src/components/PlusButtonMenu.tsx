import { useState } from "react";
import { FaPlus } from "react-icons/fa";

interface PlusButtonMenuProps {
    setModalOpen: (auth: boolean) => void;
}

export default function PlusButtonMenu({ setModalOpen } : PlusButtonMenuProps) {

    const [rotated, setRotated] = useState(false);

    return (
        <div
            className={`w-[${rotated? 150 : 50}px] h-[${rotated? 200 : 50}px] bg-stone-100 border-1 border-amber-500 
                        rounded-3xl transition-all duration-350 ease-in-out pt-[15px]`}
        >
            {rotated && (
                <div className="flex flex-col items-center">
                    <p className="text-lg my-1 hover:text-blue-500 hover:cursor-pointer"
                    onClick={() => setModalOpen(true)}>
                        Add Class
                    </p>

                    <p className="text-lg my-1 hover:text-blue-500 hover:cursor-pointer">Schedule</p>
                </div>
            )}
            <FaPlus
                className={`absolute text-black text-[40px] left-[5px] bottom-[5px] transition-transform duration-350 ease-in-out hover:text-amber-500 ${
                    rotated ? 'rotate-45' : '-rotate-0'
                }`}
                onClick={() => setRotated(!rotated)}
            />
        </div>
    );
}