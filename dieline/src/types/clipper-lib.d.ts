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
  const JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
  const EndType: { etClosedPolygon: number; etClosedLine: number; etOpenButt: number; etOpenSquare: number; etOpenRound: number };
  const ClipperLib: { ClipperOffset: typeof ClipperOffset; JoinType: typeof JoinType; EndType: typeof EndType };
  export default ClipperLib;
}
