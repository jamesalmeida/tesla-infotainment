import model3DataUrl from '../../../public/car-models/tesla-model-3-2018.glb?inline';
import modelYDataUrl from '../../../public/car-models/tesla-model-y-2026.glb?inline';
import { CAR_MODELS, type CarModel } from '../../state/sampleData';
import { CAR_MODEL_SPECS } from './carModels';
import { DOOR_IDS, doorNodeName, SPINNING_WHEEL_NODES } from './vehiclePose';

interface GltfNode {
  name?: string;
  children?: number[];
}

interface GltfJson {
  nodes: GltfNode[];
  materials: { name?: string }[];
}

const MODEL_DATA: Record<CarModel, string> = {
  'model-3': model3DataUrl,
  'model-y': modelYDataUrl,
};

// Reads the node tree straight from the shipped model, so a model swap that nests the axles
// differently fails here rather than in the browser.
const readGltf = (model: CarModel): GltfJson => {
  const dataUrl = MODEL_DATA[model];
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  // A GLB starts with a 12-byte header, then the JSON chunk's length and type.
  const jsonLength = new DataView(bytes.buffer).getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
};

const models = CAR_MODELS.map(({ value }) => value);

test.each(models)('%s: every spinning wheel node exists in the model', (model) => {
  const names = readGltf(model).nodes.map((node) => node.name);
  SPINNING_WHEEL_NODES.forEach((name) => expect(names).toContain(name));
});

test.each(models)(
  '%s: no spinning wheel node contains another, so the rear wheels stay on the car',
  (model) => {
    const { nodes } = readGltf(model);
    const descendants = (index: number): number[] =>
      (nodes[index].children ?? []).flatMap((child) => [child, ...descendants(child)]);

    SPINNING_WHEEL_NODES.forEach((name) => {
      const index = nodes.findIndex((node) => node.name === name);
      const inside = descendants(index).map((child) => nodes[child].name);
      SPINNING_WHEEL_NODES.filter((other) => other !== name).forEach((other) =>
        expect(inside).not.toContain(other),
      );
    });
  },
);

test.each(models)('%s: has the doors, lids, lamps and paint the 3D view drives', (model) => {
  const gltf = readGltf(model);
  const names = gltf.nodes.map((node) => node.name);
  const spec = CAR_MODEL_SPECS[model];
  const required = [
    'bonnet_dummy',
    'boot_dummy',
    ...DOOR_IDS.map(doorNodeName),
    spec.chargePortNode,
    ...Object.values(spec.lights).flat(),
  ];
  required.forEach((name) => expect(names).toContain(name));

  const materials = gltf.materials.map((material) => material.name);
  spec.paintMaterials.forEach((name) => expect(materials).toContain(name));
});

test.each(models)('%s: no lamp node is in two light groups', (model) => {
  const all = Object.values(CAR_MODEL_SPECS[model].lights).flat();
  expect(new Set(all).size).toBe(all.length);
});
