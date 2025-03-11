import LogInComps from "../components/LogInComps";
import SignUpComps from "../components/SignUpComps";

type LoginPageProps = {
    setAuth: (auth: boolean) => void;
}

export default function LoginPage({ setAuth } : LoginPageProps) {
    
    return (
        <div className="bg-stone-900 flex h-full items-center justify-center">
            <div className="flex w-3/5 h-2/3 bg-stone-50 rounded-4xl">
                <div className="flex w-1/2 justify-between items-center p-4">
                    <LogInComps setAuth={setAuth}/>
                </div>
                <div className="flex w-1/2 justify-between items-center p-4">
                    <SignUpComps setAuth={setAuth}/>
                </div>
            </div>
        </div>
    );
}