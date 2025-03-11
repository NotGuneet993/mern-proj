import { FormEvent, useState } from "react";
import { IoIosWarning, IoIosCheckmarkCircle } from "react-icons/io";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

type LoginCompsProps = {
    setAuth: (auth: boolean) => void;
}

export default function SignUpComps({ setAuth } : LoginCompsProps) {

    const navigate = useNavigate();
    
    // name and username 
    const [name, setName] = useState('');
    const [username, setusername] = useState('');

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

    // prevent button spam & error
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const updateName = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setName(value);
    }

    const updateUsername = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setusername(value);
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

        if(!password2) {
            setPwMatch(false);
        } else {
            setPwMatch(() => password2 === value);
        }
    }

    const updatePassword2 = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setPassword2(value);
        if(!value) {
            setPwMatch(false);
        } else {
            setPwMatch(() => password === value);
        }
    }

    // POST to create a new account
    // inputs are name, email, username, and password
    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify({ name, email, username, password }),
                credentials: 'include'
            });

            const data = await response.json();
            console.log(data);

            if (data.message !== '') {
                setErrorMessage(data.message);
            } else {
                setErrorMessage('');
                setAuth(true);
                navigate('/dashboard');
                console.log("Test");
            }

        } catch (error) {
            console.log(`Error: ${error}`)
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} method="POST"> 
        <h2 className="text-5xl m-1">Sign Up</h2>

        <input name='name' value={name} onChange={updateName} placeholder='Full Name' autoComplete="off"
        className="border-2 border-gray-400 m-1 rounded-3xl px-3 py-1 w-[20vw]"/>

        <input name='username' value={username} onChange={updateUsername} placeholder='Username' autoComplete="off"
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

        {errorMessage && <h3 className="text-red-500 mx-2">{errorMessage}</h3>}
        <button 
            className='border-1 border-gray-300 px-2 cursor-pointer mmx-2 my-1 py-1 w-[20vw]'
            type='submit' 
            disabled={isSubmitting}
        >{isSubmitting ? "Creating Account..." : "Create Account"}</button>

    </form>
    );
};