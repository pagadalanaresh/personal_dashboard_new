"use client";

import * as React from "react";

type PageAction = { label: string; onClick: () => void } | null;

const PageActionContext = React.createContext<{
  action: PageAction;
  setAction: (action: PageAction) => void;
} | null>(null);

export function PageActionProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = React.useState<PageAction>(null);
  const value = React.useMemo(() => ({ action, setAction }), [action]);
  return <PageActionContext.Provider value={value}>{children}</PageActionContext.Provider>;
}

export function usePageAction() {
  const ctx = React.useContext(PageActionContext);
  if (!ctx) throw new Error("usePageAction must be used within a PageActionProvider");
  return ctx.action;
}

// Pages register their primary "+" action here (e.g. "Add holding") so the
// mobile nav bar can surface it as a single compact icon button — the iOS
// convention (Reminders/Notes/Mail put the add action in the nav bar)
// instead of a labeled button competing for space in scrolling content.
// Desktop keeps the labeled button, which has room for it.
export function useRegisterPageAction(action: PageAction) {
  const ctx = React.useContext(PageActionContext);
  if (!ctx) throw new Error("useRegisterPageAction must be used within a PageActionProvider");
  const { setAction } = ctx;
  const onClick = action?.onClick;
  const label = action?.label;
  React.useEffect(() => {
    if (!label || !onClick) {
      setAction(null);
      return;
    }
    setAction({ label, onClick });
    return () => setAction(null);
  }, [label, onClick, setAction]);
}
