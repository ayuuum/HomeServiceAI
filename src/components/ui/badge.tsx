import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-transparent",
  {
    variants: {
      variant: {
        default: "border-primary text-primary hover:bg-primary/10",
        secondary: "border-gray-400 text-gray-500 hover:bg-gray-100", // Pending
        destructive: "border-destructive text-destructive hover:bg-destructive/10", // Error
        outline: "text-foreground",
        success: "border-primary text-primary hover:bg-primary/10", // Confirmed (same as default/primary)
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
