import { useEffect, useState } from "react";
import Select from 'react-select';
const API_URL = import.meta.env.VITE_API_URL;

type MapClassesProps = {
  user: string;
}

export default function MapClasses({ user } : MapClassesProps) {

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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

    const [curDay, setCurDay] = useState('');
    const [initClass, setInitClasses] = useState();

    async function getClassesForDay(username: string, weekday: number) {
      try {
        // Step 1: Fetch the user's classes
        const classesResponse = await fetch(`${API_URL}/users/classes?username=${encodeURIComponent(username)}`);
        if (!classesResponse.ok) {
          throw new Error('Failed to fetch classes');
        }
        const classes = await classesResponse.json();
        const simplifiedClasses = classes.map((cls: any) => ({
          _id: cls._id,
          class_name: cls.class_name,
          class_schedule: cls.class_schedule
        }))
        
        console.log(simplifiedClasses);

        // Get the classes for the day
        const scheduleResponse = await fetch(`${API_URL}/schedule/cbw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            weekday: weekday,
            classes: simplifiedClasses
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

    useEffect(() => {
      const temp = async () => {
        console.log(await getClassesForDay(user, dayNameToNumber('Tuesday')));
      }

      temp();
    }, [])

    return(
        <div className="flex flex-col bg-stone-100 border-2 border-yellow-400 rounded-3xl p-5">
            <div className="flex items-center mb-3">
                <p >Class for: </p>
                <div className="mx-0.5 min-w-[150px]">
                    <Select
                        options={days.map(loc => ({ value: loc, label: loc }))}
                        value={curDay ? { value: curDay, label: curDay } : null}
                        onChange={(selectedOption) => {
                        if (selectedOption) {
                            setCurDay(selectedOption.value);
                        }
                        }}
                        placeholder="Start location"
                        maxMenuHeight={200}
                    />
                </div>
            </div>
            <div className="flex flex-col items-center justify-center">
                <div>hi</div>
                <div>hi</div>
                <div>hi</div>
                <div>hi</div>
                <div>{initClass}</div>
            </div>
        </div>
    );
}
