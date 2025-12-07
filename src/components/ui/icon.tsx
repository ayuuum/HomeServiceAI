import { cn } from "@/lib/utils";

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
    name: string;
    size?: number;
    filled?: boolean;
}

export const Icon = ({ name, size = 24, filled = false, className, ...props }: IconProps) => {
    return (
        <span
            className={cn("material-symbols-rounded select-none", className)}
            style={{
                fontSize: `${size}px`,
                fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
            }}
            {...props}
        >
            {name}
        </span>
    );
};
