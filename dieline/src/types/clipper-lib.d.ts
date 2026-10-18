/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "clipper-lib" {
  interface IntPoint {
    X: number;
    Y: number;
  }
  class ClipperOffset {
    constructor(miterLimit?: number, arcTolerance?: number);
    AddPath(path: IntPoint[], joinType: number, endType: number): void;
    Execute(solution: IntPoint[][], delta: number): void;
  }
  class Clipper {
    constructor();
    AddPath(path: IntPoint[], polyType: number, closed: boolean): boolean;
    AddPaths(paths: IntPoint[][], polyType: number, closed: boolean): boolean;
    Execute(clipType: number, solution: IntPoint[][], subjFillType?: number, clipFillType?: number): boolean;
    static Area(poly: IntPoint[]): number;
  }
  const JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
  const EndType: { etClosedPolygon: number; etClosedLine: number; etOpenButt: number; etOpenSquare: number; etOpenRound: number };
  const ClipType: { ctIntersection: number; ctUnion: number; ctDifference: number; ctXor: number };
  const PolyType: { ptSubject: number; ptClip: number };
  const PolyFillType: { pftEvenOdd: number; pftNonZero: number; pftPositive: number; pftNegative: number };
  const ClipperLib: {
    ClipperOffset: typeof ClipperOffset;
    Clipper: typeof Clipper;
    JoinType: typeof JoinType;
    EndType: typeof EndType;
    ClipType: typeof ClipType;
    PolyType: typeof PolyType;
    PolyFillType: typeof PolyFillType;
  };
  export default ClipperLib;
}
