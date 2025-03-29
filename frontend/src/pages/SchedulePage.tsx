import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import AddModal from '../temp_Modal/AddModal'; 
const API_URL = import.meta.env.VITE_API_URL;

interface ClassSchedule {
  day: string;
  time: string; // e.g. "8:00 AM-9:00 AM" or "None"
}

interface ClassData {
  _id?: string;
  course_code: string;
  class_name: string;
  professor: string;
  meeting_type: string;
  type: string;
  building: string;
  building_prefix?: string;
  room_number: string;
  class_schedule: ClassSchedule[];
}

type SchedulePageProps = {
  globalUser: string;
};

const SchedulePage = ({ globalUser }: SchedulePageProps) => {
  // Extract username from URL parameters
  const { user } = useParams<{ user: string }>();
  // Use the route parameter if globalUser is not set
  const username = globalUser || user || '';

  // State to hold class data and modal open status
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Function to load classes from backend
  const loadClasses = () => {
    if (!username) {
      console.error("No username provided for fetching schedule.");
      return;
    }
    fetch(`${API_URL}/users/classes?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        setClasses(data);
      })
      .catch((err) => console.error('Error fetching schedule:', err));
  };

  // Load classes when component mounts or username changes
  useEffect(() => {
    loadClasses();
  }, [username]);

  // Helper: Map day name to numeric value (0=Sunday, 1=Monday, etc.)
  const dayNameToNumber = (dayName: string): number => {
    const mapping: { [key: string]: number } = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    return mapping[dayName] ?? 0;
  };

  // Helper: Get the next occurrence date for a given day name (for the current week)
  const getNextDateForDay = (dayName: string): Date => {
    const today = new Date();
    const targetDay = dayNameToNumber(dayName);
    let diff = targetDay - today.getDay();
    if (diff < 0) {
      diff += 7;
    }
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate;
  };

  // Helper: Parse a time string like "8:00 AM" into hours and minutes in 24h format
  const parseTimeString = (timeStr: string): { hour: number; minute: number } => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    return { hour: hours, minute: minutes };
  };

  // Helper: Create an ISO string from a day name and a time string (e.g., "8:00 AM")
  const createDateTime = (dayName: string, timeStr: string): string => {
    const date = getNextDateForDay(dayName);
    const { hour, minute } = parseTimeString(timeStr);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };

  // Convert classes into FullCalendar events
  const events = useMemo(() => {
    const evts: any[] = [];
    classes.forEach((cls) => {
      cls.class_schedule
        .filter((sched) => sched.time !== 'None')
        .forEach((sched) => {
          // Expect time format "8:00 AM-9:00 AM"
          const [startTimeStr, endTimeStr] = sched.time.split('-');
          if (startTimeStr && endTimeStr) {
            const event = {
              title: `${cls.class_name} (${cls.course_code})`,
              start: createDateTime(sched.day, startTimeStr.trim()),
              end: createDateTime(sched.day, endTimeStr.trim()),
              extendedProps: {
                professor: cls.professor,
                location: `${cls.building_prefix || ''} ${cls.building} ${cls.room_number}`.trim(),
              },
              color: '#d4af37', // Gold background
              textColor: '#000000', // Black text
            };
            evts.push(event);
          }
        });
    });
    return evts;
  }, [classes]);

  // Handler for deleting a class
  const handleDeleteClass = (classId?: string) => {
    if (!classId) return;
    fetch(`${API_URL}/schedule/deleteClass`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classID: classId }),
    })
      .then((res) => res.json())
      .then((result) => {
        console.log("Delete result:", result);
        // Remove the deleted class from state
        setClasses(prev => prev.filter(cls => cls._id !== classId));
      })
      .catch((err) => console.error("Error deleting class:", err));
  };

  // Handler for editing a class (placeholder)
  const handleEditClass = (classToEdit: ClassData) => {
    console.log("Edit class:", classToEdit);
    // You could open an edit modal with pre-populated values here
  };

  // Handler for adding a class (passed to AddModal)
  const handleAddClass = (newClassData: ClassData) => {
    fetch(`${API_URL}/schedule/addClass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClassData)
    })
      .then((response) => response.json())
      .then((addClassResult) => {
        const classID = addClassResult.classID;
        console.log('New Class ID:', classID);
        // Now call the endpoint to add this class to the user's array
        return fetch(`${API_URL}/users/addClassToUser`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, classId: classID })
        });
      })
      .then((response) => response.json())
      .then((addToUserResult) => {
        console.log('Added class to user:', addToUserResult);
        // After successfully adding, re-fetch classes to update the schedule
        loadClasses();
      })
      .catch((error) => {
        console.error('Error in adding class or updating user:', error);
      });
  };

  return (
    <div className="h-screen flex flex-row pt-14 bg-gray-900">
      {/* LEFT COLUMN: Schedule List */}
      <div className="flex flex-col w-1/3 h-full text-white">
        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 border-b border-yellow-500 pb-2 text-yellow-500">
            My Classes
          </h2>
          {classes.map((cls) => (
            <div
              key={cls._id}
              className="bg-black border border-yellow-500 p-4 rounded-lg shadow-lg mb-4 transition-transform transform hover:scale-102"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-yellow-400">{cls.class_name}</h3>
                <span className="text-sm text-yellow-300">({cls.course_code})</span>
              </div>
              <p className="text-sm mb-1 text-yellow-300">
                <strong>Professor:</strong> {cls.professor}
              </p>
              <p className="text-sm mb-1 text-yellow-300">
                <strong>Location:</strong> {cls.building_prefix} {cls.building} {cls.room_number}
              </p>
              <div className="mt-2">
                {cls.class_schedule
                  .filter((sched) => sched.time !== 'None')
                  .map((sched, i) => (
                    <div key={i} className="flex justify-between text-sm text-yellow-300">
                      <span className="font-medium">{sched.day}</span>
                      <span className="font-semibold">{sched.time}</span>
                    </div>
                  ))}
              </div>
              {/* Edit and Delete Buttons */}
              <div className="mt-4 flex justify-end space-x-2">
                <button 
                  className="px-3 py-1 bg-yellow-300 text-gray-800 rounded hover:bg-blue-600"
                  onClick={() => handleEditClass(cls)}
                >
                  Edit
                </button>
                <button 
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={() => handleDeleteClass(cls._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          className="text-yellow-300 text-lg p-4 bg-black border border-yellow-500 rounded-lg flex items-center justify-center hover:bg-yellow-500 hover:text-black transition duration-300 ease-in-out"
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
        <div className="p-4 bg-black border border-yellow-500 rounded-lg flex items-center justify-center">
          <p className="text-yellow-300 text-lg">Aux Spot</p>
        </div>
      </div>

      {/* RIGHT COLUMN: Calendar View */}
      <div className="flex-1 ml-4 p-4 border rounded-lg bg-black text-white">
        <h2 className="text-2xl mb-4 text-yellow-400">Calendar View</h2>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          height="100%"
        />
      </div>
    </div>
  );
};

export default SchedulePage;