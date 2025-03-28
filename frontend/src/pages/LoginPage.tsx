import LogInComps from "../components/LogInComps";
import SignUpComps from "../components/SignUpComps";

type LoginPageProps = {
    setAuth: (auth: boolean) => void;
    setIsLoginComp: (auth: boolean) => void;
    isLoginComp: boolean;
    setGlobalUser: (user: string) => void;
}

export default function LoginPage({ setAuth, setIsLoginComp, isLoginComp, setGlobalUser } : LoginPageProps) {
    
    return (
        <div className="bg-stone-900 flex h-full items-center justify-center">
            {isLoginComp ? <LogInComps setAuth={setAuth} setIsLoginComp={setIsLoginComp} setGlobalUser={setGlobalUser}/> : <SignUpComps setAuth={setAuth} setIsLoginComp={setIsLoginComp}/>}
        </div>
    );
}