import { ReactNode } from "react";

type GetStartedButtonProps = {
    buttonText: ReactNode;
    behavior?: () => void;
}

export default function GetStartedButton({ buttonText, behavior } : GetStartedButtonProps) {

    const defaultBehavior = () => {
        alert(`The ${buttonText} button was pressed`)
    }

    return (
       <button 
            className="bg-yellow-300 hover:bg-amber-400 hover:cursor-pointer 
            py-2 px-8 rounded-2xl font-bold border border-gray-300 hover:border-transparent"

            onClick={behavior ?? defaultBehavior}
        >
        {buttonText}
       </button> 
    );
};