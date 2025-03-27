import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

type Redirect = {
    setAuth: (auth: boolean) => void;
    setGlobalUser: (user: string) => void;
}

export default function Redirect({ setAuth, setGlobalUser } : Redirect) {

    const { username } = useParams();
    const navigate = useNavigate();

    // check if verified === true 
    // otherwise route to dashboard 

    const processRedirect = async () => {
        try {
            const res = await fetch(`${API_URL}/users/checkemail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify({ username }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Request failed');

            const data = await res.json();

            if (data.verified) {
                setAuth(true);
                setGlobalUser(`${username}`);
                navigate(`/dashboard/:${username}`);
            } else {
                console.log(data.message);
                navigate('/');
            }

        } catch(err ) {
            console.log(err);
            navigate('/');
        }
    };
    
    useEffect(() => {
        processRedirect();
    }, [])

    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="flex flex-col justify-center items-center bg-stone-100 m-10 p-10 border-[1px] border-black rounded-md">
                <p>Redirecting user...</p>
            </div>
        </div>
    )   
}
