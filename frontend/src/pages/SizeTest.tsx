import PathBar from "../components/PathBar"


export default function SizeTest() {
    return (
        <div className="w-screen h-screen pt-[60px]">
            <div
                className="flex box-border border-4 border-red-500 w-screen h-[calc(100vh-65px)] justify-center bg-stone-100"
            >
                <PathBar />
            </div>
        </div>
    )
}