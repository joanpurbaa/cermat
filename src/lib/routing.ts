export type LatLon = [number, number];

export type PlaceSuggestion = {
	id: string;
	primary: string;
	secondary: string;
	coords: LatLon;
};

export type RouteStepData = {
	id: string;
	title: string;
	subtitle: string;
	isLast?: boolean;
};

export type RouteResult = {
	coordinates: LatLon[];
	distanceKm: number;
	durationMin: number;
	steps: RouteStepData[];
};

const MODIFIER_LABEL: Record<string, string> = {
	left: "Belok Kiri",
	right: "Belok Kanan",
	straight: "Lurus",
	"slight left": "Sedikit ke Kiri",
	"slight right": "Sedikit ke Kanan",
	"sharp left": "Belok Tajam Kiri",
	"sharp right": "Belok Tajam Kanan",
	uturn: "Putar Balik",
};

function describeStep(step: any, isLast: boolean): RouteStepData {
	const name = step.name || "jalan berikutnya";
	const type = step.maneuver?.type;
	const modifier = step.maneuver?.modifier;

	if (type === "depart") {
		return {
			id: "depart",
			title: "Mulai Perjalanan",
			subtitle: `Menuju ${name}`,
		};
	}
	if (type === "arrive") {
		return {
			id: "arrive",
			title: "Tiba di Tujuan",
			subtitle: "Tujuan berada di sekitar sini",
			isLast: true,
		};
	}
	if (type === "roundabout" || type === "rotary") {
		return {
			id: `${type}-${name}`,
			title: "Masuk Bundaran",
			subtitle: `Menuju ${name}`,
		};
	}

	const title = MODIFIER_LABEL[modifier] || "Lanjutkan";
	return {
		id: `${type}-${modifier}-${name}`,
		title,
		subtitle: `Ke ${name}`,
		isLast,
	};
}

export async function geocode(query: string): Promise<LatLon> {
	const results = await searchPlaces(query);
	if (!results.length) throw new Error(`Lokasi "${query}" tidak ditemukan`);
	return results[0].coords;
}

export async function searchPlaces(
	query: string,
	signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
	const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=id&q=${encodeURIComponent(
		query,
	)}`;
	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error("Gagal menghubungi layanan lokasi");

	const data = await res.json();
	return data.map((item: any) => {
		const parts = item.display_name.split(",").map((p: string) => p.trim());
		return {
			id: item.place_id.toString(),
			primary: parts[0],
			secondary: parts.slice(1, 4).join(", "),
			coords: [parseFloat(item.lat), parseFloat(item.lon)] as LatLon,
		};
	});
}

export async function getFastestRoute(
	origin: LatLon,
	destination: LatLon,
): Promise<RouteResult> {
	const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson&steps=true`;
	const res = await fetch(url);
	if (!res.ok) throw new Error("Gagal mengambil rute");

	const data = await res.json();
	if (data.code !== "Ok" || !data.routes?.length)
		throw new Error("Rute tidak ditemukan");

	const route = data.routes[0];
	const rawSteps = route.legs[0].steps;

	return {
		coordinates: route.geometry.coordinates.map((c: [number, number]) => [
			c[1],
			c[0],
		]),
		distanceKm: route.distance / 1000,
		durationMin: Math.round(route.duration / 60),
		steps: rawSteps.map((step: any, i: number) =>
			describeStep(step, i === rawSteps.length - 1),
		),
	};
}
