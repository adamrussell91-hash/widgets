import { Bodies, Composite, Engine, type Body } from 'matter-js';
import { createBoardGeometry, BOARD, type BoardGeometry, type Point } from './geometry';

export type BodyTag =
  | 'ball'
  | 'peg'
  | 'rail'
  | 'divider'
  | 'funnel'
  | 'floor'
  | 'hopper-wall'
  | 'gate';

export interface GaltonBodyPlugin {
  galton: {
    tag: BodyTag;
    ballId?: number;
    released?: boolean;
    settled?: boolean;
    targetBin?: number | null;
  };
}

export interface PhysicsWorld {
  engine: Engine;
  world: Composite;
  geometry: BoardGeometry;
  bodies: {
    pegs: Body[];
    rails: Body[];
    dividers: Body[];
    funnels: Body[];
    floor: Body;
    hopperWalls: Body[];
    gate: Body;
  };
}

function staticBodyOptions(tag: Exclude<BodyTag, 'ball'>, released?: boolean) {
  return {
    isStatic: true,
    label: tag,
    plugin: { galton: { tag, ...(released === undefined ? {} : { released }) } },
  };
}

function slopedWall(start: Point, end: Point, thickness: number): Body {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  return Bodies.rectangle(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    length,
    thickness,
    {
      ...staticBodyOptions('hopper-wall'),
      angle: Math.atan2(end.y - start.y, end.x - start.x),
    },
  );
}

function slopedFunnel(start: Point, end: Point, thickness: number): Body {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  return Bodies.rectangle(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    length,
    thickness,
    {
      ...staticBodyOptions('funnel'),
      angle: Math.atan2(end.y - start.y, end.x - start.x),
    },
  );
}

function roundedEndCap({ x, y }: Point, thickness: number): Body {
  const sides = 24;
  const radius = thickness / 2;
  const collisionRadius = radius / Math.cos(Math.PI / sides);
  const cap = Bodies.polygon(x, y, sides, collisionRadius, staticBodyOptions('hopper-wall'));
  cap.circleRadius = radius;
  return cap;
}

export function createPhysicsWorld(hopperPosition = 0): PhysicsWorld {
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;

  const geometry = createBoardGeometry(hopperPosition);
  const pegs = geometry.pegRows.flatMap(({ pegs }) => pegs.map(({ x, y }) => (
    Bodies.circle(x, y, BOARD.pegRadius, staticBodyOptions('peg'))
  )));
  const rails = [geometry.leftRail, geometry.rightRail].map(({ centre, width, height, angle }) => (
    Bodies.rectangle(centre.x, centre.y, width, height, { ...staticBodyOptions('rail'), angle })
  ));
  const dividers = geometry.dividerXs.map((x) => (
    Bodies.rectangle(
      x,
      (BOARD.binTop + BOARD.binBottom) / 2,
      BOARD.dividerWidth,
      BOARD.binBottom - BOARD.binTop,
      staticBodyOptions('divider'),
    )
  ));
  const funnels = geometry.funnels.map(({ start, end, width }) => (
    slopedFunnel(start, end, width)
  ));
  const floor = Bodies.rectangle(
    (geometry.dividerXs[0]! + geometry.dividerXs.at(-1)!) / 2,
    geometry.floorY,
    (geometry.dividerXs.at(-1)! - geometry.dividerXs[0]!),
    BOARD.floorHeight,
    staticBodyOptions('floor'),
  );
  const hopperStarts = [
    { x: geometry.hopper.left, y: geometry.hopper.top },
    { x: geometry.hopper.right, y: geometry.hopper.top },
  ];
  const hopperEnds = [geometry.hopper.leftWallEnd, geometry.hopper.rightWallEnd];
  const hopperWallSegments = hopperStarts.map((start, index) => (
    slopedWall(start, hopperEnds[index]!, geometry.hopper.wallThickness)
  ));
  const hopperEndCaps = [...hopperStarts, ...hopperEnds].map(({ x, y }) => (
    roundedEndCap({ x, y }, geometry.hopper.wallThickness)
  ));
  const hopperWalls = [...hopperWallSegments, ...hopperEndCaps];
  const gate = Bodies.rectangle(
    geometry.hopper.gateClosedX,
    geometry.hopper.bottom,
    geometry.hopper.rightWallEnd.x - geometry.hopper.leftWallEnd.x,
    BOARD.gateHeight,
    staticBodyOptions('gate', false),
  );

  Composite.add(engine.world, [
    ...pegs,
    ...rails,
    ...dividers,
    ...funnels,
    floor,
    ...hopperWalls,
    gate,
  ]);

  return {
    engine,
    world: engine.world,
    geometry,
    bodies: { pegs, rails, dividers, funnels, floor, hopperWalls, gate },
  };
}
