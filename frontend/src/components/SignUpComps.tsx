import { FormEvent, useState } from "react";

export default function SignUpComps() {
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');

    const updateName = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setName(value);
    }

    const updateEmail = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setEmail(value);
    }

    const updatePassword = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setPassword(value);
    }

    const updatePassword2 = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setPassword2(value);
    }

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

    };

    return (
        <form onSubmit={handleSubmit} method="POST"> 
        <h2 className="text-5xl m-1">Sign Up</h2>

        <input name='name' value={name} onChange={updateName} placeholder='Full Name' autoComplete="off"
        className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

        <input name='email' value={email} onChange={updateEmail} placeholder='Email' autoComplete="off"
        className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

        <input name='password' type="password" value={password} onChange={updatePassword} placeholder='Password' autoComplete="off"
        className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

        <input name='confirmPassword' type="password" value={password2} onChange={updatePassword2} placeholder='Confirm Password' autoComplete="off"
        className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

        <br />

        <button 
            className='border-1 border-gray-300 px-2 cursor-pointer mmx-2 my-3 py-1 w-[20vw]'
            type='submit' 
        >Create Account</button>

    </form>
    );
};