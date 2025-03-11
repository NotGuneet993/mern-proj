import { FormEvent, useState } from "react";
import { IoIosWarning, IoIosCheckmarkCircle } from "react-icons/io";

export default function SignUpComps() {
    
    // name and username 
    const [name, setName] = useState('');

    // email and valid email
    const [email, setEmail] = useState('');
    const [validEmail, setValidEmail] = useState(false);

    // the password must be 8-32 characteres, have a capital letter, atleast one number, and atleast one special character
    const [password, setPassword] = useState('');
    const [pwLength, setPwLength] = useState(false);
    const [pwCapitalLetter, setPwCapitalLetter] = useState(false);
    const [pwNum, setPwNum] = useState(false);
    const [pwSpecChar, setPwSpecChar] = useState(false);

    // makesure passwords match 
    const [password2, setPassword2] = useState('');
    const [pwMatch, setPwMatch] = useState(false);

    const updateName = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setName(value);
    }

    const updateEmail = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setEmail(value);
        setValidEmail(() => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        });
    }

    const updatePassword = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setPassword(value);
        
        setPwLength(() => value.length >=8 && value.length <= 32);
        setPwCapitalLetter(() => /[A-Z]/.test(value));
        setPwSpecChar(() => /[!@#$%^&*(),.?":{}|<>]/.test(value));
        setPwNum(() => /\d/.test(value));
    }

    const updatePassword2 = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setPassword2(value);
        if(!password2) {
            setPwMatch(false);
        } else {
            setPwMatch(() => password === value);
        }
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
        {validEmail ? <h6 className="flex text-green-600 items-center px-3"><IoIosCheckmarkCircle/> Email is valid</h6> : <h6 className="flex text-red-500 items-center px-3"><IoIosWarning/> Please enter a valid email</h6>}

        <input name='password' type="password" value={password} onChange={updatePassword} placeholder='Password' autoComplete="off"
        className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>
        {pwLength ? <h6 className="flex text-green-600 items-center px-3"><IoIosCheckmarkCircle/> Password must be 8-32 characteres</h6> : <h6 className="flex text-red-500 items-center px-3"><IoIosWarning/> Password must be 8-32 characteres</h6>}
        {pwCapitalLetter ? <h6 className="flex text-green-600 items-center px-3"><IoIosCheckmarkCircle/> Password must contain a capital letter</h6> : <h6 className="flex text-red-500 items-center px-3"><IoIosWarning/> Password must contain a capital letter</h6>}
        {pwNum ? <h6 className="flex text-green-600 items-center px-3"><IoIosCheckmarkCircle/> Password must contain a number</h6> : <h6 className="flex text-red-500 items-center px-3"><IoIosWarning/> Password must contain a number</h6>}
        {pwSpecChar ? <h6 className="flex text-green-600 items-center px-3"><IoIosCheckmarkCircle/> Password must contain a special character</h6> : <h6 className="flex text-red-500 items-center px-3"><IoIosWarning/> Password must contain a special character</h6>}

        <input name='confirmPassword' type="password" value={password2} onChange={updatePassword2} placeholder='Confirm Password' autoComplete="off"
        className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>
        {pwMatch ? <h6 className="flex text-green-600 items-center px-3"><IoIosCheckmarkCircle/> Passwords match</h6> : <h6 className="flex text-red-500 items-center px-3"><IoIosWarning/> Passwords do not match</h6>}

        <button 
            className='border-1 border-gray-300 px-2 cursor-pointer mmx-2 my-3 py-1 w-[20vw]'
            type='submit' 
        >Create Account</button>

    </form>
    );
};