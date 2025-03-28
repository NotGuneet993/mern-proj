import { FaSearch } from "react-icons/fa";

export default function PathBar() {
    const locations = ['MSB', 'HEC', 'BA1', 'ENG2'];

    return (
        <div className="flex flex-wrap w-[90vw] h-[55px] bg-white justify-center items-center mt-[10px] border-stone-400 rounded-full drop-shadow-lg">
            <p className="text-stone-700 mx-1">Hello, USERNAME! Find the path from</p>

            <select className="border border-stone-400 rounded px-2 mx-1">
                {locations.map((loc, index) => (
                    <option key={index} value={loc}>
                        {loc}
                    </option>
                ))}
            </select>

            <p className="text-stone-700 mx-1">to</p>

            <select className="border border-stone-400 rounded px-2 mx-1">
                {locations.map((loc, index) => (
                    <option key={index} value={loc}>
                        {loc}
                    </option>
                ))}
            </select>

            <span className="text-stone-700 text-2xl m-1 hover:text-blue-600 hover:cursor-pointer">
                <FaSearch />
            </span>
        </div>
    );
}