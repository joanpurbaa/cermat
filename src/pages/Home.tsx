import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Search,
	Navigation as NavIcon,
	AlertTriangle,
	Video,
	Compass,
	Clock,
	MapPin,
	ChevronRight,
	SlidersHorizontal,
} from "lucide-react";

export default function Home() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		navigate("/navigasi");
	};

	return (
		<div className="w-full h-full bg-slate-50 px-5 pt-2 pb-6">
			{/* HEADER SECTION */}
			<div className="flex items-center justify-between mb-4 mt-1">
				<div>
					<p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
						Selamat datang
					</p>
					<h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
						Mau ke mana hari ini?
					</h1>
				</div>
			</div>

			<div className="mb-5">
				<div
					onClick={() => navigate("/navigasi")}
					className="relative overflow-hidden rounded-2xl shadow-sm bg-blue-600 cursor-pointer active:scale-[0.98] transition-transform">
					<img
						src="/banner.png"
						alt="Promo Banner"
						className="w-full h-auto object-cover block"
						onError={(e) => {
							const target = e.currentTarget;
							target.style.display = "none";
							const fallback = target.nextElementSibling as HTMLElement;
							if (fallback) fallback.style.display = "flex";
						}}
					/>
					<div className="hidden min-h-[120px] w-full items-center justify-between p-4 text-white bg-gradient-to-r from-blue-700 to-indigo-600">
						<div className="max-w-[70%]">
							<span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
								Rute Pintar
							</span>
							<h3 className="text-base font-bold mt-1">Nyetir Bebas Banjir & Macet</h3>
						</div>
					</div>
				</div>
			</div>

			{/* SEARCH BAR */}
			<form onSubmit={handleSearchSubmit} className="relative mb-5">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					onClick={() => navigate("/navigasi")}
					placeholder="Cari rute, tujuan, atau area..."
					className="w-full rounded-2xl bg-white py-3.5 pl-11 pr-11 text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm border border-slate-100 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 active:scale-[0.99]"
				/>
				<Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
				<button
					type="button"
					onClick={() => navigate("/navigasi")}
					className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 active:scale-95">
					<SlidersHorizontal size={18} />
				</button>
			</form>

			{/* BANNER SECTION */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
						Fitur Utama
					</h2>
				</div>
				<div className="grid grid-cols-4 gap-3">
					<button
						onClick={() => navigate("/navigasi")}
						className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-sm border border-slate-100/80 active:scale-95 transition-all">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
							<NavIcon size={22} />
						</div>
						<span className="text-[11px] font-bold text-slate-700">Rute Aman</span>
					</button>

					<button
						onClick={() => navigate("/navigasi")}
						className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-sm border border-slate-100/80 active:scale-95 transition-all">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
							<AlertTriangle size={22} />
						</div>
						<span className="text-[11px] font-bold text-slate-700">Info Banjir</span>
					</button>

					<button
						onClick={() => navigate("/navigasi")}
						className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-sm border border-slate-100/80 active:scale-95 transition-all">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
							<Video size={22} />
						</div>
						<span className="text-[11px] font-bold text-slate-700">CCTV Live</span>
					</button>

					<button
						onClick={() => navigate("/navigasi")}
						className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-sm border border-slate-100/80 active:scale-95 transition-all">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
							<Compass size={22} />
						</div>
						<span className="text-[11px] font-bold text-slate-700">Jelajah</span>
					</button>
				</div>
			</div>

			{/* RECENT DESTINATIONS LIST */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
						Terakhir Dikunjungi
					</h2>
					<button
						onClick={() => navigate("/navigasi")}
						className="text-xs font-bold text-blue-600 active:opacity-70">
						Lihat Semua
					</button>
				</div>

				<div className="space-y-2.5">
					<div
						onClick={() => navigate("/navigasi")}
						className="flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-sm border border-slate-100/80 cursor-pointer active:scale-[0.98] transition-transform">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
								<Clock size={18} />
							</div>
							<div>
								<h4 className="text-sm font-bold text-slate-800">Tugu Muda Semarang</h4>
								<p className="text-xs font-medium text-slate-400">
									Sekayu, Semarang Tengah
								</p>
							</div>
						</div>
						<ChevronRight size={18} className="text-slate-300" />
					</div>

					<div
						onClick={() => navigate("/navigasi")}
						className="flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-sm border border-slate-100/80 cursor-pointer active:scale-[0.98] transition-transform">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
								<MapPin size={18} />
							</div>
							<div>
								<h4 className="text-sm font-bold text-slate-800">Indraprasta</h4>
								<p className="text-xs font-medium text-slate-400">
									Jl. Indraprasta No.107, Semarang
								</p>
							</div>
						</div>
						<ChevronRight size={18} className="text-slate-300" />
					</div>
				</div>
			</div>
		</div>
	);
}
