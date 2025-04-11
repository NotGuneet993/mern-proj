import { useEffect, useState } from "react";
import Select from 'react-select';
const API_URL = import.meta.env.VITE_API_URL;

type MapClassesProps = {
  user: string;
}

type ScheduleItem = {
  class_name: string;
  building: string;
};

const weekdays = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2, 
  Thursday: 3,
  Friday: 4,
};

export default function MapClasses({ user } : MapClassesProps) {

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const [curDay, setCurDay] = useState('');
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

    const fetchClass = async (day: keyof typeof weekdays) => {
 
      const weekdayInt = weekdays[day];
      
      try { 
        const classesResponse = await fetch(`${API_URL}/users/classes?username=${user}`)
        if (!classesResponse.ok) {
          console.log("ts pmo");
          return;
        }

        const classesData = await classesResponse.json();

        const filteredClasses = await fetch(`${API_URL}/schedule/cbw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            classes: classesData,
            weekday: weekdayInt,
          }),
        });

        if (!filteredClasses.ok) {
          console.log("ts pmo 2");
          return ;
        }

        const scheduleData = await filteredClasses.json();
        setSchedule(scheduleData);
        console.log(scheduleData);

      }
      catch (err) {
        console.log("AHHHHHH:", err);
      }
    }

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
                const selectedDay = selectedOption.value as keyof typeof weekdays;
                setCurDay(selectedDay);
                fetchClass(selectedDay);
              }
              }}
              placeholder="Start location"
              maxMenuHeight={200}
            />
          </div>
          </div>
          <div className="flex flex-col items-start">
          {schedule.length === 0 ? (
              <p className="text-stone-600 italic">You have no classes today</p>
            ) : (
              schedule.map((item, index) => (
                <label key={index}>
                  <input type="checkbox" className="mr-1" defaultChecked />
                  {item.class_name}
                </label>
              ))
            )}
          </div>
      </div>
    );
}
