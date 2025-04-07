import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import AddModal from '../temp_Modal/AddModal'; 
import SearchModal from '../temp_Modal/SearchModal'; 
import ResultsModal from '../temp_Modal/ResultsModal'; 
import { AiFillDelete } from 'react-icons/ai';
import { ClassData } from '../types/ClassData';
const API_URL = import.meta.env.VITE_API_URL;

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
  const [found, setFound] = useState<boolean | null>(null); // null meaning we haven't searched yet
  const [searchResults, setSearchResults] = useState<ClassData[]>([]);
  const [manualMode, setManualMode] = useState(false); // for manual class addition

  // Handler for resetting search-related variables on modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setFound(null);
    setSearchResults([]);
    if (manualMode) setManualMode(false);
    console.log("Modal closed");
  };

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
        console.log("Fetched schedule data:", data);
        // If data is not an array, default to an empty array
        setClasses(Array.isArray(data) ? data : []);
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

  // Helper: Create an array of ISO strings from a day name and a time string (e.g., "8:00 AM")
  const createDateTimes = (dayName: string, timeStr: string): string[] => {
    let dates = [];
    const endOfSem = new Date('2025-04-30T00:00:00'); // TODO End of Spring, change as needed
    
    const date = getNextDateForDay(dayName);
    const { hour, minute } = parseTimeString(timeStr);
    date.setHours(hour, minute, 0, 0);
    while (date < endOfSem) {
      dates.push(date.toISOString());
      date.setDate(date.getDate() + 7); // Add a week
    }
    
    return dates;
  };

  // Convert classes into FullCalendar events
  const events = useMemo(() => {
    const evts: any[] = [];
    (classes || []).forEach((cls) => {
      if (!cls) return;
      (cls.class_schedule || [])
        .filter((sched) => sched.time !== 'None')
        .forEach((sched) => {
          // Expect time format "8:00 AM-9:00 AM"
          const [startTimeStr, endTimeStr] = sched.time.split('-');
          if (startTimeStr && endTimeStr) {
            const starts = createDateTimes(sched.day, startTimeStr.trim());
            const ends = createDateTimes(sched.day, endTimeStr.trim());
            const total = starts.length;
            
            let i = 0; while (i < total) {
              const event = {
                title: `${cls.class_name} (${cls.course_code})`,
                start: starts[i],
                end: ends[i],
                extendedProps: {
                  professor: cls.professor,
                  location: `${cls.building_prefix || ''} ${cls.building} ${cls.room_number}`.trim(),
                },
                color: '#d4af37', // Gold background
                textColor: '#000000', // Black text
              };
              
              evts.push(event);
              i += 1;
            }
          }
        });
    });
    
    console.log(evts);
    return evts;
  }, [classes]);

  // Updated handler for deleting a class from a user
  const handleDeleteClass = (classId?: string) => {
    if (!classId) return;
    fetch(`${API_URL}/users/removeClassFromUser`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, classId: classId }),
    })
      .then((res) => res.json())
      .then((result) => {
        console.log("Delete result:", result);
        // After removal, re-fetch the updated classes
        loadClasses();
      })
      .catch((err) => console.error("Error deleting class:", err));
  };

  // Handler for editing a class (placeholder)
  /*
  const handleEditClass = (classToEdit: ClassData) => {
    console.log("Edit class:", classToEdit);
    // TODO: Open an edit modal with pre-populated values
  };
  */


  // Handler for searching class sections (passed to SearchModal)
  const handleSearchClass = (searchClassData: ClassData) => {
    const params = new URLSearchParams({ 
      course_code: searchClassData.course_code, professor: searchClassData.professor,
      meeting_type: searchClassData.meeting_type, type: searchClassData.type });
    let sections = [];
    fetch(`${API_URL}/schedule/search?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        sections = data.map((cls: any) => ({
          _id: cls._id, 
          course_code: cls.course_code, 
          class_name: cls.class_name, 
          professor: cls.professor, 
          meeting_type: cls.meeting_type, 
          type: cls.type, 
          class_schedule: cls.class_schedule,
          building: cls.building,
          building_prefix: cls.building_prefix,
          room_number: cls.room_number
        }));
        

        setSearchResults(sections);
        console.log(sections); // TODO Remove
        setFound(sections.length > 0);
        setModalOpen(true);
      })
      .catch((err) => {
        console.error('Error fetching class sections:', err);
        setFound(false);
        setSearchResults([]);
        setModalOpen(true); // still show modal even on error
      });
  
  };

  // Handler for adding a class (passed to AddModal)
  const handleAddClass = (newClassData: ClassData[]) => {
    newClassData.forEach((cls) => {
      const body = JSON.stringify(cls);
      console.log(`Body contains: ${body}`);
      fetch(`${API_URL}/schedule/getClass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      })
        .then((response) => response.json())
        .then((getClassResult) => {
          const classID = getClassResult.classID;
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
    });
  };

  return (
    <div className="h-[100vh] flex flex-row pt-14 bg-black">
      {/* LEFT COLUMN: Schedule List */}
      <div className="flex flex-col w-1/3 h-full text-white">
        <div className="flex-1 p-2 overflow-y-auto">
          <h2 className="text-xl font-bold mb-2 border-b border-yellow-500 pb-1 text-yellow-500">
            My Classes
          </h2>
          {classes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-yellow-300 text-base">
                No classes added yet. Click "Add Class" to begin.
              </p>
            </div>
          ) : (
            classes.map((cls) => (
              <div
                key={cls._id}
                className="bg-black border border-yellow-500 p-2 rounded-lg shadow-sm mb-2 transition-transform transform hover:scale-102"
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-lg font-bold text-yellow-400">{cls.class_name}</h3>
                  <span className="text-xs text-yellow-300">({cls.course_code})</span>
                </div>
                <p className="text-xs mb-1 text-yellow-300">
                  <strong>Prof:</strong> {cls.professor}
                </p>
                <p className="text-xs mb-1 text-yellow-300">
                  <strong>Loc:</strong> {cls.building_prefix} {cls.building} {cls.room_number}
                </p>
                <div className="mt-1 space-y-0.5">
                  {(cls.class_schedule || [])
                    .filter((sched) => sched.time !== 'None')
                    .map((sched, i) => (
                      <div key={i} className="flex justify-between text-xs text-yellow-300">
                        <span className="font-medium">{sched.day}</span>
                        <span className="font-semibold">{sched.time}</span>
                      </div>
                    ))}
                </div>
                {/* Edit and Delete Buttons */}
                <div className="mt-2 flex justify-end space-x-2">
                  <button 
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleDeleteClass(cls._id)}
                  >
                    <AiFillDelete className="inline-block mr-1" />
                    <span className="text-xs">Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <button
          className="text-yellow-300 text-base p-2 bg-black border border-yellow-500 rounded-lg flex items-center justify-center hover:bg-yellow-500 hover:text-black transition duration-300 ease-in-out my-4"
          onClick={() => setModalOpen(true)}
        >
          Add Class
        </button>
        {/* Part 1: Search for a class */}
        {modalOpen && (
          <SearchModal
            isOpen={modalOpen}
            onClose={() => handleCloseModal()}
            onSave={handleSearchClass}
          />
        )}
        {/* Part 2A: Display search results or default to Add modal */}
        {modalOpen && found !== null && (
          found ? (
            <ResultsModal
              results={searchResults}
              isOpen={modalOpen}
              onClose={() => handleCloseModal()}
              onSave={handleAddClass}
              manualMode={ () => {setManualMode(true); setModalOpen(true)} }
            />
          ) : (
            <AddModal
              message="We couldn't find a section with those parameters! Let's add it manually."
              isOpen={modalOpen}
              onClose={() => handleCloseModal()}
              onSave={handleAddClass}
            />
          )
        )}
        {/* Part 2B: User-driven manual addition */}
        {modalOpen && manualMode && (
          <AddModal
            message="Manual Class Addition"
            isOpen={modalOpen}
            onClose={() => handleCloseModal()}
            onSave={handleAddClass}
          />
        )}
      </div>

      {/* RIGHT COLUMN: Calendar View */}
      <div className="flex-1 m-4 p-4 border rounded-lg bg-black text-white">
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
          height="90%"
        />
      </div>
    </div>
  );
};

export default SchedulePage;