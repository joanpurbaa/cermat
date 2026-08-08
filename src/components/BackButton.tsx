import { ArrowLeft } from "lucide-react";

export default function BackButton({ title }: { title: string }) {
	return (
		<header className="relative flex min-h-11 items-center justify-center">
			<button
				type="button"
				aria-label="Kembali"
				onClick={() => window.history.back()}
				className="absolute left-0 z-10 flex size-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
				<ArrowLeft aria-hidden="true" size={22} />
			</button>
			<h1 className="font-display text-lg font-bold tracking-tight text-ink-900">
				{title}
			</h1>
		</header>
	);
}
