interface DistanceCompProps {
    distance: number;
}

export default function DistanceComp({ distance } : DistanceCompProps) {
    return (
        <div 
        className="flex justify-center items-center w-[54px] h-[54px] bg-stone-50 border border-amber-500 rounded-full drop-shadow-2xl z-50 relative"
        >
            <p>{distance}m</p>
        </div>
    );
}