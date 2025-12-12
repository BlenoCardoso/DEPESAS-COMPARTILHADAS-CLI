import { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps<T extends ElementType = "section"> = {
  as?: T;
  bleed?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function PageContainer<T extends ElementType = "section">({
  as,
  bleed = false,
  children,
  className,
  ...rest
}: PageContainerProps<T>) {
  const Component = (as ?? "section") as ElementType;

  return (
    <Component
      className={cn(
        "page-container",
        bleed && "page-container--bleed",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
