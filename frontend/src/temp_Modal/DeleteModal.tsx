interface DeleteModalProps {
    realID: string;
    c_id: string;
    c_code: string;
    c_name: string;
    isOpen: boolean;
    onDelete: () => void;
    onCancel: () => void;
}

function DeleteModal( { realID, c_id, c_code, c_name, isOpen, onDelete, onCancel } : DeleteModalProps) {

    if (!isOpen || realID !== c_id ) return null;

    return (
        <div className="relative max-w-5xl w-full bg-gray-200 p-6 rounded shadow-lg text-black">
            <h2 className="text-xl font-semibold mb-4">Are you sure you want to remove<br />{c_code} - {c_name} from your schedule?</h2>

            <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded mr-4"
                onClick={onDelete}
            >
                Delete
            </button>

            <button
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                onClick={onCancel}
            >
                Cancel
            </button>
        </div>
    )
}

export default DeleteModal;