import { useState } from "react";
import { FaPlus } from "react-icons/fa";

interface PlusButtonMenuProps {
    setModalOpen: (auth: boolean) => void;
}

export default function PlusButtonMenu({ setModalOpen } : PlusButtonMenuProps) {

    const [rotated, setRotated] = useState(false);

    return (
        <div style={{
            width: rotated ? 150 : 52,
            height: rotated ? 200 : 52,
        }}
        className="bg-stone-50 border border-amber-500 rounded-3xl transition-all duration-300 ease-in-out pt-[15px] drop-shadow-2xl z-50 relative"
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