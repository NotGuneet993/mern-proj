import { useState } from "react";
import Select from 'react-select';
const API_URL = import.meta.env.VITE_API_URL;

type MapClassesProps = {
  user: string;
  setPath: (validNodes: any) => void;
  setDistance: (distance: number) => void;

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

export default function MapClasses({ user, setPath, setDistance } : MapClassesProps) {

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const [curDay, setCurDay] = useState('');
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [classError, setClassError] = useState('');

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

      }
      catch (err) {
        console.log("AHHHHHH:", err);
      }
    }

    const handleClick = async () => {
      const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-building]');
      const selectedBuildings: string[] = [];

      checkboxes.forEach(box => {
        if (box.checked) {
          const building = box.getAttribute('data-building');
          if (building) selectedBuildings.push(building);
        }
      });

      const masterArr = []
      let distance = 0;
      if (selectedBuildings.length === 1) {

        setClassError("Please select atleast two classes");

      } else {

        setClassError('');
        for (let i = 0; i < selectedBuildings.length - 1; i++) {
          try {
            const response = await fetch(`${API_URL}/locations/getPath?location1=${encodeURIComponent(selectedBuildings[i])}&location2=${encodeURIComponent(selectedBuildings[i+1])}`);
            if (!response.ok) throw new Error("Couldn't fetch path")
            
            const data = await response.json();

            if (i === 0) masterArr.push(data.path[0])
            for (let item of data.path) {
                if (item.geometry.type === 'LineString') {
                  masterArr.push(item);
                  distance += item.properties.distance;
                }
            }

            masterArr.push(data.path[data.path.length - 1]);

          } catch (error) {
              console.log(error);
          }
        }

        setDistance(Math.round((60/3) * distance));
        setPath({
          "type": "FeatureCollection",
          "features": masterArr
        });

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
              placeholder="Select day"
              maxMenuHeight={150}
            />
          </div>
          </div>
          <div className="flex flex-col items-start">
          {schedule.length === 0 ? (
              <p className="text-stone-600 italic">You have no classes today</p>
            ) : (
              schedule.map((item, index) => (
                <label key={index}>
                  <input type="checkbox" className="mr-1" data-building={item.building} defaultChecked />
                  {item.class_name}
                </label>
              ))
              
            )}
            {schedule.length === 0 ? (
              <div />
            ) : (
              <div className="flex flex-col justify-center items-center w-full">
                <button className="mt-4 px-3 py-1 bg-linear-70 from-yellow-300 to-amber-500 text-md text-stone-900 rounded-4xl
            hover:bg-linear-70 hover:from-yellow-400 hover:to-amber-600 hover:cursor-pointer" onClick={handleClick}>
                  Path classes
                </button>
                {classError && (<p className="text-red-500 mt-">{classError}</p>)}
              </div> 
          )}

          </div>
      </div>
    );
}
