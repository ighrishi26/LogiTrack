import { Building2 } from "lucide-react";

export default function PageFooter({ label, className = "" }) {
  return (
    <footer className={`app-page-footer ${className}`.trim()}>
      <Building2 size={15} aria-hidden="true" />
      <span>{label}</span>
    </footer>
  );
}
