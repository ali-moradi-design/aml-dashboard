"use client";

import { Heart } from "lucide-react";
import { Trans } from "react-i18next";
import { cn } from "@/shared/lib/utils";

const PROFILE_URL = "https://github.com/ali-moradi-design";

const HeartIcon = () => (
  <Heart className="inline size-3.5 fill-risk-high align-[-2px] text-risk-high" aria-label="love" />
);

/** "Made with ♥ by Ali Moradi". `compact` shows only the heart (collapsed sidebar). */
export const MadeBy = ({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) => (
  <p className={cn("text-xs whitespace-nowrap text-text-secondary", className)}>
    {compact ? (
      <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label="Ali Moradi">
        <HeartIcon />
      </a>
    ) : (
      <Trans
        i18nKey="credit.madeBy"
        components={{
          heart: <HeartIcon />,
          author: (
            <a
              href={PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text underline-offset-2 hover:underline"
            />
          ),
        }}
      />
    )}
  </p>
);
