import { useState } from 'react';
import { useParams } from 'react-router-dom';
import PathBar from '../components/PathBar';
import PlusButtonMenu from '../components/PlusButtonMenu';
import GeoJSONMap from '../components/GeoJSONMap';
import WalkTimeComp from '../components/WalkTimeComp';

function DashboardPage({globalUser} : {globalUser: string}) {

  const [walkTime, setWalkTime] = useState(0);

  const [path, setPath] = useState({
    "type": "FeatureCollection",
    "features": []
  });

  // extract username from the top url 
  const { user } = useParams();

  return (
    <div className="flex flex-col w-screen h-screen pt-[60px]">
      <div className='flex flex-col justify-center items-center h-[calc(100vh-60px)]'>

        <div className="fixed flex top-[70px] box-border w-screen h-[80px] justify-center z-1">
          <PathBar username={user ?? 'Plaeholder'} setPath={setPath} setWalkTime={setWalkTime}/>
        </div>
          
        <GeoJSONMap path={path}/>

        <div className='fixed bottom-[5%] left-[5%] z-50'>
          <PlusButtonMenu globalUser={globalUser} />
        </div>
        <div className='fixed bottom-[5%] right-[5%] z-50'>
          <WalkTimeComp walkTime={walkTime} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;