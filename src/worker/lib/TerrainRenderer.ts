import * as three from 'three';
import { threePlaneSize, waitAnimationFrame } from '../../utils';
import CameraController from './CameraController';
import type { WorkerEventArgs } from '../mapRenderer';

export type TerrainViewStatus = 'busy' | 'ready' | null;

export interface TerrainUpdateStatus {
  status: TerrainViewStatus;
}

export interface TerrainUpdateListener {
  (status: TerrainUpdateStatus): void;
}

export class TerrainRenderer {
  private scene: three.Scene;
  private geometry: three.PlaneGeometry;
  private terrainMesh: three.Mesh<three.PlaneGeometry, three.MeshLambertMaterial[]>;

  private renderer: three.WebGLRenderer | null = null;
  private texture: three.CanvasTexture | null = null;
  private textureCanvas: OffscreenCanvas | null = null;
  private abortController: AbortController | null = null;
  private needsUpdate = false;
  private listeners: TerrainUpdateListener[] = [];

  readonly camera: three.PerspectiveCamera;
  readonly cameraController: CameraController;

  constructor(private planeSize = 2048) {
    this.scene = new three.Scene();
    const light = new three.DirectionalLight(0xffffff, 1.2);
    light.position.set(1, 1, 1).normalize();
    this.scene.add(light);
    this.scene.add(new three.AmbientLight(0xffffff, 0.02));
    this.scene.matrixAutoUpdate = false;

    this.geometry = new three.PlaneGeometry(this.planeSize, this.planeSize, this.planeSize - 1, this.planeSize - 1);
    this.geometry.addGroup(0, Infinity, 0);
    this.geometry.addGroup(0, Infinity, 1);

    this.terrainMesh = new three.Mesh(this.geometry, [
      new three.MeshLambertMaterial({ map: null, transparent: true }),
      // Require a fallback mesh because the canvas of 7dtd-map can contain transparent pixels
      new three.MeshLambertMaterial({ color: new three.Color('lightgray') }),
    ]);
    this.scene.add(this.terrainMesh);

    this.camera = new three.PerspectiveCamera();
    this.cameraController = new CameraController(this);
  }

  handleEvent(event: WorkerEventArgs) {
    switch (event.eventName) {
      case 'init': {
        const { terrainCanvas, textureCanvas } = event;
        this.renderer = new three.WebGLRenderer({ canvas: terrainCanvas as three.OffscreenCanvas, antialias: false });
        this.renderer.setPixelRatio(event.devicePixelRatio);
        this.textureCanvas = textureCanvas;
        break;
      }
      case 'resize': {
        const { width, height } = event;
        this.renderer?.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        break;
      }
      case 'updateTexture': {
        if (this.texture) this.texture.needsUpdate = true;
        break;
      }
      case 'updateTerrain': {
        this.onUpdateTerrain(event.mapElevations);
        break;
      }
      case 'renderTerrain': {
        if (this.renderer && this.texture) {
          if (event.start) {
            this.needsUpdate = true;
            this.render();
          } else {
            this.needsUpdate = false;
          }
        }
      }
    }
  }

  addUpdateListener(listener: TerrainUpdateListener): void {
    this.listeners.push(listener);
  }

  getPlaneSize() {
    return threePlaneSize(this.geometry.parameters.width, this.geometry.parameters.height);
  }

  render(currentTime = 0, prevTime = 0) {
    if (this.renderer && this.needsUpdate) {
      this.renderer.render(this.scene, this.camera);
      this.cameraController.update(currentTime - prevTime);
      requestAnimationFrame((t) => this.render(t, currentTime));
    }
  }

  async onUpdateTerrain(mapElevations: Uint8Array | null) {
    if (!this.textureCanvas || !mapElevations || mapElevations.length === 0) {
      this.listeners.forEach((listener) => listener({ status: null }));
      return;
    }

    this.listeners.forEach((listener) => listener({ status: 'busy' }));

    await waitAnimationFrame();
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    await waitAnimationFrame();
    console.time(this.onUpdateTerrain.name);

    const mapSize = Math.sqrt(mapElevations.length);
    const position = this.geometry.attributes.position;
    const scaleFactor = mapSize / (this.planeSize + 1);
    for (let i = 0; i < position.count; i++) {
      // game axis -> webgl axis
      // x -> x
      // y -> z
      // z -> y
      const ingameX = Math.round((position.getX(i) + this.planeSize / 2) * scaleFactor);
      const ingameZ = Math.round((position.getY(i) + this.planeSize / 2) * scaleFactor);
      const elev = mapElevations[ingameX + ingameZ * mapSize] / scaleFactor;
      position.setZ(i, elev);
      if (i % 10000 === 0) {
        await waitAnimationFrame();
      }
      if (signal.aborted) {
        console.warn('updateElevations has been aborted: byteLength=%d', mapElevations.length);
        return;
      }
    }
    position.needsUpdate = true;

    await waitAnimationFrame();
    this.geometry.computeVertexNormals();

    // 最初にレンダリングした状態からキャンバスサイズを拡縮するとTextureのneedsUpdateをtrueにするだけでは
    // テクスチャが更新されないためインスタンスを再作成する
    this.texture?.dispose();
    this.texture = new three.CanvasTexture(this.textureCanvas);
    this.texture.colorSpace = three.SRGBColorSpace;
    this.terrainMesh.material[0].map = this.texture;

    console.timeEnd(this.onUpdateTerrain.name);

    this.listeners.forEach((listener) => listener({ status: 'ready' }));
  }
}
