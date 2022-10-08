import { OrbitControls, useCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";

const hexValues = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

function randHex() {
  let hex = "#";

  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * hexValues.length);
    hex += hexValues[index];
  }
  return hex;
}

/*
  이전 스택과 현재 스택이 만나면
  현재 스택이 두 블럭으로 분리되는데
  이때 분리되는 블럭의 좌표와 크기를 계산하는 함수
*/
const getDetachedCoords = ({prevCoords, curCoords, curXLength, curZLength, prevXLength, prevZLength, dir}) => {
  console.log(curCoords.z, prevCoords.z)
  const diff = dir === 0 ? Math.abs(curCoords.z - prevCoords.z) : Math.abs(curCoords.x - prevCoords.x)
  console.log(diff)
  return {
    remainShape: [dir === 1 ? diff : 1, 0.2, dir === 0 ? diff : 1],
    remainLoc: [
      dir === 1
        ? curCoords.x -
          curXLength / 2 +
          (prevXLength / 2 - (curCoords.x - curXLength / 2)) / 2
        : curCoords.x,
      0,
      dir === 1
      ? curCoords.z -
        curZLength / 2 +
        (prevZLength / 2 - (curCoords.z - curZLength / 2)) / 2
      : curCoords.z,
    ],
    fallingShape: [
      dir === 1 ? curXLength - diff : curXLength,
      0.2,
      dir === 0 ? curZLength - diff : curZLength,
    ],
    fallingLoc: [],
  };
}

const StackItem = React.forwardRef(({ height: h, direction, detach, location }, ref) => {

  const color = useRef(randHex());

    useEffect(() => {
      if(!ref.current) return;
      // console.log(ref.current);
      if (direction === 1) {
        ref.current.position.x = 3;
        ref.current.position.z = 0;
      } else {
        ref.current.position.z = 3;
        ref.current.position.x = 0;
      }
      ref.current.visible = true;
    }, []);
  
  return (
    <mesh position={location} ref={ref} visible={false}>
      <boxGeometry args={[1, 0.2, 1]} />
      <meshLambertMaterial color={color.current} />
    </mesh>
  );
});


const MemoizedStackItem = React.memo(StackItem);

function Stacks() {

  const speed = 0.04;

  const camera = useThree((state) => state.camera);

  const isStarting = useRef(false);
  const isCameraMoving = useRef(false);

  const latestStackRef = useRef(null);
  const previousStackRef = useRef(null);

  const direction = useRef(0); // 스택이 날아오는 방향 0, 1 두가지임
  const stackHeight = useRef(0.2); // 스택이 쌓이는 높이
  const nextLocation = useRef([0, 0, 0]) // 다음 스택 위치
  const [stacks, setStacks] = useState([]); // 스택 위치 어레이

  console.log(latestStackRef.current);

  useFrame(() => {
    if (isCameraMoving.current) {
      // 카메라가 움직일 때 프레임 마다 카메라 높이 증가
      if (camera.position.y < stackHeight.current + 2) {
        camera.position.y += 0.02;
      } else {
        camera.position.y = stackHeight.current + 2;
        isCameraMoving.current = false;
      }
      camera.updateProjectionMatrix();
    }
  });

  useFrame(() => { // 마지막 스택 아이템 프레임 마다 움직임
    if(!latestStackRef.current) return;
    latestStackRef.current.position.x =
      latestStackRef.current.position.x > 0 ? (latestStackRef.current.position.x -= speed) : 0;
    latestStackRef.current.position.z =
      latestStackRef.current.position.z > 0 ? (latestStackRef.current.position.z -= speed) : 0;
  });

  const setStarting = (start) => {
    isStarting.current = start;
  }

  const createNextStackItem = () => { // 다음 스택 블럭 소환
    if(previousStackRef.current && latestStackRef.current) { // 이전 스택 블럭과 다음 스택 블럭을 통해 남은 스택 블럭 계산 
      console.log(
        getDetachedCoords({
          prevCoords: previousStackRef.current.position,
          curCoords: latestStackRef.current.position,
          curXLength: latestStackRef.current.geometry.parameters.width,
          curZLength: latestStackRef.current.geometry.parameters.depth,
          prevXLength: previousStackRef.current.geometry.parameters.width,
          prevZLength: previousStackRef.current.geometry.parameters.depth,
          dir: direction.current,
        })
      );
    }
    previousStackRef.current = latestStackRef.current ? latestStackRef.current : null; // 현재 ref를 이전 ref로 넘김
    nextLocation.current = [0, stackHeight.current, 0] // 다음 스택 위치 업데이트 
    setStacks(v => [...v, nextLocation.current]); // 스택 높이 어레이 업데이트
    onMoveCamera(); // 카메라 이동
    stackHeight.current += 0.2; // 다음 스택 높이 업데이트
    direction.current = direction.current === 0 ? 1 : 0; // 다음 스택 방향 업데이트
  };

  const onKeyDown = ({ key }) => {
    if(key === " ") {
      setStarting(!isStarting.current);
      if(isStarting.current) createNextStackItem();
    } else if (key === "k") {
      // 'k' 누를 시 새로운 스택 생성 : 테스트용
      if(isStarting.current) createNextStackItem();
    }
  };

  const onMoveCamera = () => { // 카메라 움직임 활성화 마지막 스택 블럭 위치까지 따라감
    if (!camera) return;
    isCameraMoving.current = true;
  };

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

  useEffect(() => { // 처음 캔버스 렌더될 때 초기화 이펙트
    camera.lookAt(new Vector3(0, stackHeight.current, 0)); // 카메라 위치 초기화
  }, []);

  return (
    <>
      <mesh position={[0, 0, 0]} ref={latestStackRef}>
        <boxGeometry args={[1, 0.2, 1]} />
        <meshLambertMaterial color={"#343434"} />
      </mesh>
      {stacks.map((loc, i) => (
        <MemoizedStackItem
          location={loc}
          key={i}
          direction={direction.current}
          stopped={stacks.length - 1 === i ? false : true}
          ref={stacks.length - 1 === i ? latestStackRef : null}
        />
      ))}
    </>
  );
}

function Stack() {
  return (
    <Canvas
      camera={{
        position: [-3, 2.2, -3],
        fov: 75,
        // lookAt: [0, 0.2, 0]
      }}
    >
      <fog attach="fog" args={["#17171b", 3, 10]} />
      {/* <OrbitControls /> */}
      <axesHelper />
      <directionalLight position={[-3, 255, -3]}>
        <orthographicCamera
          attach="shadow-camera"
          left={-20}
          right={20}
          top={20}
          bottom={-20}
        />
      </directionalLight>
      <ambientLight intensity={0.4} />
      <Stacks />
    </Canvas>
  );
}

export default Stack;
