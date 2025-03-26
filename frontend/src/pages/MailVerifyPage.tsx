import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

export default function MailVerifyPage() {

    
    const [redirect, setRedirect] = useState(false);

    useEffect(() => {
        const go = setTimeout(() => {
            setRedirect(true);
        }, 10000);

        return () => clearTimeout(go);
    }, []);

    if (redirect) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="flex flex-col justify-center items-center bg-stone-100 m-10 p-10 border-[1px] border-black rounded-md">
                <p className="">Please confirm your account by clicking on the link in the email you used to sign up.</p>
                <br />
                <p>You will redirected to the login page in 10 seconds or <Link to='/' className="text-blue-500 underline underline-offset-1">click here</Link></p>
            </div>
        </div>
    )   
}
