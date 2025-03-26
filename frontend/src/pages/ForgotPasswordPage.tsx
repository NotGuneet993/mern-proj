import { PiCompassRoseLight } from "react-icons/pi";
import { useState } from "react";

export default function ForgotPasswordPage() {

    const [ email, setEmail ] = useState('');

    // used for validation 
    const updateEmail = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setEmail(value);
    }    

    const handleSubmit = () => {

    };


    return (
        <div className="bg-stone-900 flex h-full items-center justify-center">       
            <div className="flex flex-col items-center justify-center bg-stone-100 py-5 px-5 rounded-md">
                <PiCompassRoseLight className="text-[6rem]"/>
                <h2 className="text-5xl m-3">Forgot Password</h2>

                <p>Please enter your email.</p>
                <p>If an account under that email exists,</p>
                <p>you will recieve a link to change your password.</p>

                <form onSubmit={handleSubmit} method="POST" className="flex flex-col items-center justify-center"> 

                    <input name='email' value={email} onChange={updateEmail} placeholder='Email' autoComplete="off"
                    className="border-1 border-gray-400 m-2 px-3 py-1 w-[20vw]"/>

                    <button 
                        className='border-2 border-gray-800  px-2 cursor-pointer mx-1 my-3 py-1 w-[20vw] bg-linear-70 from-yellow-300 to-amber-500
                        transition-all hover:bg-linear-70 hover:from-yellow-400 hover:to-amber-600 hover:cursor-pointer rounded-sm hover:rounded-4xl'
                        type='submit'
                        disabled={true} 
                    >{false ? "Loading..." : "Change email"}</button>
                </form>
            </div>
        </div>
    );
}