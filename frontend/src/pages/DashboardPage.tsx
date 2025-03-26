import { useState } from 'react';
import AddModal from '../temp_Modal/AddModal';

function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);

  // Suppose you keep a local list of classes:
  const [classes, setClasses] = useState<ClassData[]>([]);

  interface ClassData {
    course_code: string;
    class_name: string;
    professor: string;
  }

  const handleAddClass = (newClassData: ClassData) => {
    //it is curretly not saving the data to the database
    //we can call the schedule addClass api to add the class
    setClasses((prev) => [...prev, newClassData]);
    classes;
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => setModalOpen(true)}
      >
        Add Class
      </button>
      {modalOpen && (
        <AddModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleAddClass}
        />
      )}
    </div>
    
  );
}

export default DashboardPage;
