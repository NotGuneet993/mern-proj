import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
    isAuth: boolean;
    redirectPath?: string;
}

export default function ProtectedRoute({ isAuth, redirectPath = "/get-started" } : ProtectedRouteProps) {
    if (!isAuth) {
        return <Navigate to={redirectPath} replace />; 
    }

    return <Outlet />;
};

 ProtectedRoute;