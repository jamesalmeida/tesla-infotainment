import modelDataUrl from '../../../public/car-models/tesla-model-3-2018.glb?inline';
import { SPINNING_WHEEL_NODES } from './vehiclePose';

interface GltfNode {
  name?: string;
  children?: number[];
}

// Reads the node tree straight from the shipped model, so a model swap that nests the axles
// differently fails here rather than in the browser.
const readNodes = (): GltfNode[] => {
  const binary = atob(modelDataUrl.slice(modelDataUrl.indexOf(',') + 1));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  // A GLB starts with a 12-byte header, then the JSON chunk's length and type.
  const jsonLength = new DataView(bytes.buffer).getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))).nodes;
};

test('every spinning wheel node exists in the model', () => {
  const names = readNodes().map((node) => node.name);
  SPINNING_WHEEL_NODES.forEach((name) => expect(names).toContain(name));
});

test('no spinning wheel node contains another, so the rear wheels stay on the car', () => {
  const nodes = readNodes();
  const descendants = (index: number): number[] =>
    (nodes[index].children ?? []).flatMap((child) => [child, ...descendants(child)]);

  SPINNING_WHEEL_NODES.forEach((name) => {
    const index = nodes.findIndex((node) => node.name === name);
    const inside = descendants(index).map((child) => nodes[child].name);
    SPINNING_WHEEL_NODES.filter((other) => other !== name).forEach((other) =>
      expect(inside).not.toContain(other),
    );
  });
});
