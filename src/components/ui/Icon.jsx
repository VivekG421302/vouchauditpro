import * as icons from 'lucide-react';

// The original app referenced Lucide icons by kebab-case name via
// data-lucide="layout-dashboard". lucide-react exports PascalCase
// component names (LayoutDashboard). This wrapper lets every ported
// page keep using the original kebab-case strings unchanged.
function toPascalCase(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function Icon({ name, className = 'w-4 h-4', ...rest }) {
  if (!name) return null;
  const componentName = toPascalCase(name);
  const LucideIcon = icons[componentName];
  if (!LucideIcon) {
    console.warn(`Icon: no lucide-react icon found for "${name}" (${componentName})`);
    return null;
  }
  return <LucideIcon className={className} {...rest} />;
}
