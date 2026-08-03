import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUp, MapPin } from "lucide-react";

import {
	searchPlaces,
	type LatLon,
	type PlaceSuggestion,
} from "../lib/routing";

export default function LocationAutocomplete({
	className,
	placeholder,
	Icon = ArrowUp,
	onSelect,
}: {
	className?: string;
	placeholder: string;
	Icon?: LucideIcon;
	onSelect: (coords: LatLon, label: string) => void;
}) {
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [searchError, setSearchError] = useState(false);
	const [highlighted, setHighlighted] = useState(-1);

	const containerRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function handleChange(value: string) {
		setQuery(value);
		setHighlighted(-1);
		setSearchError(false);

		if (debounceRef.current !== null) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}

		abortRef.current?.abort();

		if (value.trim().length < 3) {
			setSuggestions([]);
			setOpen(false);
			return;
		}

		debounceRef.current = setTimeout(async () => {
			const controller = new AbortController();
			abortRef.current = controller;
			setLoading(true);
			setOpen(true);

			try {
				const results = await searchPlaces(value, controller.signal);
				setSuggestions(results);
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				setSuggestions([]);
				setSearchError(true);
			} finally {
				setLoading(false);
			}
		}, 350);
	}

	function selectSuggestion(suggestion: PlaceSuggestion) {
		setQuery(suggestion.primary);
		setOpen(false);
		setSuggestions([]);
		onSelect(suggestion.coords, suggestion.primary);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (!open || !suggestions.length) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlighted((prev) => (prev + 1) % suggestions.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlighted(
				(prev) => (prev - 1 + suggestions.length) % suggestions.length,
			);
		} else if (e.key === "Enter" && highlighted >= 0) {
			e.preventDefault();
			selectSuggestion(suggestions[highlighted]);
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	}

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<section className="flex items-center gap-x-4">
				<Icon size={18} className="shrink-0 text-brand-500" />
				<input
					className="w-full rounded-2xl bg-brand-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-500 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-400"
					type="text"
					value={query}
					onChange={(e) => handleChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => suggestions.length > 0 && setOpen(true)}
					placeholder={placeholder}
				/>
			</section>

			{open && (
				<ul className="absolute top-full right-0 left-9 z-[9999] mt-2 max-h-64 overflow-y-auto rounded-2xl bg-white py-2 shadow-[0_12px_32px_rgba(11,18,32,0.14)] ring-1 ring-ink-100">
					{loading && (
						<li className="px-4 py-3 text-sm text-ink-500">Mencari lokasi...</li>
					)}

					{!loading && searchError && (
						<li className="px-4 py-3 text-sm text-danger-500">
							Gagal memuat lokasi, coba lagi
						</li>
					)}

					{!loading && !searchError && suggestions.length === 0 && (
						<li className="px-4 py-3 text-sm text-ink-500">Tidak ada hasil</li>
					)}

					{!loading &&
						suggestions.map((suggestion, i) => (
							<li key={suggestion.id}>
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => selectSuggestion(suggestion)}
									onMouseEnter={() => setHighlighted(i)}
									className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
										highlighted === i ? "bg-brand-50" : ""
									}`}>
									<MapPin size={16} className="mt-0.5 shrink-0 text-brand-500" />
									<span className="min-w-0">
										<span className="block truncate text-sm font-medium text-ink-900">
											{suggestion.primary}
										</span>
										<span className="block truncate text-xs text-ink-500">
											{suggestion.secondary}
										</span>
									</span>
								</button>
							</li>
						))}
				</ul>
			)}
		</div>
	);
}
