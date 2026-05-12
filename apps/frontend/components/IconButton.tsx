import Link from "next/link";

type IconButtonVariant = "default" | "danger" | "warning" | "success" | "muted";

type IconButtonProps = {
  label: string;
  icon: string;
  onClick?: () => void;
  href?: string;
  variant?: IconButtonVariant;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
  className?: string;
};

function iconButtonClassName(variant: IconButtonVariant, className?: string) {
  const classes = ["icon-button"];
  if (variant !== "default") {
    classes.push(`icon-button-${variant}`);
  }
  if (className) {
    classes.push(className);
  }
  return classes.join(" ");
}

export function IconButton({
  label,
  icon,
  onClick,
  href,
  variant = "default",
  disabled = false,
  title,
  type = "button",
  className,
}: IconButtonProps) {
  const accessibleLabel = title ?? label;
  const classes = iconButtonClassName(variant, className);

  if (href && !disabled) {
    return (
      <Link aria-label={accessibleLabel} className={classes} href={href} title={accessibleLabel}>
        <span aria-hidden="true">{icon}</span>
      </Link>
    );
  }

  return (
    <button
      aria-label={accessibleLabel}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      title={accessibleLabel}
      type={type}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
