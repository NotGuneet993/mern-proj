import { FormEvent, useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function LogInComps() {

    const [ user, setUser ] = useState('');
    const [ password, setPassword ] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (user && password) {
            setIsSubmitting(true);
        }
    }

    const loginRequest = async () => {
        try {
            const res = await fetch(`${API_URL}/users/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user, password }),
            });

            if (!res.ok) {
                throw new Error("Login failed");
            }

            const data = await res.json();
            console.log("Login success:", data);

        } catch (error) {
            console.error("Error logging in:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (isSubmitting) return;
        loginRequest();

    }, [isSubmitting]);

    const updateUser = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setUser(value);
    }    
    
    const updatePassword = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setPassword(value);
    }

    return (
        <form> 
            <h2 className="text-5xl m-1">Log In</h2>

            <label></label>
            <input name='email' value={user} onChange={updateUser} autoComplete="off"
            className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

            <input name='password' type="password" value={password} onChange={updatePassword}
            className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

            <br />

            <button 
                className='border-1 border-gray-300 px-2 cursor-pointer mmx-2 my-3 py-1 w-[20vw]'
                type='submit'
                onClick={onSubmit}
            >{isSubmitting ? "Logging in..." : "Log In"}</button>

        </form>
    );
}