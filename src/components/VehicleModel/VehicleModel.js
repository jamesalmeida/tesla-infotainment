import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stage, useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from 'three';
import { useSpring, a } from '@react-spring/three';
import { getCarModelPath } from '../../utils/assetPaths';
import './VehicleModel.css';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function Model({ rotateToFrunk, rotateToTrunk, activeGear, ...props }) {
  const modelPath = getCarModelPath('tesla-model-3-2018.glb');
  const { scene } = useGLTF(modelPath);
  const modelRef = useRef();
  const frunkRef = useRef();
  const trunkRef = useRef();
  const doorRefs = useRef({});
  const [targetRotation, setTargetRotation] = useState(Math.PI);
  const [startRotation, setStartRotation] = useState(Math.PI);
  const [frunkTargetAngle, setFrunkTargetAngle] = useState(0);
  const [frunkStartAngle, setFrunkStartAngle] = useState(0);
  const [trunkTargetAngle, setTrunkTargetAngle] = useState(0);
  const [trunkStartAngle, setTrunkStartAngle] = useState(0);
  const [doorStates, setDoorStates] = useState({});
  const animationProgressRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const defaultRotation = Math.PI;
  const [isDriving, setIsDriving] = useState(false);

  useEffect(() => {
    const frunkPart = scene.getObjectByName("bonnet_dummy");
    const trunkPart = scene.getObjectByName("boot_dummy");
    if (frunkPart) frunkRef.current = frunkPart;
    if (trunkPart) trunkRef.current = trunkPart;

    // Find and set up door parts
    const doorNames = ["door_lf_dummy", "door_lr_dummy", "door_rf_dummy", "door_rr_dummy"];
    doorNames.forEach(doorName => {
      const doorPart = scene.getObjectByName(doorName);
      if (doorPart) {
        doorRefs.current[doorName] = doorPart;
        setDoorStates(prev => ({ ...prev, [doorName]: { isOpen: false, angle: 0 } }));
      }
    });

    // Set up click handlers for doors
    scene.traverse((object) => {
      if (object.isMesh && doorNames.includes(object.name)) {
        object.userData.clickable = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    setStartRotation(modelRef.current.rotation.y);
    setFrunkStartAngle(frunkRef.current ? frunkRef.current.rotation.x : 0);
    setTrunkStartAngle(trunkRef.current ? trunkRef.current.rotation.x : 0);

    if (activeGear === 'D') {
      setTargetRotation(Math.PI / 4.3); // 90 degrees clockwise
      setIsDriving(true);
    } else if (rotateToFrunk) {
      setFrunkTargetAngle(Math.PI / 6); // Open the frunk to 30 degrees
      setTrunkTargetAngle(0); // Close the trunk
      // No rotation for frunk
      setTargetRotation(modelRef.current.rotation.y);
    } else if (rotateToTrunk) {
      setTargetRotation(defaultRotation - Math.PI / 2); // 90 degrees counterclockwise for trunk
      setFrunkTargetAngle(0); // Close the frunk
      setTrunkTargetAngle(-Math.PI / 3.5); // Open the trunk to 45 degrees (negative because it likely opens downwards)
    } else {
      setTargetRotation(defaultRotation); // Reset to default position
      setFrunkTargetAngle(0); // Close the frunk
      setTrunkTargetAngle(0); // Close the trunk
      setIsDriving(false);
    }
    animationProgressRef.current = 0;
    isAnimatingRef.current = true;
  }, [rotateToFrunk, rotateToTrunk, activeGear]);

  useFrame((state, delta) => {
    if (isAnimatingRef.current) {
      animationProgressRef.current += delta * 0.5; // Adjust this value to control animation speed
      if (animationProgressRef.current >= 1) {
        animationProgressRef.current = 1;
        isAnimatingRef.current = false;
      }

      const easedProgress = easeInOutCubic(animationProgressRef.current);
      
      // Only rotate for trunk or reset
      if (rotateToTrunk || (!rotateToFrunk && !rotateToTrunk)) {
        const newRotation = THREE.MathUtils.lerp(startRotation, targetRotation, easedProgress);
        modelRef.current.rotation.y = newRotation;
      }

      // Animate the frunk
      if (frunkRef.current) {
        const newFrunkAngle = THREE.MathUtils.lerp(frunkStartAngle, frunkTargetAngle, easedProgress);
        frunkRef.current.rotation.x = newFrunkAngle;
      }

      // Animate the trunk
      if (trunkRef.current) {
        const newTrunkAngle = THREE.MathUtils.lerp(trunkStartAngle, trunkTargetAngle, easedProgress);
        trunkRef.current.rotation.x = newTrunkAngle;
      }

      // Animate doors
      Object.entries(doorStates).forEach(([doorName, doorState]) => {
        if (doorRefs.current[doorName]) {
          const targetAngle = doorState.isOpen ? Math.PI / 2 : 0;
          const newAngle = THREE.MathUtils.lerp(doorState.angle, targetAngle, easedProgress);
          doorRefs.current[doorName].rotation.y = newAngle;
          setDoorStates(prev => ({
            ...prev,
            [doorName]: { ...prev[doorName], angle: newAngle }
          }));
        }
      });
    }
  });

  const handleClick = (event) => {
    event.stopPropagation();
    const clickedMesh = event.object;
    if (clickedMesh.userData.clickable) {
      const doorName = clickedMesh.name;
      setDoorStates(prev => ({
        ...prev,
        [doorName]: { ...prev[doorName], isOpen: !prev[doorName].isOpen }
      }));
      animationProgressRef.current = 0;
      isAnimatingRef.current = true;
    }
  };

  return (
    <group onClick={handleClick}>
      <primitive ref={modelRef} object={scene} {...props} />
    </group>
  );
}

function ControlledOrbitControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const [isInteracting, setIsInteracting] = useState(false);
  
  // Adjust the default rotation to be 200 degrees clockwise
  const defaultRotation = Math.PI + ((200 * Math.PI) / 170);

  const [springProps, setSpring] = useSpring(() => ({
    rotation: defaultRotation,
    config: { mass: 1, tension: 280, friction: 120 },
  }));

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, -0.5, 0);
      controlsRef.current.update();

      const controls = controlsRef.current;
      
      const onStart = () => setIsInteracting(true);
      const onEnd = () => {
        setIsInteracting(false);
        setSpring({ rotation: defaultRotation });
      };

      controls.addEventListener('start', onStart);
      controls.addEventListener('end', onEnd);

      // Set initial rotation
      controls.setAzimuthalAngle(defaultRotation);
      controls.update();

      return () => {
        controls.removeEventListener('start', onStart);
        controls.removeEventListener('end', onEnd);
      };
    }
  }, [defaultRotation, setSpring]);

  useEffect(() => {
    if (controlsRef.current && !isInteracting) {
      controlsRef.current.setAzimuthalAngle(springProps.rotation.get());
      controlsRef.current.update();
    }
  }, [isInteracting, springProps.rotation]);

  return (
    <a.group rotation-y={springProps.rotation}>
      <OrbitControls
        ref={controlsRef}
        args={[camera, gl.domElement]}
        enableZoom={false}
        enablePan={false}
        enableRotate={true}
        minPolarAngle={Math.PI / 2 - Math.PI / 5.14}
        maxPolarAngle={Math.PI / 2 - Math.PI / 5.14}
      />
    </a.group>
  );
}

export function VehicleModel({ rotateToFrunk, rotateToTrunk, activeGear }) {
  const distance = 5;
  const horizontalAngle = Math.PI / 4; // 45 degrees
  const verticalAngle = activeGear === 'D' ? Math.PI / 3 : Math.PI / 5.14; // Increased angle for 'D' mode

  const cameraPosition = [
    distance * Math.cos(horizontalAngle) * Math.cos(verticalAngle),
    distance * Math.sin(verticalAngle),
    distance * Math.sin(horizontalAngle) * Math.cos(verticalAngle)
  ];

  return (
    <Canvas 
      dpr={[1,2]}  
      camera={{ 
        fov: 40,
        position: cameraPosition,
        near: 0.1,
        far: 1000
      }} 
      style={{"position": "relative"}}
      className="carModelWrapper"
    >
      <color attach="background" args={["#f1f1f1"]} />
      <Stage environment={"warehouse"}>
        <Model scale={0.01} rotateToFrunk={rotateToFrunk} rotateToTrunk={rotateToTrunk} activeGear={activeGear} />
      </Stage>
      <ControlledOrbitControls />
    </Canvas>
  )
}