import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { ClassData } from '../types/ClassData';
const API_URL = import.meta.env.VITE_API_URL;

type ClassNavigatorProps = {
    globalUser: string;
    setPath: (validNodes: any) => void; // Callback function to send the nodeIds to GeoJSONMap component
    setDistance: (distance: number) => void;
}

export default function ClassNavigator({globalUser, setPath, setDistance}: ClassNavigatorProps){
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

    async function getClassesForDay(username: string, weekday: number) {
        try {
          // Step 1: Fetch the user's classes
          const classesResponse = await fetch(`${API_URL}/users/classes?username=${encodeURIComponent(username)}`);
          if (!classesResponse.ok) {
            throw new Error('Failed to fetch classes');
          }
          const classes = await classesResponse.json();
      
          // Get the classes for the day
          const scheduleResponse = await fetch(`${API_URL}/schedule/cbw`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              weekday: weekday,
              classes: classes
            })
          });
      
          if (!scheduleResponse.ok) {
            throw new Error('Failed to fetch schedule');
          }
      
          // Step 3: Return filtered and sorted class list
          const filteredClasses = await scheduleResponse.json();
          return filteredClasses;
      
        } catch (error) {
          console.error('Error:', error);
          return [];
        }
      }

    const handleClear = async () => {
        setDistance(0);
        setPath({
            "type": "FeatureCollection",
            "features": []
        });
    }

    const handleSearch = async (day : string) => {
        let distance = 0;
        const path = [];

        // Get the valid classes by the day
        // Either through an API or sorting
        const weekday = dayNameToNumber(day);

        // Await the async function and get the actual ClassData[]
        const curr_classes: ClassData[] = await getClassesForDay(globalUser, weekday);

        try{
            for (let i = 0; i < curr_classes.length - 1; i++) {
                const src: string = curr_classes[i].building ?? '';
                const dst: string = curr_classes[i + 1].building ?? '';
                if (src === '' || dst === '') continue;
                
                const response = await fetch(`${API_URL}/locations/getPath?location1=${encodeURIComponent(src)}&location2=${encodeURIComponent(dst)}`);
                if(!response.ok) throw new Error("Couldn't fetch path");

                const data = await response.json();

                path.push(data.path[0]);  // Get the start node
                for (let item of data.path){
                    if(item.geometry.type === 'LineString'){
                        distance += item.properties.distance;
                        path.push(item);
                    }
                }

                path.push(data.path[data.penth.length - 1]);
                
            }

            // Just in case we only have a single class or multiple online classes
            if(path.length === 0){
                for(let i = 0; i < curr_classes.length; i++){
                    const loc: string = curr_classes[i].building_prefix ?? '';
                    if(loc !== ''){
                        path.push(loc);
                    }
                }
            }

            setDistance(Math.round((60 / 3) * distance));
            setPath({
                "type": "FeatureCollection",
                "features": path
            });

        } catch (error){
            console.log(error);
        }
    }

    const handleDayClick = (day: string) => {
        setSelectedDay(prev => {
            const newDay = prev === day ? null : day;
    
            if (newDay === null) {
                handleClear();
            } else {
                handleSearch(newDay);
            }
    
            return newDay;
        });
    };

    // Get the current user's classes
    const { user } = useParams();
    // Use the route parameter if globalUser is not set
    const username = globalUser || user || '';

    const [classes, setClasses] = useState<ClassData[]>([]);  // Holds our class data

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


    return (
        <div className="flex justify-end w-screen z-70">
            <div className="flex flex-col items-left">
                <div className="bg-white rounded-xl p-4 shadow-md w-fit flex gap-2">
                    {days.map((day) => (
                        <button
                            key={day}
                            onClick={() => handleDayClick(day)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                                selectedDay === day
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
                
                {classes.length === 0 ? (
                    <div className="bg-white rounded-xl p-4 shadow-md w-fit flex gap-2">
                    <p className="text-yellow-300 text-base">
                        No classes added yet, head over to "Schedule" to get started! {/* Could make this a click thing */}
                    </p>
                    </div>
                ) : (
                    classes.map((cls) => (
                        <div
                            key={cls._id}
                            className="bg-white rounded-xl p-4 shadow-md w-fit flex gap-2"
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
                        </div>
                    )))}
                
            </div>
        </div>
    );
}