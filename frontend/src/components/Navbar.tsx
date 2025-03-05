import { NavLink } from "react-router-dom";
import map from "../assets/map.svg"
import GetStartedButton from "./GetStartedButton";

export default function Navbar() {

    return (
        <nav className="flex justify-between items-center p-4 bg-gray-50 text-black">
            <ul className="flex items-center space-x-6 list-none">
                <li><NavLink to="/" className="flex items-center space-x-2">
                    <img src={map} alt="logo" className="w-10 h-10" />
                    <NavLink to="/" className="font-bold text-3xl">KnightNav</NavLink>
                </NavLink></li>
                <li><NavLink to="/" className="font-bold">Home</NavLink></li>
                <li><NavLink to="/dashboard" className="font-bold">Dashboard</NavLink></li>
            </ul>
            <ul className="flex items-center space-x-6 list-none">
                <li><GetStartedButton buttonText="Log In"/></li>
                <li><GetStartedButton buttonText="Sign Up"/></li>
            </ul>
        </nav>
    );
};