"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<
  React.ComponentProps<"input">,
  "type"
> {
  containerClassName?: string;
  visibilityLabel?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      containerClassName,
      disabled,
      id,
      visibilityLabel = "password",
      ...props
    },
    ref,
  ) => {
    const [visible, setVisible] = React.useState(false);
    const buttonLabel = `${visible ? "Hide" : "Show"} ${visibilityLabel}`;

    return (
      <div className={cn("relative min-w-0", containerClassName)}>
        <Input
          {...props}
          id={id}
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-10", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("absolute right-0 top-0 text-muted-foreground")}
          aria-label={buttonLabel}
          aria-controls={id}
          title={buttonLabel}
          disabled={disabled}
          onClick={() => {
            setVisible((current) => !current);
          }}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
