import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Stage, useEnvironment, useGLTF, OrbitControls } from '@react-three/drei';
import type * as THREE from 'three';
import { getCarModelPath } from '../../utils/assetPaths';
import {
  AZIMUTH_SMOOTH_TIME,
  CLOSED_DOORS,
  DEFAULT_AZIMUTH,
  DOOR_IDS,
  createParts,
  doorNodeName,
  findDoorId,
  getPartTargets,
  isClick,
  nearestAngle,
  stepDamped,
  stepParts,
  type CarParts,
  type Damped,
  type DoorId,
  type DoorStates,
  type VehiclePose,
} from './vehiclePose';
import styles from './VehicleModel.module.css';

export type { DoorId, DoorStates, VehiclePose };

interface VehicleModelProps {
  pose: VehiclePose;
  // Controls the doors. Leave it out and the model keeps its own door state.
  doors?: DoorStates;
  onDoorToggle?: (door: DoorId) => void;
}

interface ModelProps extends VehicleModelProps {
  scale?: number;
}

interface CarNodes {
  car: THREE.Object3D;
  frunk: THREE.Object3D | undefined;
  trunk: THREE.Object3D | undefined;
  doors: Partial<Record<DoorId, THREE.Object3D>>;
}

type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

// Stage's Bounds refits the camera distance, but keeps this direction.
const CAMERA_ELEVATION = Math.PI / 5.14;
const CAMERA_POSITION: [number, number, number] = [
  5 * Math.cos(CAMERA_ELEVATION) * Math.sin(DEFAULT_AZIMUTH),
  5 * Math.sin(CAMERA_ELEVATION),
  5 * Math.cos(CAMERA_ELEVATION) * Math.cos(DEFAULT_AZIMUTH),
];

const ORBIT_TARGET: [number, number, number] = [0, -0.5, 0];
const ORBIT_POLAR_ANGLE = Math.PI / 2 - CAMERA_ELEVATION;

const modelPath = getCarModelPath('tesla-model-3-2018.glb');

// Poly Haven's Empty Warehouse 01 (CC0), halved from the 1k file. It only lights the car,
// so the extra resolution bought nothing. Stage's presets download from a third-party CDN.
const stageEnvironment = {
  files: `${import.meta.env.BASE_URL}environments/empty_warehouse_01_512.hdr`,
};

// Start downloading these while the loading screen is up, not when the canvas mounts.
useGLTF.preload(modelPath);
useEnvironment.preload(stageEnvironment);

function applyParts(nodes: CarNodes, parts: CarParts) {
  nodes.car.rotation.y = parts.rotation.value;
  if (nodes.frunk) nodes.frunk.rotation.x = parts.frunk.value;
  if (nodes.trunk) nodes.trunk.rotation.x = parts.trunk.value;
  for (const id of DOOR_IDS) {
    const door = nodes.doors[id];
    if (door) door.rotation.z = parts[id].value;
  }
}

function Model({ pose, doors, onDoorToggle, ...props }: ModelProps) {
  const { scene } = useGLTF(modelPath);
  const [localDoors, setLocalDoors] = useState(CLOSED_DOORS);
  const doorStates = doors ?? localDoors;
  const partsRef = useRef<CarParts | null>(null);
  const nodes = useMemo<CarNodes>(
    () => ({
      car: scene,
      frunk: scene.getObjectByName('bonnet_dummy'),
      trunk: scene.getObjectByName('boot_dummy'),
      doors: Object.fromEntries(
        DOOR_IDS.map((id) => [id, scene.getObjectByName(doorNodeName(id))]),
      ),
    }),
    [scene],
  );

  useFrame((_, delta) => {
    const targets = getPartTargets(pose, doorStates);
    // The first frame places the car in its pose. Later changes animate.
    partsRef.current ??= createParts(targets);
    stepParts(partsRef.current, targets, delta);
    applyParts(nodes, partsRef.current);
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!isClick(event.delta)) return;
    const door = findDoorId(event.object);
    if (!door) return;
    if (!doors) setLocalDoors((current) => ({ ...current, [door]: !current[door] }));
    onDoorToggle?.(door);
  };

  return (
    <group onClick={handleClick}>
      <primitive object={scene} {...props} />
    </group>
  );
}

function ControlledOrbitControls() {
  const controlsRef = useRef<OrbitControlsHandle>(null);
  const azimuthRef = useRef<Damped | null>(null);

  const handleStart = () => {
    azimuthRef.current = null;
  };

  const handleEnd = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    azimuthRef.current = {
      value: nearestAngle(controls.getAzimuthalAngle(), DEFAULT_AZIMUTH),
      velocity: 0,
    };
  };

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const azimuth = azimuthRef.current;
    if (!controls || !azimuth) return;
    const isMoving = stepDamped(azimuth, DEFAULT_AZIMUTH, AZIMUTH_SMOOTH_TIME, delta);
    controls.setAzimuthalAngle(azimuth.value);
    if (!isMoving) azimuthRef.current = null;
  });

  // With damping on, setAzimuthalAngle moves 5% of the way and carries the rest into later
  // updates, which would fight the ease back to the default angle.
  return (
    <OrbitControls
      ref={controlsRef}
      target={ORBIT_TARGET}
      enableDamping={false}
      enableZoom={false}
      enablePan={false}
      enableRotate={true}
      minPolarAngle={ORBIT_POLAR_ANGLE}
      maxPolarAngle={ORBIT_POLAR_ANGLE}
      onStart={handleStart}
      onEnd={handleEnd}
    />
  );
}

export function VehicleModel({ pose, doors, onDoorToggle }: VehicleModelProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{
        fov: 40,
        position: CAMERA_POSITION,
        near: 0.1,
        far: 1000,
      }}
      style={{ position: 'relative' }}
      className={styles.carModelWrapper}
    >
      <color attach="background" args={['#f1f1f1']} />
      <Stage environment={stageEnvironment}>
        <Model scale={0.01} pose={pose} doors={doors} onDoorToggle={onDoorToggle} />
      </Stage>
      <ControlledOrbitControls />
    </Canvas>
  );
}
