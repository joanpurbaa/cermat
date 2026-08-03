import { ArrowLeft } from "lucide-react";

export default function BackButton({ title }: { title: string }) {
	return (
		<section className="relative flex items-center">
			<button className="z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100">
				<ArrowLeft size={20} />
			</button>

			<p className="absolute left-1/2 -translate-x-1/2 font-display font-semibold text-ink-900">
				{title}
			</p>
		</section>
	);
}
