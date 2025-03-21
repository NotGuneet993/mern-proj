import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

type LoginCompsProps = {
    setAuth: (auth: boolean) => void;
}

export default function LogInComps({ setAuth } : LoginCompsProps) {

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
                navigate('/dashboard');
            }
            
        } catch (error) {
            console.log(`Error: ${error}`)
        } finally {
            setIsSubmitting(false);
        }
    }


    // JSX for the page
    return (
        <form onSubmit={handleSubmit} method="POST"> 
            <h2 className="text-5xl m-1">Log In</h2>

            <input name='email' value={email} onChange={updateEmail} placeholder='Email' autoComplete="off"
            className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

            <input name='password' type="password" value={password} onChange={updatePassword} placeholder='Password' autoComplete="off"
            className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

            <br />
            {errorMessage && <h3 className="text-red-500 mx-2">{errorMessage}</h3>}
            <button 
                className='border-1 border-gray-300 px-2 cursor-pointer mmx-2 my-3 py-1 w-[20vw]'
                type='submit'
                disabled={isSubmitting} 
            >{isSubmitting ? "Logging in..." : "Log In"}</button>

        </form>
    );
}