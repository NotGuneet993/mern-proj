import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PiCompassRoseLight } from "react-icons/pi";
const API_URL = import.meta.env.VITE_API_URL;

type LoginCompsProps = {
    setAuth: (auth: boolean) => void;
    setIsLoginComp: (auth: boolean) => void;
    setGlobalUser: (user: string) => void;
}

export default function LogInComps({ setAuth, setIsLoginComp, setGlobalUser } : LoginCompsProps) {

    const [ email, setEmail ] = useState('');
    const [ password, setPassword ] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const navigate = useNavigate();
    
    // used for validation 
    const updateEmail = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setEmail(value);
    }    
    
    const updatePassword = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setPassword(value);
    }

    // used to swap to registration 
    const handleSwap = () => {
        setIsLoginComp(false);
    }

    // POST logic
    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {            
            const response = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!data.authorization) {
                setErrorMessage(data.message);
            } else {
                setErrorMessage('');
                setAuth(true);
                setGlobalUser(data.username);
                navigate(`/dashboard/:${data.username}`);
            }
            
        } catch (error) {
            console.log(`Error: ${error}`)
        } finally {
            setIsSubmitting(false);
        }
    }


    // JSX for the page
    return (
        <div className="flex flex-col items-center justify-center bg-stone-100 py-5 px-5 rounded-md">
            <PiCompassRoseLight className="text-[6rem]"/>
            <h2 className="text-5xl m-3">Log In</h2>

            <form onSubmit={handleSubmit} method="POST" className="flex flex-col items-center justify-center"> 

                <input name='email' value={email} onChange={updateEmail} placeholder='Email' autoComplete="off"
                className="border-1 border-gray-400 m-2 px-3 py-1 w-[20vw]"/>

                <input name='password' type="password" value={password} onChange={updatePassword} placeholder='Password' autoComplete="off"
                className="border-1 border-gray-400 m-2 px-3 py-1 w-[20vw]"/>

                <Link to='/forgotPassword' className="text-blue-500 text-sm m-1">Forgot password? </Link>

                {errorMessage && <h3 className="text-red-500 mx-2">{errorMessage}</h3>}
                <button 
                    className='border-2 border-gray-800  px-2 cursor-pointer mx-1 my-3 py-1 w-[20vw] bg-linear-70 from-yellow-300 to-amber-500
                    transition-all hover:bg-linear-70 hover:from-yellow-400 hover:to-amber-600 hover:cursor-pointer rounded-sm hover:rounded-4xl'
                    type='submit'
                    disabled={isSubmitting} 
                >{isSubmitting ? "Logging in..." : "Log In"}</button>
            </form>

            <p className="text-black text-sm" onClick={handleSwap}>New to KnightNav? Click here!</p>

        </div>
    );
}