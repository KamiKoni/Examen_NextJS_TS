import type { HTMLAttributes, PropsWithChildren } from "react";

interface CardProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  title?: string;
  eyebrow?: string;
}

export function Card({ title, eyebrow, className = "", children, ...props }: CardProps) {
  return (
    <div {...props} className={`panel ${className}`.trim()}>
      {(eyebrow || title) && (
        <div>
          {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
          {title ? <h2 className="section-title">{title}</h2> : null}
        </div>
      )}
      <div className={eyebrow || title ? "mt-5" : ""}>{children}</div>
    </div>
  );
}
