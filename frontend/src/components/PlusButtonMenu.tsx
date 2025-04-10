import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

interface PlusButtonMenuProps {
    globalUser: String;
    onNavigateClick: () => void;
}

export default function PlusButtonMenu({globalUser, onNavigateClick } : PlusButtonMenuProps) {

    const [rotated, setRotated] = useState(false);
    const navigate = useNavigate();

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
                    onClick={()=> navigate(`/schedule/${globalUser}`)}>Schedule</p>
                    <p className="text-lg my-1 hover:text-blue-500 hover:cursor-pointer" 
                    onClick={onNavigateClick}>Map classes</p>
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