import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AddModal from '../temp_Modal/AddModal';
const API_URL = import.meta.env.VITE_API_URL;

function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);

  // extract username from the top url 
  const { user } = useParams();

  // Suppose you keep a local list of classes:
  const [classes, setClasses] = useState<ClassData[]>([]);

  interface ClassData {
    course_code: string;
    class_name: string;
    professor: string;
  }

  const handleAddClass = (newClassData: ClassData) => {
    fetch(`${API_URL}/schedule/addClass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newClassData)
    })
      .then((response) => response.json())
      .then((addClassResult) => {
        // classID being returned from the add class endpoints
        const classID = addClassResult.classID;
        console.log('New Class ID:', classID);
  
        // Now call the endpoint to add this class to the user's array
        return fetch(`${API_URL}/users/addClassToUser`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: user, classId: classID })
        });
      })
      .then((response) => response.json())
      .then((addToUserResult) => {
        // Here you can see the updated user or a success message
        console.log('Added class to user:', addToUserResult);
      })
      .catch((error) => {
        console.error('Error in adding class or updating user:', error);
      });
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
      <h2>hi {user}</h2>
    </div>
    
  );
}

export default DashboardPage;
