"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type NavCloseLinkProps = ComponentProps<typeof Link>;

export function NavCloseLink(props: NavCloseLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        const details = (event.currentTarget as HTMLElement).closest("details");
        if (details) {
          details.removeAttribute("open");
        }
      }}
    />
  );
}
