import { MeshReflectorMaterial, OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from 'three';
import { Color, PointLightHelper } from "three";

const hexValues = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];

function changeHex() {
    let hex = '#';
  
    for(let i = 0; i < 6; i++){
      const index = Math.floor(Math.random() * hexValues.length)
      hex += hexValues[index];
    }
    return hex;
}

function Square({boxArgs}) {
    const ref = useRef(null);
    const meshRef = useRef(null);
    const [keys, setKeys] = useState({
        w: 0,
        a: 0,
        s: 0,
        d: 0,
    }); // w, a, s, d
    const onKeyDown = (e) => {
        onColor(e);
        setKeys({
            ...keys,
            [e.key]: 1
        })
    }
    const onKeyUp = (e) => {
        setKeys({
            ...keys,
            [e.key]: 0
        })
    }
    const onColor = (e) => {
        if(e.key == 'k') {
            let hex = changeHex();
            
            meshRef.current.color = new Color(hex)
        }
    }
    useEffect(() => {
        console.log(meshRef.current);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        }
    }, [])

    useEffect(() => {
        
    }, [keys])
    useFrame(() => {
        //ref.current.position.x = ref.current.position.x > 0 ? ref.current.position.x - 0.05 : 0
        if(keys.a) {
            ref.current.position.x += 0.1
        }
        if(keys.d) {
            ref.current.position.x -= 0.1
        }
        if(keys.w) {
            ref.current.position.z += 0.1
        }
        if(keys.s) {
            ref.current.position.z -= 0.1
        }
    })
    return (
        <mesh position={[2, 0, 0]} ref={ref}>
            <boxBufferGeometry args={boxArgs} />
            <meshLambertMaterial color={'#434343'} ref={meshRef}/>
        </mesh>
    )
}

function SomeParticles() {
    const ref = useRef(null);
    console.log(ref.current);
    useEffect(() => {
        console.log(ref.current);
    }, [ref])
    useFrame(() => {
        if(ref.current?.scale.x < 2) {
            let inc = 0.02;
            ref.current.scale.x += inc
            ref.current.scale.z += inc
        }
    })
    return (
        <points position={[0, 2, 0]} scale={[1, 0.1, 1]} ref={ref}> 
            <sphereBufferGeometry args={[1, 64, 64]} />
            <pointsMaterial size={0.02} sizeAttenuation={true}/>
        </points>
    )
}


export default function Test1() {

    const ref = useRef(null);

    return (
      <Canvas shadows ref={ref}>
        <fog attach={"fog"} args={["#17171b", 0, 40 ]}/>
        <axesHelper />
        
        <OrbitControls />
        <pointLight castShadow position={[10, 15, 10]} angle={0.5} />
    
        <Square boxArgs={[1, 0.2, 1]}/>
        {/* <SomeParticles /> */}

        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ambientLight intensity={0.25} />
          <planeGeometry args={[50, 50]} />
          {/* <meshBasicMaterial color={"black"} /> */}
          <MeshReflectorMaterial
            blur={[400, 100]}
            resolution={1024}
            mixBlur={1}
            mixStrength={15}
            depthScale={1}
            minDepthThreshold={0.85}
            color="#303030"
            metalness={0.6}
            roughness={1}
          />
        </mesh>
      </Canvas>
    );
}