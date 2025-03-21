import { NavLink, useNavigate } from "react-router-dom";
import { PiCompassRoseLight } from "react-icons/pi";

type NavbarProps = {
    isAuth: boolean;
    setAuth: (auth: boolean) => void;
}

export default function Navbar({ isAuth, setAuth } : NavbarProps) {

    const navigate = useNavigate();


    // button handler functions
    const goToSignUp = () => {
        navigate('/get-started');
    }

    const signOut = () => {
        setAuth(false);
        navigate('/');
    }


    // styling for tailwind 
    const liTextStyle = "hidden sm:inline-block p-2.5 text-1.5xl cursor-pointer hover:text-yellow-400 duration-300 ease-in-out";
    const buttonStyle = "text-1.5xl px-[20px] py-[5px] bg-gray-200 rounded-xl hover:bg-gray-400/75 cursor-pointer";

    return (
        <nav 
            className= "w-screen h-[60px] fixed flex justify-between items-center z-99 py-2 px-[20px] bg-gray-50 border-t border-b border-gray-300 "
        > 
            <NavLink to='/'><h1 className="flex items-center text-2xl cursor-pointer hover:text-yellow-400 duration-300 ease-in-out">
                KnightNav <PiCompassRoseLight className="text-4xl m-1"/>
            </h1></NavLink>

            <ul className="list-none ">
                <li className={liTextStyle}><NavLink to='/' className='no-underline'>Home</NavLink></li>
                {isAuth && <li className={liTextStyle}><NavLink to='/dashboard' className='no-underline'>Dashboard</NavLink></li>}
                <li className={liTextStyle}><NavLink to='/stim' className='no-underline'>Stim</NavLink></li>

                {isAuth ? (
                    <>
                        <li className="inline-block p-1.5"><button className={buttonStyle} onClick={signOut}>Sign Out</button></li>
                    </>
                ) : (
                    <>
                        <li className="inline-block p-1.5"><button className={buttonStyle} onClick={goToSignUp}>Log In</button></li>
                        <li className="hidden sm:inline-block p-1.5"><button className={buttonStyle} onClick={goToSignUp}>Sign Up</button></li>
                    </>
                )}

            </ul>
        </nav>
    );
};