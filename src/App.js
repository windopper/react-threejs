import React from 'react';
import Meshes from './Meshes';
import { Canvas, useFrame } from '@react-three/fiber';
import './App.css'
import NightTrain from './NightTrain';

function App() {
  return (
    <div className='App'>
      <NightTrain />
    </div>
  );
}

export default App;
