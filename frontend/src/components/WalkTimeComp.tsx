type walkTimeCompProps = {
    walkTime: number;
}

export default function WalkTimeComp({ walkTime } : walkTimeCompProps) {

    return(
                <div className="w-[52px] h-[52px] bg-stone-50 border border-amber-500 rounded-3xl drop-shadow-2xl z-50 flex flex-col justify-center items-center"
                >   
                    <span className="text-lg">{walkTime}m</span>
                </div>
    );
}