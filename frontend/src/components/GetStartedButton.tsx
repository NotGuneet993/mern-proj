import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type GetStartedButtonProps = {
    buttonText: ReactNode;
    behavior?: () => void;
}

export default function GetStartedButton({ buttonText, behavior } : GetStartedButtonProps) {

    const navigate = useNavigate();

    const defaultBehavior = () => {
        navigate('/get-started')
    }

    return (
       <button 
            className=" py-3 px-20 mt-5 bg-linear-70 from-yellow-300 to-amber-500 text-2xl text-stone-900 rounded-4xl
            hover:bg-linear-70 hover:from-yellow-400 hover:to-amber-600 hover:cursor-pointer"

            onClick={behavior ?? defaultBehavior}
        >
        {buttonText}
       </button> 
    );
};