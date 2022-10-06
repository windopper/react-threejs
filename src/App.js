import React from 'react';
import Meshes from './Meshes';
import { Canvas, useFrame } from '@react-three/fiber';
import './App.css'
import NightTrain from './NightTrain';
import Test1 from './containers/Test1';

function App() {
  return (
    <div className='App'>
      <Test1 />
    </div>
  );
}

export default App;
