import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AddModal from '../temp_Modal/AddModal';
import PathBar from '../components/PathBar';
import PlusButtonMenu from '../components/PlusButtonMenu';
import GeoJSONMap from '../components/Graph';

const API_URL = import.meta.env.VITE_API_URL;

function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [validNodes, setValidNodes] = useState<any[]>([]);

  // extract username from the top url 
  const { user } = useParams();

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
    <div className="flex flex-col w-screen h-screen pt-[60px]">
      <div className='flex flex-col justify-center items-center h-[calc(100vh-60px)]'>

        <div className="fixed flex top-[70px] box-border w-screen h-[80px] justify-center z-1">
          <PathBar username={user ?? 'Plaeholder'} onSearch={setValidNodes}/>
        </div>
          
        <GeoJSONMap validNodes={validNodes}/>

        {modalOpen && (
          <AddModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleAddClass}
          />
        )}

        <div className='fixed bottom-[5%] left-[5%] z-50'>
          <PlusButtonMenu setModalOpen={setModalOpen}/>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
