"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ThemeSwitcher = () => {
  const isMounted = useSyncExternalStore(
    () => () => undefined, // Hydration status never changes after mounting
    () => true,
    () => false,
  );
  const { theme, setTheme } = useTheme();

  if (!isMounted) {
    return null;
  }

  const ICON_SIZE = 16;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"sm"} aria-label="Change theme">
          {theme === "light" ? (
            <Sun
              key="light"
              size={ICON_SIZE}
              className={cn("text-muted-foreground")}
            />
          ) : theme === "dark" ? (
            <Moon
              key="dark"
              size={ICON_SIZE}
              className={cn("text-muted-foreground")}
            />
          ) : (
            <Laptop
              key="system"
              size={ICON_SIZE}
              className={cn("text-muted-foreground")}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={cn("w-content")} align="start">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(e) => {
            setTheme(e);
          }}
        >
          <DropdownMenuRadioItem className={cn("flex gap-2")} value="light">
            <Sun size={ICON_SIZE} className={cn("text-muted-foreground")} />{" "}
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className={cn("flex gap-2")} value="dark">
            <Moon size={ICON_SIZE} className={cn("text-muted-foreground")} />{" "}
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className={cn("flex gap-2")} value="system">
            <Laptop size={ICON_SIZE} className={cn("text-muted-foreground")} />{" "}
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ThemeSwitcher };
