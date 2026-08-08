export type LatLon = [number, number];

export interface FloodLocation {
	name: string;
	latitude: number;
	longitude: number;
	flood_confidence: number;
	stream_url?: string; // URL CCTV live (.m3u8), opsional
}

export interface RouteInfo {
	index: number;
	length_in_meters: number;
	travel_time_in_seconds: number;
	traffic_delay_in_seconds: number;
	points: LatLon[];
	floods: FloodLocation[];
	score: number;
	recommended: boolean;
}

export interface RouteData {
	origin: { lat: number; lng: number };
	destination: { lat: number; lng: number };
	threshold_m: number;
	recommended_route_index: number | null;
	routes: RouteInfo[];
}

interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T | null;
}

const BASE_URL =
	import.meta.env.VITE_VISION_AI_URL ??
	"https://semarangvision.chevalierlabsas.org";

export async function getFloodAwareRoutes(
	origin: LatLon,
	destination: LatLon,
): Promise<RouteData> {
	const res = await fetch(`${BASE_URL}/api/routes`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			origin: { lat: origin[0], lng: origin[1] },
			destination: { lat: destination[0], lng: destination[1] },
		}),
	});

	const json: ApiResponse<RouteData> = await res.json();

	if (!res.ok || !json.success || !json.data) {
		throw new Error(json.message || "Gagal mengambil rute");
	}

	return json.data;
}
