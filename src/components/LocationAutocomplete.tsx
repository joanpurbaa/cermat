import { useEffect, useRef, useState } from "react";
import { Loader2, type LucideIcon, Search } from "lucide-react";

export type LatLon = [number, number];

interface PhotonFeature {
	geometry: { coordinates: [number, number] }; // [lng, lat]
	properties: {
		name?: string;
		street?: string;
		housenumber?: string;
		city?: string;
		district?: string;
		state?: string;
	};
}

interface Suggestion {
	id: string;
	label: string;
	sublabel: string;
	coords: LatLon;
}

const SEMARANG_BBOX = "110.30,-7.10,110.55,-6.90";
const SEMARANG_CENTER = { lat: -6.9667, lon: 110.4167 };
const ARROW_RE = /→|->|=>/;

function toSuggestion(f: PhotonFeature, i: number): Suggestion {
	const p = f.properties;
	const [lng, lat] = f.geometry.coordinates;
	const label =
		[p.housenumber, p.street || p.name].filter(Boolean).join(" ") ||
		p.name ||
		"Tanpa nama";
	const sublabel = [p.district, p.city, p.state].filter(Boolean).join(", ");
	return { id: `${lat}-${lng}-${i}`, label, sublabel, coords: [lat, lng] };
}

async function searchPhoton(query: string): Promise<Suggestion[]> {
	const baseParams = {
		q: query,
		lat: String(SEMARANG_CENTER.lat),
		lon: String(SEMARANG_CENTER.lon),
		limit: "8",
	};

	const scoped = new URLSearchParams({ ...baseParams, bbox: SEMARANG_BBOX });
	const res = await fetch(`https://photon.komoot.io/api/?${scoped}`);
	if (!res.ok) throw new Error(`Photon error ${res.status}`);
	const json = await res.json();
	let features: PhotonFeature[] = json.features ?? [];

	if (features.length === 0) {
		const wide = new URLSearchParams(baseParams);
		const res2 = await fetch(`https://photon.komoot.io/api/?${wide}`);
		if (res2.ok) {
			const json2 = await res2.json();
			features = (json2.features ?? []).filter((f: PhotonFeature) => {
				const [lng, lat] = f.geometry.coordinates;
				return lng >= 110.1 && lng <= 110.7 && lat >= -7.3 && lat <= -6.7;
			});
		}
	}

	return features.map(toSuggestion);
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatCoord([lat, lng]: LatLon): string {
	return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// eslint-disable-next-line react-refresh/only-export-components
export function parseCoordPair(raw: string): LatLon | null {
	const cleaned = raw.trim().replace(/^\(|\)$/g, "");
	const m = cleaned.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
	if (!m) return null;
	const lat = parseFloat(m[1]);
	const lng = parseFloat(m[2]);
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
	return [lat, lng];
}

// eslint-disable-next-line react-refresh/only-export-components
export function parseDualCoordPair(
	raw: string,
): { origin: LatLon; destination: LatLon } | null {
	if (!ARROW_RE.test(raw)) return null;
	const [left, right] = raw.split(ARROW_RE);
	const origin = parseCoordPair(left);
	const destination = parseCoordPair(right);
	if (!origin || !destination) return null;
	return { origin, destination };
}

interface LocationAutocompleteProps {
	className?: string;
	placeholder?: string;
	Icon?: LucideIcon;
	onSelect: (
		coords: LatLon,
		item?: { name: string; [key: string]: any },
	) => void;
	externalValue?: { label: string; coords: LatLon } | null;
}

export default function LocationAutocomplete({
	className,
	placeholder,
	onSelect,
	externalValue,
}: LocationAutocompleteProps) {
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [invalid, setInvalid] = useState(false);
	const [resolvedCoords, setResolvedCoords] = useState<LatLon | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!externalValue) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setQuery(externalValue.label);
		setResolvedCoords(externalValue.coords);
		setInvalid(false);
		setSuggestions([]);
		setOpen(false);
	}, [externalValue]);

	useEffect(() => {
		const trimmed = query.trim();
		if (trimmed.length < 3) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setSuggestions([]);
			return;
		}

		const coordPair = parseCoordPair(trimmed);
		if (coordPair) {
			setSuggestions([]);
			setOpen(false);
			setInvalid(false);
			const same =
				resolvedCoords &&
				resolvedCoords[0] === coordPair[0] &&
				resolvedCoords[1] === coordPair[1];
			if (!same) {
				setResolvedCoords(coordPair);
				onSelect(coordPair);
			}
			return;
		}

		let cancelled = false;
		setLoading(true);
		const timeout = setTimeout(() => {
			searchPhoton(trimmed)
				.then((results) => {
					if (cancelled) return;
					setSuggestions(results);
					setOpen(true);
				})
				.catch(() => {
					if (!cancelled) setSuggestions([]);
				})
				.finally(() => {
					if (!cancelled) setLoading(false);
				});
		}, 350);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [query]);

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

	function handlePick(s: Suggestion) {
		setQuery(s.label);
		setSuggestions([]);
		setOpen(false);
		setInvalid(false);
		setResolvedCoords(s.coords);
		onSelect(s.coords);
	}

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		setQuery(e.target.value);
		setResolvedCoords(null);
		setInvalid(false);
	}

	function handleBlur() {
		const trimmed = query.trim();
		if (trimmed.length === 0 || resolvedCoords) {
			setInvalid(false);
			return;
		}
		setInvalid(true);
	}

	return (
		<div ref={containerRef} className={`relative ${className ?? ""}`}>
			<div
				className={`flex items-center gap-3 px-1 transition-colors ${
					invalid ? "border-b border-danger-500" : ""
				}`}>
				<input
					value={query}
					onChange={handleChange}
					onBlur={handleBlur}
					onFocus={() => suggestions.length > 0 && setOpen(true)}
					placeholder={placeholder}
					className="w-full bg-transparent py-3 text-[14.5px] text-ink-900 outline-none placeholder:text-ink-400"
				/>
				{loading && <Loader2 size={16} className="animate-spin text-brand-500" />}
				{!loading && query && <Search size={16} className="text-ink-300" />}
			</div>

			{invalid && (
				<p className="absolute left-1 top-[calc(100%-8px)] z-10 px-1 text-[11px] font-medium text-danger-500 bg-white">
					Pilih lokasi dari daftar saran
				</p>
			)}

			{open && suggestions.length > 0 && (
				<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-ink-100 bg-white shadow-xl">
					{suggestions.map((s) => (
						<button
							key={s.id}
							onClick={() => handlePick(s)}
							className="flex w-full flex-col items-start gap-0.5 border-b border-ink-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-brand-50">
							<span className="text-[14px] font-medium text-ink-900">{s.label}</span>
							{s.sublabel && (
								<span className="text-[12px] text-ink-400">{s.sublabel}</span>
							)}
						</button>
					))}
				</div>
			)}

			{open &&
				!loading &&
				query.trim().length >= 3 &&
				suggestions.length === 0 && (
					<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-lg">
						<p className="text-[14px] text-ink-400">Tidak ditemukan</p>
					</div>
				)}
		</div>
	);
}
