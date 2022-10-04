import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

function CoinMesh() {
    const mesh = useRef(null);
    // useFrame(() => (mesh.current.rotation.y = mesh.current.rotation.z += 0.01));
    return (
      <>
      <ambientLight intensity={0.5} />
      {/* <spotLight position={[10, 15, 10]} angle={0.3} /> */}
      <pointLight position={[10, 15, 10]} angle={0.5} />
      <OrbitControls />
        <mesh ref={mesh} scale={0.7}>
          <cylinderBufferGeometry args={[1, 1, 1.5, 150]} />
          <meshLambertMaterial attach="material" color="#ff9800" />
        </mesh>

        <mesh scale={1} position={[1, 1, 1]}>
            <torusBufferGeometry />
            <meshLambertMaterial attach="material" color="red" />
        </mesh>
      </>
    );
}

export default function Meshes() {
    return (
        <>
            <Canvas>
                <Stars />
                <CoinMesh />
            </Canvas>
        </>
    )
}