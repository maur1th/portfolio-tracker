"use client";

import { usePrivacy } from "./privacy-provider";

interface PrivateValueProps {
  children: React.ReactNode;
}

export function PrivateValue({ children }: PrivateValueProps) {
  const { privacyMode } = usePrivacy();
  if (privacyMode) return <span aria-hidden="true">••••</span>;
  return <>{children}</>;
}
