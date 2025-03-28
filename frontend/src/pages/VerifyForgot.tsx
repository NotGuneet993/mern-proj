import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { PiCompassRoseLight } from "react-icons/pi";
import { IoIosWarning, IoIosCheckmarkCircle } from "react-icons/io";

const API_URL = import.meta.env.VITE_API_URL;

export default function VerifyForgot() {

    const { username } = useParams();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [newPassword2, setNewPassword2] = useState('');

    const [pwMatch, setPwMatch] = useState(false);
    const [pwLength, setPwLength] = useState(false);
    const [pwCapitalLetter, setPwCapitalLetter] = useState(false);
    const [pwNum, setPwNum] = useState(false);
    const [pwSpecChar, setPwSpecChar] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const pwRequirements = "Your password must contain 8-32 characters, a capital letter, a number, and a special character";

    const updatePassword = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setNewPassword(value);
        
        setPwLength(() => value.length >=8 && value.length <= 32);
        setPwCapitalLetter(() => /[A-Z]/.test(value));
        setPwSpecChar(() => /[!@#$%^&*(),.?":{}|<>]/.test(value));
        setPwNum(() => /\d/.test(value));

        if(!newPassword2) {
            setPwMatch(false);
        } else {
            setPwMatch(() => newPassword2 === value);
        }
    }

    const updatePassword2 = ({ target: { value }} : React.ChangeEvent<HTMLInputElement>) => {
        setNewPassword2(value);
        if(!value) {
            setPwMatch(false);
        } else {
            setPwMatch(() => newPassword === value);
        }
    }

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            console.log("Called");
            const res = await fetch(`${API_URL}/users/changepw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify({ username, newPassword }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Request failed');

        } catch (error) {
            console.log(error)
        } finally {
            setIsSubmitting(false);
            navigate('/');
        }
    }

    return (
        <div className="bg-stone-900 flex h-full items-center justify-center">       
            <div className="flex flex-col items-center justify-center bg-stone-100 py-5 px-5 rounded-md">
                <PiCompassRoseLight className="text-[6rem]"/>
                <h2 className="text-5xl m-3">Reset Password</h2>

                <p>Please enter your new password.</p>

                <form onSubmit={handleSubmit} method="POST" className="flex flex-col items-center justify-center"> 

                    <input name='password' type="password" value={newPassword} onChange={updatePassword} placeholder='Password' autoComplete="off"
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

                    <input name='confirmPassword' type="password" value={newPassword2} onChange={updatePassword2} placeholder='Confirm Password' autoComplete="off"
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

                    <button 
                        className='border-2 border-gray-800  px-2 cursor-pointer mx-1 my-3 py-1 w-[20vw] bg-linear-70 from-yellow-300 to-amber-500
                        transition-all hover:bg-linear-70 hover:from-yellow-400 hover:to-amber-600 hover:cursor-pointer rounded-sm hover:rounded-4xl'
                        type='submit'
                        disabled={isSubmitting || !pwMatch || !pwLength || !pwCapitalLetter || !pwNum || !pwSpecChar}  
                    >{isSubmitting ? "Loading..." : "Change password"}</button>
                </form>
            </div>
        </div>
    )
}