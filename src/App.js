import React from 'react';
import Meshes from './Meshes';
import { Canvas, useFrame } from '@react-three/fiber';
import './App.css'
import NightTrain from './NightTrain';
import Test1 from './containers/Test1';
import Stack from './containers/Stack';

function App() {
  return (
    <div className='App'>
      <Stack />
    </div>
  );
}

export default App;
