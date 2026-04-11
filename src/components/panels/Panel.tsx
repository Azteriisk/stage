import type { PropsWithChildren, ReactNode } from "react";

type PanelProps = PropsWithChildren<{
  title: string;
  description: string;
  footer?: ReactNode;
}>;

export function Panel({ children, description, footer, title }: PanelProps) {
  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <p className="panel__eyebrow">{title}</p>
          <h2 className="panel__title">{description}</h2>
        </div>
      </header>
      <div className="panel__body">{children}</div>
      {footer ? <footer className="panel__footer">{footer}</footer> : null}
    </section>
  );
}
