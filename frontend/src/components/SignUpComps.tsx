import { FormEvent, useState } from "react";
import { IoIosWarning, IoIosCheckmarkCircle } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { PiCompassRoseLight } from "react-icons/pi";

const API_URL = import.meta.env.VITE_API_URL;

type LoginCompsProps = {
    setAuth: (auth: boolean) => void;
    setIsLoginComp: (auth: boolean) => void;
}

export default function SignUpComps({ setIsLoginComp } : LoginCompsProps) {

    const navigate = useNavigate();

    const pwRequirements = "Your password must contain 8-32 characters, a capital letter, a number, and a special character";
    
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
    
    // swap back to login
    const handleSwap = () => {
        setIsLoginComp(true);
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
                navigate('/mailVerifyPage');
            }

        } catch (error) {
            console.log(`Error: ${error}`)
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center bg-stone-100 py-2 px-5 rounded-md">
            <PiCompassRoseLight className="text-[6rem]"/>
            <h2 className="text-5xl m-1">Sign Up</h2>

            <form onSubmit={handleSubmit} method="POST" className="flex flex-col items-center justify-center"> 

            <input name='name' value={name} onChange={updateName} placeholder='Full Name' autoComplete="off"
            className="border-1 border-gray-400 m-1 px-3 py-1 w-[20vw]"/>

            <input name='username' value={username} onChange={updateUsername} placeholder='Username' autoComplete="off"
            className="border-1 border-gray-400 m-1 px-3 py-1 w-[20vw]"/>

            <input name='email' value={email} onChange={updateEmail} placeholder='Email' autoComplete="off"
            className="border-1 border-gray-400 m-1 px-3 py-1 w-[20vw]"/>
            {validEmail ? 
                <h6 className="flex items-start gap-2 text-sm text-green-600 px-3 max-w-[20vw] break-words leading-snug">
                    <span className="min-w-[1.25rem] mt-[2px]"><IoIosCheckmarkCircle /></span>
                    <span>Email is valid</span>
                </h6> 
                : 
                <h6 className="flex items-start gap-2 text-sm text-red-500 px-3 max-w-[20vw] break-words leading-snug">
                    <span className="min-w-[1.25rem] mt-[2px]"><IoIosWarning /></span>
                    <span>Please enter a valid email</span>
                </h6>
            }

            <input name='password' type="password" value={password} onChange={updatePassword} placeholder='Password' autoComplete="off"
            className="border-1 border-gray-400 m-1 px-3 py-1 w-[20vw]"/>
            {(pwLength && pwCapitalLetter && pwNum && pwSpecChar) ? 
                <h6 className="flex items-start gap-2 text-sm text-green-600 px-3 max-w-[20vw] break-words leading-snug">
                    <span className="min-w-[1.25rem] mt-[2px]"><IoIosCheckmarkCircle /></span>
                    <span>{pwRequirements}</span>
                </h6>
                :
                <h6 className="flex items-start gap-2 text-sm text-red-500 px-3 max-w-[20vw] break-words leading-snug">
                    <span className="min-w-[1.25rem] mt-[2px]"><IoIosWarning /></span>
                    <span>{pwRequirements}</span>
                </h6>
            }

            <input name='confirmPassword' type="password" value={password2} onChange={updatePassword2} placeholder='Confirm Password' autoComplete="off"
            className="border-1 border-gray-400 m-1 px-3 py-1 w-[20vw]"/>
            {pwMatch ? 
                <h6 className="flex items-start gap-2 text-sm text-green-600 px-3 max-w-[20vw] break-words leading-snug">
                    <span className="min-w-[1.25rem] mt-[2px]"><IoIosCheckmarkCircle /></span>
                    <span>Passwords match</span>
                </h6>
                :
                <h6 className="flex items-start gap-2 text-sm text-red-500 px-3 max-w-[20vw] break-words leading-snug">
                    <span className="min-w-[1.25rem] mt-[2px]"><IoIosWarning /></span> 
                    <span>Passwords do not match</span>
                </h6>
            }

            {errorMessage && <h3 className="text-red-500 mx-2">{errorMessage}</h3>}
            <button 
                className='border-2 border-gray-800  px-2 cursor-pointer mx-1 my-3 py-1 w-[20vw] bg-linear-70 from-yellow-300 to-amber-500
                transition-all hover:bg-linear-70 hover:from-yellow-400 hover:to-amber-600 hover:cursor-pointer rounded-sm hover:rounded-4xl'
                type='submit' 
                // it needs to be disabled if anyone of the blocking events are true 
                disabled={isSubmitting || !pwMatch || !pwLength || !pwCapitalLetter || !pwNum || !pwSpecChar}
            >{isSubmitting ? "Creating Account..." : "Create Account"}</button>

        </form>
        <p className="text-black text-sm" onClick={handleSwap}>Already have an account? Click here!</p>
    </div>
    );
};