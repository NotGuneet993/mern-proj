import edgeMap from '../assets/edges.svg'
import GetStartedButton from '../components/GetStartedButton';

export default function LandingPage() {

    return (
        <div className="bg-stone-900 flex h-screen">
            <div className="w-1/2 flex z-2 items-center justify-center">
                <img src={edgeMap} alt='ucf edges' className='w-screen h-screen rotate-270'></img>
            </div>

            <div className="w-1/2 flex items-center justify-center p-8 ">
                <div className='flex flex-col items-center justify-center bg-stone-600/50 rounded-4xl py-15 px-10 border-2 border-white '>
                    <h1 className='text-stone-50 text-8xl'>KnightNav</h1>
                    <h3 className="text-4xl text-stone-300 py-2">Find Your Way With Ease</h3>
                    <GetStartedButton buttonText="Get Started"/>
                </div>
            </div>
        </div>
    );
}