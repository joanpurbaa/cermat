import {
	ShieldCheck,
	Car,
	Settings,
	Bell,
	ChevronRight,
	LogOut,
	MapPin,
	Clock,
} from "lucide-react";

export default function Profile() {
	const user = {
		name: "Pratama Wijaya",
		email: "pratama.wijaya@gmail.com",
		avatar:
			"https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
		role: "Pengemudi Aktif",
		vehicle: "Honda HR-V (H 1234 AB)",
	};

	const historyData = [
		{
			id: 1,
			from: "Tugu Muda Semar...",
			to: "Indraprasta",
			date: "Hari Ini, 14:20",
			status: "Bebas Banjir",
		},
		{
			id: 2,
			from: "Lawang Sewu",
			to: "Pollux Paragon Mall",
			date: "Kemarin, 09:15",
			status: "1 Titik Banjir Terhindari",
		},
	];

	return (
		<div className="min-h-full bg-slate-50 pb-6 text-slate-800">
			{/* HEADER PROFIL */}
			<div className="bg-blue-600 pt-2 pb-6 px-5 text-white rounded-b-[32px] shadow-sm">
				<div className="flex items-center gap-3.5">
					<div className="relative">
						<img
							src={user.avatar}
							alt={user.name}
							className="w-14 h-14 rounded-full border-2 border-white/80 object-cover shadow-sm"
						/>
						<span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
					</div>

					<div className="flex-1 min-w-0">
						<h2 className="text-base font-extrabold truncate">{user.name}</h2>
						<p className="text-[11px] text-blue-100 truncate">{user.email}</p>

						<div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white">
							<ShieldCheck size={11} />
							{user.role}
						</div>
					</div>
				</div>
			</div>

			{/* KONTEN UTAMA */}
			<div className="px-5 mt-5 space-y-5">
				{/* KENDARAAN TERDAFTAR */}
				<div>
					<p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
						Kendaraan Terdaftar
					</p>
					<div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-xl bg-blue-50 text-blue-600">
								<Car size={18} />
							</div>
							<div>
								<h4 className="text-xs font-extrabold text-slate-800">
									{user.vehicle}
								</h4>
								<p className="text-[10px] text-slate-400">
									Ground Clearance: High (200mm)
								</p>
							</div>
						</div>
						<ChevronRight size={16} className="text-slate-400" />
					</div>
				</div>

				{/* RIWAYAT RUTE */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
							Riwayat Rute
						</p>
						<span className="text-[10px] font-bold text-blue-600 cursor-pointer">
							Lihat Semua
						</span>
					</div>

					<div className="space-y-2">
						{historyData.map((item) => (
							<div
								key={item.id}
								className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
								<div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
									<MapPin size={13} className="text-blue-600 shrink-0" />
									<span>{item.from}</span>
									<span className="text-slate-400">→</span>
									<span>{item.to}</span>
								</div>

								<div className="flex items-center justify-between pt-1.5 border-t border-slate-50 text-[10px]">
									<span className="flex items-center gap-1 text-slate-400">
										<Clock size={11} /> {item.date}
									</span>
									<span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
										{item.status}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* PENGATURAN APLIKASI */}
				<div>
					<p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
						Pengaturan Aplikasi
					</p>
					<div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
						<button className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
							<div className="flex items-center gap-2.5">
								<Bell size={15} className="text-slate-500" />
								<span className="text-xs font-bold text-slate-700">
									Notifikasi Peringatan Banjir
								</span>
							</div>
							<ChevronRight size={15} className="text-slate-400" />
						</button>

						<button className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
							<div className="flex items-center gap-2.5">
								<Settings size={15} className="text-slate-500" />
								<span className="text-xs font-bold text-slate-700">
									Preferensi Navigasi AI
								</span>
							</div>
							<ChevronRight size={15} className="text-slate-400" />
						</button>

						<button className="w-full px-3.5 py-3 flex items-center justify-between text-left text-rose-600 hover:bg-rose-50/50 transition-colors">
							<div className="flex items-center gap-2.5">
								<LogOut size={15} />
								<span className="text-xs font-bold">Keluar Akun</span>
							</div>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
