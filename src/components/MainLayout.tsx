import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
	ShieldCheck,
	Video,
	Navigation2,
	Cpu,
	Sparkles,
	Compass,
	MapPin,
	User as UserIcon,
	Wifi,
	Battery,
} from "lucide-react";

export default function MainLayout() {
	const navigate = useNavigate();
	const location = useLocation();

	// Preset rute ter-training
	const demoRoutes = [
		{
			id: 1,
			title: "Rute 1: Tugu Muda → Indraprasta",
			origin: {
				name: "Tugu Muda Semarang",
				coords: [-6.984, 110.409] as [number, number],
			},
			destination: {
				name: "Indraprasta",
				coords: [-6.978, 110.404] as [number, number],
			},
			tag: "Model AI Optimized",
			description: "Titik CCTV: perempatan Sadewa & Indraprasta.",
		},
		{
			id: 2,
			title: "Rute 2: Lawang Sewu → Paragon Mall",
			origin: {
				name: "Lawang Sewu",
				coords: [-6.9839, 110.4104] as [number, number],
			},
			destination: {
				name: "Pollux Paragon Mall",
				coords: [-6.98, 110.4147] as [number, number],
			},
			tag: "CCTV Active",
			description: "Titik CCTV: sepanjang Jl. Pemuda depan Paragon.",
		},
		{
			id: 3,
			title: "Rute 3: Metro Johar → Pemuda Gajah Mada",
			origin: {
				name: "Metro Johar",
				coords: [-6.9744, 110.4242] as [number, number],
			},
			destination: {
				name: "Pemuda Gajah Mada",
				coords: [-6.9805, 110.4225] as [number, number],
			},
			tag: "Multi-Risk Avoidance",
			description: "Titik CCTV: kawasan Johar & Gajah Mada.",
		},
	];

	const handleSelectPreset = (origin: any, destination: any) => {
		navigate("/navigasi");
		setTimeout(() => {
			window.dispatchEvent(
				new CustomEvent("SELECT_PRESET_ROUTE", {
					detail: { origin, destination },
				}),
			);
		}, 100);
	};

	const navItems = [
		{ path: "/", label: "Beranda", icon: Compass },
		{ path: "/navigasi", label: "Navigasi", icon: MapPin },
		{ path: "/profil", label: "Profil", icon: UserIcon },
	];

	return (
		<div className="min-h-screen w-full bg-[#0B0F17] text-white flex items-center justify-center p-4 lg:p-8 font-sans overflow-x-hidden relative">
			{/* Background Glow Effect */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

			{/* 3-COLUMN LAYOUT CONTAINER */}
			<div className="w-full max-w-[1440px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
				{/* ----------------- PANEL KIRI: INFO APLIKASI ----------------- */}
				<div className="lg:col-span-4 flex flex-col gap-6 pr-0 lg:pr-4">
					<div>
						<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-3">
							<Cpu size={14} className="animate-pulse" /> Prototipe Riset
						</div>
						<h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
							Semarang <span className="text-blue-500">Vision AI</span>
						</h1>
						<p className="mt-2 text-sm text-slate-400 leading-relaxed">
							Kami menghitung rute dengan mempertimbangkan titik kejadian anomali yang terdeteksi
							dari kamera CCTV kota, lalu memberi bukti visual langsung — bukan cuma
							perkiraan.
						</p>
					</div>

					<div className="space-y-4 my-2">
						<div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
							<div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 shrink-0">
								<ShieldCheck size={20} />
							</div>
							<div>
								<h4 className="text-xs font-bold text-slate-200">
									Skoring risiko per rute
								</h4>
								<p className="text-[11px] text-slate-400 mt-0.5">
									Tiap alternatif rute dinilai dari titik banjir yang kena, lalu
									diurutkan dari yang paling aman.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
							<div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
								<Video size={20} />
							</div>
							<div>
								<h4 className="text-xs font-bold text-slate-200">
									CCTV asli, bukan ilustrasi
								</h4>
								<p className="text-[11px] text-slate-400 mt-0.5">
									Klaim "ada banjir" bisa langsung dicek lewat stream CCTV kota di titik
									yang sama — bukan cuma teks di layar.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
							<div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
								<Navigation2 size={20} />
							</div>
							<div>
								<h4 className="text-xs font-bold text-slate-200">
									Panduan arah per belokan
								</h4>
								<p className="text-[11px] text-slate-400 mt-0.5">
									Instruksi belok kiri/kanan mengikuti jalur yang sama dengan rute yang
									sudah dihitung, bukan rute generik terpisah.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* ----------------- PANEL TENGAH: FRAME HP & OUTLET ----------------- */}
				<div className="lg:col-span-4 flex justify-center items-center py-2">
					{/* MOCKUP FRAME HP GLOBAL */}
					<div className="relative w-[380px] h-[780px] bg-[#0c1322] rounded-[50px] p-3 shadow-2xl border-4 border-slate-700/80 flex flex-col justify-between">
						{/* HARDWARE BUTTONS */}
						<div className="absolute -left-[7px] top-28 h-10 w-[3px] rounded-l-md bg-slate-700" />
						<div className="absolute -left-[7px] top-42 h-12 w-[3px] rounded-l-md bg-slate-700" />
						<div className="absolute -right-[7px] top-32 h-16 w-[3px] rounded-r-md bg-slate-700" />

						{/* SCREEN INNER CONTAINER */}
						<div className="relative w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col justify-between">
							{/* DYNAMIC ISLAND / NOTCH */}
							<div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-50 flex items-center justify-end px-2 gap-1.5 pointer-events-none">
								<div className="w-2 h-2 rounded-full bg-[#111]" />
								<div className="w-1.5 h-1.5 rounded-full bg-blue-900/40" />
							</div>

							{/* TOP STATUS BAR */}
							<div className="pt-3 px-7 pb-1 flex justify-between items-center text-xs font-semibold text-slate-800 bg-transparent z-40">
								<span>9:41</span>
								<div className="flex items-center gap-1.5">
									<Wifi size={12} />
									<Battery size={14} />
								</div>
							</div>

							{/* SCROLLABLE PAGE CONTENT (Home, Navigasi, Profil dirender di sini) */}
							<div className="flex-1 w-full overflow-y-auto no-scrollbar relative">
								<Outlet />
							</div>

							{/* BOTTOM NAVBAR HP GLOBAL */}
							<nav className="h-14 bg-white border-t border-slate-100 px-8 flex items-center justify-between z-50 shrink-0">
								{navItems.map((item) => {
									const Icon = item.icon;
									const isActive = location.pathname === item.path;

									return (
										<button
											key={item.path}
											onClick={() => navigate(item.path)}
											className={`flex flex-col items-center gap-0.5 transition-colors ${
												isActive
													? "text-blue-600 font-bold"
													: "text-slate-400 hover:text-slate-600"
											}`}>
											<Icon
												size={18}
												className={isActive ? "stroke-[2.5]" : "stroke-[1.75]"}
											/>
											<span className="text-[9px]">{item.label}</span>
										</button>
									);
								})}
							</nav>
						</div>
					</div>
				</div>

				{/* ----------------- PANEL KANAN: PRESET DEMO RUTE ----------------- */}
				<div className="lg:col-span-4 flex flex-col gap-5 pl-0 lg:pl-4">
					<div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 backdrop-blur-md">
						<div className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-1">
							<Sparkles size={16} /> Kenapa cuma 3 rute?
						</div>
						<p className="text-xs text-slate-300 leading-relaxed">
							Pendeteksi anomali di jalan raya kami baru divalidasi di titik-titik CCTV berikut. Di
							luar rute ini, sistem tetap jalan tapi belum tervalidasi seakurat 3 rute
							demo ini.
						</p>
					</div>

					<div className="space-y-3">
						<p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
							Rute yang sudah tervalidasi
						</p>

						{demoRoutes.map((route) => (
							<div
								key={route.id}
								onClick={() => handleSelectPreset(route.origin, route.destination)}
								className="group cursor-pointer p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-200 active:scale-[0.98]">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
										{route.title}
									</span>
								</div>

								<p className="text-[11px] text-slate-400 line-clamp-1">
									{route.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
