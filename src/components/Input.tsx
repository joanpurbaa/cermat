import type { LucideIcon } from "lucide-react";
import { ArrowUp } from "lucide-react";

export default function Input({
	className,
	placeholder,
	value,
	onChange,
	onSubmit,
	Icon = ArrowUp,
}: {
	className?: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	onSubmit?: () => void;
	Icon?: LucideIcon;
}) {
	return (
		<section className={`flex items-center gap-x-4 ${className}`}>
			<Icon size={18} className="shrink-0 text-brand-500" />
			<input
				className="w-full rounded-2xl bg-brand-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-500 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-400"
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") onSubmit?.();
				}}
				placeholder={placeholder}
			/>
		</section>
	);
}
