import * as three from 'three';
import { gameMapSize, requireNonnull, threePlaneSize } from '../../utils';
import { TerrainRenderer } from './TerrainRenderer';
import type { WorkerEventArgs } from '../mapRenderer';

const MOUSE_BUTTON_BITMASK = {
  left: 0b00000001,
  center: 0b00000100,
};

const XY_PLANE = new three.Plane(new three.Vector3(0, 0, 1), 0);
const TILT_AXIS = new three.Vector3(1, 0, 0);
const TILT_RADIAN_BASE = new three.Vector3(0, -1, 0);
const TILT_MAX_RAD = Math.PI / 2; // 90°
const TILT_MIN_RAD = Math.PI / 6; // 30°
const MAX_ELEV = 255;
const MOVE_SPEED = 3;
const TILT_SPEED = 2;

export default class CameraController {
  private terrainSize = threePlaneSize(1, 1);
  private mapSize = gameMapSize({ width: 1, height: 1 });
  private minZ = 1;
  private maxZ = 1;

  private speeds = { x: 0, y: 0, tilt: 0 };
  private mouseMove = {
    left: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
    wheel: 0,
  };

  private get camera() {
    return this.renderer.camera;
  }

  constructor(private renderer: TerrainRenderer) {}

  handleEvent(event: WorkerEventArgs) {
    switch (event.eventName) {
      case 'updateTerrain': {
        this.onUpdateTerrain(event.mapElevations);
        break;
      }
      case 'keydown': {
        switch (event.code) {
          case 'KeyA':
            this.speeds.x = -1 * MOVE_SPEED;
            break;
          case 'KeyD':
            this.speeds.x = 1 * MOVE_SPEED;
            break;
          case 'KeyS':
            this.speeds.y = -1 * MOVE_SPEED;
            break;
          case 'KeyW':
            this.speeds.y = 1 * MOVE_SPEED;
            break;
          case 'KeyR':
            this.speeds.tilt = 1 * TILT_SPEED;
            break;
          case 'KeyF':
            this.speeds.tilt = -1 * TILT_SPEED;
            break;
        }
        break;
      }
      case 'keyup': {
        switch (event.code) {
          case 'KeyA':
          case 'KeyD':
            this.speeds.x = 0;
            break;
          case 'KeyS':
          case 'KeyW':
            this.speeds.y = 0;
            break;
          case 'KeyR':
          case 'KeyF':
            this.speeds.tilt = 0;
            break;
        }
        break;
      }
      case 'mousemove': {
        if ((event.buttons & MOUSE_BUTTON_BITMASK.left) > 0) {
          this.mouseMove.left.x += event.movementX;
          this.mouseMove.left.y += event.movementY;
        }
        if ((event.buttons & MOUSE_BUTTON_BITMASK.center) > 0) {
          this.mouseMove.center.x += event.movementX;
          this.mouseMove.center.y += event.movementY;
        }
        break;
      }
      case 'wheel': {
        this.mouseMove.wheel += event.deltaY;
        break;
      }
    }
  }

  onUpdateTerrain(mapElevations: Uint8Array | null): void {
    if (!mapElevations || mapElevations.length === 0) return;

    const size = Math.sqrt(mapElevations.length);
    this.mapSize = gameMapSize({ width: size, height: size });
    this.terrainSize = this.renderer.getPlaneSize();

    this.minZ = (MAX_ELEV * this.terrainSize.width) / this.mapSize.width;
    this.maxZ = this.terrainSize.height * 1.2;

    this.camera.far = this.terrainSize.height * 2;
    this.camera.position.x = 0;
    this.camera.position.y = -this.terrainSize.height;
    this.camera.position.z = this.terrainSize.height * 0.6;
    this.camera.lookAt(0, 0, 0);
  }

  update(deltaMsec: number): void {
    this.moveCameraXY(deltaMsec);
    this.tiltCamera(deltaMsec);
    this.moveCameraForward();
  }

  private moveCameraXY(deltaMsec: number) {
    if (this.speeds.x === 0 && this.speeds.y === 0 && this.mouseMove.left.x === 0 && this.mouseMove.left.y === 0) return;

    const scaleFactor = this.mapSize.width / (this.terrainSize.width + 1);

    const deltaDistKey = (scaleFactor * 120 * 1000 * deltaMsec) / 1000 / 60 / 60;
    const deltaMouse = this.mouseMove.left;

    const oldPosition = new three.Vector3().copy(this.camera.position);
    this.camera.position.x += deltaDistKey * this.speeds.x - deltaMouse.x;
    this.camera.position.y += deltaDistKey * this.speeds.y + deltaMouse.y;

    this.mouseMove.left.x = 0;
    this.mouseMove.left.y = 0;

    const lookAt = requireNonnull(this.pointLookAtXYPlane());
    if (lookAt.x < -this.terrainSize.width / 2 || this.terrainSize.width / 2 < lookAt.x) {
      this.camera.position.x = oldPosition.x;
    }
    if (lookAt.y < -this.terrainSize.height / 2 || this.terrainSize.height / 2 < lookAt.y) {
      this.camera.position.y = oldPosition.y;
    }
  }

  private moveCameraForward() {
    if (this.mouseMove.wheel === 0) return;
    const moveDelta = (this.mouseMove.wheel * this.terrainSize.width) / -5000;
    this.mouseMove.wheel = 0;
    const cameraDirection = this.camera.getWorldDirection(new three.Vector3());
    const moveVector = cameraDirection.normalize().multiplyScalar(moveDelta);
    this.camera.position.add(moveVector);
    if (this.camera.position.z < this.minZ || this.maxZ < this.camera.position.z) {
      this.camera.position.sub(moveVector);
    }
  }

  private tiltCamera(deltaMsec: number) {
    if (this.mouseMove.center.y === 0 && this.speeds.tilt === 0) return;

    // PI rad = 180°
    // -(PI/2) rad / 1000 pixels by mouse
    const deltaRadMouse = this.mouseMove.center.y * (-(Math.PI / 2) / 1000);

    // PI/4 rad/sec by keypress
    const deltaRadKey = (((this.speeds.tilt * Math.PI) / 4) * deltaMsec) / 1000;

    const deltaRad = deltaRadMouse + deltaRadKey;
    this.mouseMove.center.y = 0;

    const center = requireNonnull(this.pointLookAtXYPlane());
    this.camera.position.sub(center);
    this.camera.position.applyAxisAngle(TILT_AXIS, deltaRad);

    const totalRad = TILT_RADIAN_BASE.angleTo(this.camera.position);
    if (totalRad < TILT_MIN_RAD || TILT_MAX_RAD < totalRad || this.camera.position.z < this.minZ || this.maxZ < this.camera.position.z) {
      this.camera.position.applyAxisAngle(TILT_AXIS, -deltaRad);
    }

    this.camera.position.add(center);
    this.camera.lookAt(center);
  }

  private pointLookAtXYPlane() {
    const cameraDirection = this.camera.getWorldDirection(new three.Vector3());
    const cameraRay = new three.Ray(this.camera.position, cameraDirection);
    return cameraRay.intersectPlane(XY_PLANE, new three.Vector3());
  }
}
