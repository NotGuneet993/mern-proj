import { useState } from 'react';
import { useParams } from 'react-router-dom';
import PathBar from '../components/PathBar';
import PlusButtonMenu from '../components/PlusButtonMenu';
import GeoJSONMap from '../components/GeoJSONMap';
import DistanceComp from '../components/DistanceComp';
import ClassNavigator from '../components/ClassNavigator';


function DashboardPage({globalUser} : {globalUser: string}) {
  const [showNavigator, setShowNavigator] = useState(false);
  const [path, setPath] = useState({
    "type": "FeatureCollection",
    "features": []
  });

  const [distance, setDistance] = useState(0);

  const toggleNavigator = () => {
    setShowNavigator(prev => !prev);
  };

  // extract username from the top url 
  const { user } = useParams();

  return (
    <div className="flex flex-col w-screen h-screen pt-[60px]">
      <div className='flex flex-col justify-center items-center h-[calc(100vh-60px)]'>

        <div className="fixed flex top-[70px] box-border w-screen h-[80px] justify-center z-1">
          <PathBar username={user ?? 'Placeholder'} setPath={setPath} setDistance={setDistance}/>
        </div>
          
        <GeoJSONMap path={path} />

        {showNavigator && (
          <div className='fixed top-[50%] right-[30%]'>
            <ClassNavigator globalUser={globalUser} setPath={setPath} setDistance={setDistance} />
          </div>
          )}

        <div className='fixed bottom-[5%] left-[5%] z-50'>
          <PlusButtonMenu globalUser={globalUser} onNavigateClick={toggleNavigator} />
        </div>
        <div className='fixed bottom-[5%] right-[5%] z-50'>
          <DistanceComp distance={distance} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;