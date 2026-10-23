import type { QuantVisual } from "@/lib/quant/visual";
import { DiceGridFigure, DieFacesFigure } from "./dice";
import { CardsFigure } from "./cards";
import { CoinsFigure } from "./coins";
import { MarblesFigure } from "./marbles";
import { PeopleFigure } from "./people";
import { VennFigure } from "./venn";
import { GridPathFigure, SlotsFigure, StarsBarsFigure } from "./counting";
import { TreeFigure } from "./tree";
import { BarsFigure } from "./bars";
import { NormalFigure } from "./normal";
import { SquareFigure } from "./square";
import { NumberLineFigure } from "./number-line";
import { StatesFigure } from "./states";

/** Draws any quant figure from its data. */
export function QuantFigure({ visual }: { visual: QuantVisual }) {
  switch (visual.type) {
    case "dice-grid":
      return <DiceGridFigure visual={visual} />;
    case "die-faces":
      return <DieFacesFigure visual={visual} />;
    case "cards":
      return <CardsFigure visual={visual} />;
    case "coins":
      return <CoinsFigure visual={visual} />;
    case "marbles":
      return <MarblesFigure visual={visual} />;
    case "people":
      return <PeopleFigure visual={visual} />;
    case "venn":
      return <VennFigure visual={visual} />;
    case "slots":
      return <SlotsFigure visual={visual} />;
    case "stars-bars":
      return <StarsBarsFigure visual={visual} />;
    case "grid-path":
      return <GridPathFigure visual={visual} />;
    case "tree":
      return <TreeFigure visual={visual} />;
    case "bars":
      return <BarsFigure visual={visual} />;
    case "normal":
      return <NormalFigure visual={visual} />;
    case "square":
      return <SquareFigure visual={visual} />;
    case "number-line":
      return <NumberLineFigure visual={visual} />;
    case "states":
      return <StatesFigure visual={visual} />;
  }
}
