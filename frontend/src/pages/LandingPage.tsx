import edgeMap from '../assets/edges.svg'
import GetStartedButton from '../components/GetStartedButton';

export default function LandingPage() {

    return (
        <div className="bg-stone-900 flex flex-col md:flex-row h-full">

            <div className="hidden md:flex w-full md:w-1/2 z-2 items-center justify-center">
                <img src={edgeMap} alt="ucf edges" className="w-screen h-screen rotate-270" />
            </div>

            <div className="w-full md:w-1/2 flex items-center justify-center p-8">
                <div className="flex flex-col items-center justify-center py-15 px-10 text-center">
                    <h1 className="text-stone-50 text-5xl sm:text-6xl md:text-7xl lg:text-8xl">KnightNav</h1>
                    <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-stone-300 py-2">
                    Find Your Way With Ease
                    </h3>
                    <GetStartedButton buttonText="Get Started" />
                </div>
            </div>
        </div>
    );
}