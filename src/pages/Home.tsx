import { useEffect, useMemo, useState } from "react";
import { MapPin, Megaphone, LoaderCircle } from "lucide-react";
import L from "leaflet";
import {
	MapContainer,
	Marker,
	Polyline,
	TileLayer,
	useMap,
} from "react-leaflet";

import BackButton from "../components/BackButton";
import LocationAutocomplete from "../components/LocationAutocomplete";
import RouteStep from "../components/RouteStep";
import { getFastestRoute, type LatLon, type RouteResult } from "../lib/routing";

function FitRouteBounds({ coordinates }: { coordinates: LatLon[] }) {
	const map = useMap();

	useEffect(() => {
		if (!coordinates.length) return;
		map.fitBounds(L.latLngBounds(coordinates), { padding: [48, 48] });
	}, [coordinates, map]);

	return null;
}

const liveIcon = L.divIcon({
	className: "",
	html: `
    <div class="relative flex h-8 w-8 items-center justify-center">
      <span class="cermat-ping absolute h-8 w-8 rounded-full bg-brand-400/50"></span>
      <span class="relative h-3.5 w-3.5 rounded-full bg-brand-500 ring-4 ring-white shadow-lg"></span>
    </div>
  `,
	iconSize: [32, 32],
	iconAnchor: [16, 16],
});

const destinationIcon = L.divIcon({
	className: "",
	html: `
    <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.732-6.268-14-14-14z" fill="#2F8AF0"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `,
	iconSize: [28, 36],
	iconAnchor: [14, 36],
});

export default function Home() {
	const [expanded, setExpanded] = useState(false);
	const [originCoords, setOriginCoords] = useState<LatLon | null>(null);
	const [destCoords, setDestCoords] = useState<LatLon | null>(null);
	const [route, setRoute] = useState<RouteResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!originCoords || !destCoords) return;

		let cancelled = false;
		setLoading(true);
		setError(null);

		getFastestRoute(originCoords, destCoords)
			.then((result) => {
				if (cancelled) return;
				setRoute(result);
				setExpanded(true);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : "Terjadi kesalahan");
				setRoute(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [originCoords, destCoords]);

	const sheetHeight = expanded ? 420 : route ? 240 : 190;
	const center = useMemo<LatLon>(
		() => originCoords || [-6.9175, 107.6191],
		[originCoords],
	);

	return (
		<main className="mx-auto flex h-screen w-[500px] flex-col overflow-hidden">
			<div className="relative z-[1000] bg-gradient-to-b from-brand-50 to-white px-8 pt-8 pb-6">
				<BackButton title="Rute" />

				<LocationAutocomplete
					className="mt-7 relative z-[20]"
					placeholder="Lokasi berangkat kamu"
					onSelect={(coords) => setOriginCoords(coords)}
				/>

				<LocationAutocomplete
					className="mt-3 relative z-[10]"
					placeholder="Titik tujuan kamu"
					Icon={MapPin}
					onSelect={(coords) => setDestCoords(coords)}
				/>

				{error && (
					<p className="mt-3 text-sm font-medium text-danger-500">{error}</p>
				)}
			</div>

			<div className="relative z-0 flex-1 overflow-hidden">
				<MapContainer
					center={center}
					zoom={14}
					scrollWheelZoom={false}
					className="h-full w-full">
					<TileLayer
						attribution="&copy; OpenStreetMap contributors"
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>

					{originCoords && <Marker position={originCoords} icon={liveIcon} />}
					{destCoords && <Marker position={destCoords} icon={destinationIcon} />}

					{route && (
						<>
							<Polyline
								positions={route.coordinates}
								pathOptions={{ color: "#2f8af0", weight: 5, opacity: 0.9 }}
							/>
							<FitRouteBounds coordinates={route.coordinates} />
						</>
					)}
				</MapContainer>
			</div>

			<div
				className="relative z-10 shrink-0 overflow-hidden rounded-t-[28px] bg-white shadow-[0_-8px_30px_rgba(11,18,32,0.1)] transition-all duration-300"
				style={{ height: sheetHeight }}>
				<button
					onClick={() => setExpanded(!expanded)}
					className="flex w-full items-center justify-center py-3">
					<div className="h-1.5 w-12 rounded-full bg-ink-300" />
				</button>

				<div
					className="overflow-y-auto px-8 pb-8"
					style={{ height: sheetHeight - 48 }}>
					{loading && (
						<div className="flex items-center gap-3 text-ink-500">
							<LoaderCircle size={18} className="animate-spin text-brand-500" />
							<p className="text-sm">Mencari rute tercepat...</p>
						</div>
					)}

					{!loading && !route && (
						<p className="text-sm text-ink-500">
							Masukkan lokasi berangkat dan tujuan untuk melihat rute tercepat.
						</p>
					)}

					{!loading && route && (
						<>
							<p className="font-display text-lg font-bold text-ink-900">
								{route.durationMin} menit{" "}
								<span className="font-medium text-ink-500">
									&middot; {route.distanceKm.toFixed(1)} km
								</span>
							</p>

							<div className="mt-4 flex items-start gap-3 rounded-2xl bg-alert-50 px-4 py-3">
								<Megaphone size={20} className="mt-0.5 shrink-0 text-alert-500" />
								<p className="text-sm text-ink-900">
									<span className="font-display font-semibold">Banjir</span> di Jl.
									Soekarno Hatta
								</p>
							</div>

							<div className="mt-7">
								{route.steps.map((step) => (
									<RouteStep
										key={step.id}
										title={step.title}
										subtitle={step.subtitle}
										isLast={step.isLast}
									/>
								))}
							</div>
						</>
					)}
				</div>
			</div>
		</main>
	);
}
