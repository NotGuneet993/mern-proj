import { useState } from 'react'; // React ... , useEffect
import { AiOutlineCloseCircle } from 'react-icons/ai';
import { ClassData } from '../types/ClassData';
//const API_URL = import.meta.env.VITE_API_URL;



interface ResultsModalProps {
    results: ClassData[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (newClassData: any) => void;
    manualMode: () => void;
}

function ResultsModal({ results, isOpen, onClose, onSave, manualMode}: ResultsModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSubmit = () => {
        const selectedItems = results.filter((item) => selectedIds.includes(item._id));
        onSave(selectedItems);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-100 pb-10 mt-15 md:pt-20 md:pb-5 overflow-scroll">
        <div className="relative max-w-5xl w-full bg-white p-6 rounded shadow-lg text-black">
            {/* Close Button */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 text-3xl hover:text-red-500"
            >
                <AiOutlineCloseCircle />
            </button>

            <h2 className="text-xl font-bold mb-8">Matching Classes:</h2>

            {(
            <ul className="max-h-60 overflow-y-auto space-y-2">
                {results.map((cls) => (
                <li key={cls._id} className="flex items-center gap-4 mb-8">
                    <input
                    type="checkbox"
                    id={cls._id}
                    checked={selectedIds.includes(cls._id)}
                    onChange={() => toggleSelect(cls._id)}
                    />
                    <label htmlFor={cls._id} className="text-sm">
                        {cls.course_code} - {cls.class_name}
                        <br />
                        {Array.isArray(cls.class_schedule)
                        ? cls.class_schedule
                            .filter((sched) => sched.time && sched.time !== "None")
                            .map((sched) => `${sched.day}: ${sched.time}`)
                            .join(" | ")
                        : "No schedule available"}
                        <br />
                        Taught by {cls.professor} in {cls.building_prefix} {cls.room_number} ({cls.building})
                    </label>
                </li>
                ))}
            </ul>
            )}

            <div className="flex justify-end gap-2">
            <button
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                onClick={ () => { manualMode() } }
            >
                I Don't See My Class Here
            </button>
            <button
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded"
                onClick={handleSubmit}
                disabled={selectedIds.length === 0}
            >
                Add Selected
            </button>
            </div>
        </div>
        </div>
    );
};

export default ResultsModal;