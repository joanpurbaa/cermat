type RouteStepProps = {
	title: string;
	subtitle: string;
	isLast?: boolean;
};

export default function RouteStep({
	title,
	subtitle,
	isLast = false,
}: RouteStepProps) {
	return (
		<div className="flex gap-5">
			<div className="relative flex w-5 justify-center">
				<div
					className={`z-10 mt-1 rounded-full ${
						isLast
							? "h-3.5 w-3.5 bg-brand-500 ring-4 ring-brand-100"
							: "h-2.5 w-2.5 bg-brand-300"
					}`}
				/>

				{!isLast && (
					<div className="absolute top-3 left-1/2 h-[calc(100%+1.75rem)] w-[3px] -translate-x-1/2 rounded-full bg-ink-100" />
				)}
			</div>

			<div className="pb-7">
				<h3 className="font-display text-[15px] font-semibold text-ink-900">
					{title}
				</h3>
				<p className="text-sm text-ink-500">{subtitle}</p>
			</div>
		</div>
	);
}
