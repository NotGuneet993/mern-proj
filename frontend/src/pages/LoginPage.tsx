import LogInComps from "../components/LogInComps";

export default function LoginPage() {
    
    return (
        <div className="bg-stone-900 flex h-screen items-center justify-center">
            <div className="flex w-3/5 h-1/2 bg-stone-50">
                <div className="flex w-1/2 justify-between items-center p-4">
                    <LogInComps />
                </div>
                <div className="flex w-1/2 justify-between items-center p-4">
                    sign up ts 
                </div>
            </div>
        </div>
    );
}