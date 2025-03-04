import { NavLink } from "react-router-dom";
import "../styles/navbar.css";
import map from "../assets/map.svg"

export default function Navbar() {

    return (
        <nav className="navbar">
            <ul className="navbar-links">
                <li><NavLink to="/">
                    <img src={map} alt="logo" className="navbar-icon" />
                </NavLink></li>
                <li><NavLink to="/">Home</NavLink></li>
                <li><NavLink to="/">Dashboard</NavLink></li>
            </ul>
            <ul className="navbar-buttons">
                <li> <button className="login">Log In</button></li>
                <li><button className="signup">Sign Up</button></li>
            </ul>
        </nav>
    );
};