import { Fragment, type ReactNode } from "react";

import {
  getManagedSharedSidebarBlocks,
  type SharedSidebarBlock,
} from "@/lib/site-experience";

type ManagedSharedSidebarStackProps = {
  items: Partial<Record<SharedSidebarBlock, ReactNode>>;
};

export function ManagedSharedSidebarStack({
  items,
}: ManagedSharedSidebarStackProps) {
  const visibleBlocks = getManagedSharedSidebarBlocks();
  const orderedItems = visibleBlocks.reduce<Array<{ block: SharedSidebarBlock; node: ReactNode }>>(
    (accumulator, block) => {
      const node = items[block];

      if (node) {
        accumulator.push({ block, node });
      }

      return accumulator;
    },
    [],
  );

  if (!orderedItems.length) {
    return null;
  }

  return (
    <>
      {orderedItems.map((item) => (
        <Fragment key={item.block}>{item.node}</Fragment>
      ))}
    </>
  );
}
