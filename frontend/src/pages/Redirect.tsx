import { useParams } from 'react-router-dom';

export default function Redirect() {

    const { user } = useParams();
    
    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="flex flex-col justify-center items-center bg-stone-100 m-10 p-10 border-[1px] border-black rounded-md">
                <p>redirection test. TS PMO {user}</p>
            </div>
        </div>
    )   
}
