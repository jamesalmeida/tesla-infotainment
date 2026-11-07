import type { ComponentType } from 'react';
import { LightShow } from './LightShow';
import { PaintShop } from './PaintShop';
import { Sketchpad } from './Sketchpad';
import { Soundboard } from './Soundboard';

export interface ToyboxModule {
  id: string;
  label: string;
  component: ComponentType;
  // Modules that fill the screen manage their own height instead of scrolling.
  fills: boolean;
}

// One entry per toy. Adding a module means adding a component and a line here.
export const TOYBOX_MODULES: ToyboxModule[] = [
  { id: 'sketchpad', label: 'Sketchpad', component: Sketchpad, fills: true },
  { id: 'light-show', label: 'Light Show', component: LightShow, fills: true },
  { id: 'soundboard', label: 'Soundboard', component: Soundboard, fills: false },
  { id: 'paint-shop', label: 'Paint Shop', component: PaintShop, fills: false },
];
