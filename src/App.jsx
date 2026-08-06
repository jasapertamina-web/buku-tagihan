import { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";
import { Search, Plus, X, TrendingUp, Users, Wallet, Ban, CheckCircle2, Banknote, Landmark, LogOut, Loader2 } from "lucide-react";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION = "buku-tagihan";

const NAVY = "#16324F";
const TEAL = "#2A9D8F";
const AMBER = "#E76F51";
const CREAM = "#F6F7F5";
const INK = "#1A1D23";

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  const names = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
};
const rupiah = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
const uid = () => Math.random().toString(36).slice(2, 10);

const SEED_CUSTOMERS = [
  { id: "c1", nama: "Bapak Sutrisno", daerah: "Kedopok", tagihan: 150000, status: "aktif", penagihId: "p1" },
  { id: "c2", nama: "Ibu Sari Wulandari", daerah: "Kedopok", tagihan: 150000, status: "aktif", penagihId: "p1" },
  { id: "c3", nama: "Bapak Hendra Gunawan", daerah: "Mayangan", tagihan: 200000, status: "isolir", penagihId: "p2" },
  { id: "c4", nama: "Ibu Ratna Dewi", daerah: "Mayangan", tagihan: 150000, status: "aktif", penagihId: "p2" },
  { id: "c5", nama: "Bapak Agus Salim", daerah: "Wonoasih", tagihan: 175000, status: "aktif", penagihId: "p1" },
];
const SEED_PENAGIH = [
  { id: "p1", nama: "Budi (Penagih)" },
  { id: "p2", nama: "Yanti (Penagih)" },
];

// --- Firestore helpers: satu dokumen = satu "kunci", sama seperti versi prototipe ---
async function ensureDoc(id, seedValue) {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { value: seedValue });
    return seedValue;
  }
  return snap.data().value;
}
function watchDoc(id, onChange) {
  const ref = doc(db, COLLECTION, id);
  return onSnapshot(ref, (snap) => { if (snap.exists()) onChange(snap.data().value); });
}
async function writeDoc(id, value) {
  await setDoc(doc(db, COLLECTION, id), { value });
}

function useStorage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [penagihList, setPenagihList] = useState([]);
  const [payments, setPayments] = useState({});
  const currentMonth = monthKey();

  useEffect(() => {
    let unsubs = [];
    (async () => {
      try {
        await ensureDoc("customers", SEED_CUSTOMERS);
        await ensureDoc("penagih-list", SEED_PENAGIH);
        await ensureDoc(`payments-${currentMonth}`, []);

        unsubs.push(watchDoc("customers", setCustomers));
        unsubs.push(watchDoc("penagih-list", setPenagihList));
        unsubs.push(watchDoc(`payments-${currentMonth}`, (val) =>
          setPayments((prev) => ({ ...prev, [currentMonth]: val }))
        ));
        setReady(true);
      } catch (e) {
        setError("Gagal terhubung ke database. Periksa koneksi internet dan config Firebase di src/firebaseConfig.js.");
        setReady(true);
      }
    })();
    return () => unsubs.forEach((u) => u && u());
  }, []);

  const persistCustomers = async (next) => {
    setCustomers(next);
    try { await writeDoc("customers", next); } catch { setError("Gagal menyimpan data pelanggan."); }
  };
  const persistPenagih = async (next) => {
    setPenagihList(next);
    try { await writeDoc("penagih-list", next); } catch { setError("Gagal menyimpan data penagih."); }
  };
  const persistPayments = async (monthK, next) => {
    setPayments((prev) => ({ ...prev, [monthK]: next }));
    try { await writeDoc(`payments-${monthK}`, next); } catch { setError("Gagal menyimpan data pembayaran."); }
  };

  return { ready, error, setError, customers, persistCustomers, penagihList, persistPenagih, payments, persistPayments, currentMonth };
}

function Badge({ status }) {
  const map = {
    aktif: { bg: "#E6F4F1", fg: TEAL, label: "Aktif" },
    isolir: { bg: "#FBEAE6", fg: AMBER, label: "Isolir" },
    off: { bg: "#EDEDED", fg: "#6B7280", label: "Off" },
  };
  const s = map[status] || map.aktif;
  return (
    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100 flex-1 min-w-[140px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <Icon size={16} color={accent || NAVY} />
      </div>
      <div className="text-xl font-bold" style={{ color: NAVY, fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function RoleGate({ onPick, penagihList, onCreatePenagih }) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: CREAM }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: NAVY }}>
            <Wallet color="white" size={26} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY, fontFamily: "'Sora', sans-serif" }}>Buku Tagihan</h1>
          <p className="text-sm text-gray-500 mt-1">Pilih cara masuk untuk melanjutkan</p>
        </div>

        <button
          onClick={() => onPick("admin")}
          className="w-full mb-3 rounded-2xl p-4 bg-white border border-gray-200 flex items-center gap-3 hover:border-gray-300 transition text-left"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EAF0F6" }}>
            <TrendingUp size={18} color={NAVY} />
          </div>
          <div>
            <div className="font-semibold" style={{ color: INK }}>Masuk sebagai Admin</div>
            <div className="text-xs text-gray-400">Kelola pelanggan & lihat laporan lengkap</div>
          </div>
        </button>

        <div className="rounded-2xl p-4 bg-white border border-gray-200">
          <div className="font-semibold mb-2 text-sm" style={{ color: INK }}>Masuk sebagai Penagih</div>
          <div className="space-y-2">
            {penagihList.map((p) => (
              <button key={p.id} onClick={() => onPick("penagih", p)} className="w-full text-left px-3 py-2 rounded-xl border border-gray-100 hover:border-gray-300 transition text-sm" style={{ color: INK }}>
                {p.nama}
              </button>
            ))}
          </div>
          {showNew ? (
            <div className="mt-3 flex gap-2">
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama penagih baru"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400" />
              <button onClick={() => { if (newName.trim()) { onCreatePenagih(newName.trim()); setNewName(""); setShowNew(false); } }}
                className="px-3 py-2 rounded-lg text-white text-sm font-medium" style={{ background: TEAL }}>Simpan</button>
            </div>
          ) : (
            <button onClick={() => setShowNew(true)} className="mt-3 text-xs font-medium flex items-center gap-1" style={{ color: TEAL }}>
              <Plus size={14} /> Tambah akun penagih
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerForm({ onSave, onCancel, penagihList, initial }) {
  const [form, setForm] = useState(initial || { nama: "", daerah: "", tagihan: "", status: "aktif", penagihId: penagihList[0]?.id || "" });
  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-6">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: NAVY }}>{initial ? "Ubah Pelanggan" : "Tambah Pelanggan"}</h3>
          <button onClick={onCancel}><X size={18} color="#9CA3AF" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Nama</label>
            <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Daerah</label>
            <input value={form.daerah} onChange={(e) => setForm({ ...form, daerah: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Tagihan per bulan (Rp)</label>
            <input type="number" value={form.tagihan} onChange={(e) => setForm({ ...form, tagihan: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Penagih</label>
            <select value={form.penagihId} onChange={(e) => setForm({ ...form, penagihId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-gray-400">
              {penagihList.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Status</label>
            <div className="flex gap-2 mt-1">
              {["aktif", "isolir", "off"].map((s) => (
                <button key={s} onClick={() => setForm({ ...form, status: s })}
                  className="flex-1 text-xs font-medium py-2 rounded-lg border"
                  style={form.status === s ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                  {s === "aktif" ? "Aktif" : s === "isolir" ? "Isolir" : "Off"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => onSave({ ...form, tagihan: Number(form.tagihan) || 0, id: form.id || uid() })}
          disabled={!form.nama || !form.daerah}
          className="w-full mt-5 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
          style={{ background: TEAL }}
        >
          Simpan
        </button>
      </div>
    </div>
  );
}

function PayModal({ customer, onSave, onCancel }) {
  const [jumlah, setJumlah] = useState(customer.tagihan);
  const [metode, setMetode] = useState("cash");
  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-6">
      <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: NAVY }}>Catat Pembayaran</h3>
          <button onClick={onCancel}><X size={18} color="#9CA3AF" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">{customer.nama} · {customer.daerah}</p>
        <label className="text-xs text-gray-500">Jumlah dibayar (Rp)</label>
        <input type="number" value={jumlah} onChange={(e) => setJumlah(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 mb-3 outline-none focus:border-gray-400" />
        <label className="text-xs text-gray-500">Metode</label>
        <div className="flex gap-2 mt-1 mb-5">
          <button onClick={() => setMetode("cash")} className="flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium"
            style={metode === "cash" ? { background: "#E6F4F1", borderColor: TEAL, color: TEAL } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
            <Banknote size={16} /> Cash
          </button>
          <button onClick={() => setMetode("transfer")} className="flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium"
            style={metode === "transfer" ? { background: "#EAF0F6", borderColor: NAVY, color: NAVY } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
            <Landmark size={16} /> Transfer
          </button>
        </div>
        <button onClick={() => onSave(Number(jumlah) || 0, metode)} className="w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ background: TEAL }}>
          Tandai Lunas
        </button>
      </div>
    </div>
  );
}

function AdminView({ store, onLogout }) {
  const { customers, persistCustomers, penagihList, payments, currentMonth } = store;
  const [tab, setTab] = useState("ringkasan");
  const [query, setQuery] = useState("");
  const [daerahFilter, setDaerahFilter] = useState("semua");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const monthPayments = payments[currentMonth] || [];
  const paidIds = new Set(monthPayments.map((p) => p.customerId));
  const totalCash = monthPayments.filter((p) => p.metode === "cash").reduce((s, p) => s + p.jumlah, 0);
  const totalTransfer = monthPayments.filter((p) => p.metode === "transfer").reduce((s, p) => s + p.jumlah, 0);
  const isolirCount = customers.filter((c) => c.status === "isolir" || c.status === "off").length;
  const belumBayar = customers.filter((c) => c.status === "aktif" && !paidIds.has(c.id));

  const perPenagih = useMemo(() => penagihList.map((p) => {
    const total = monthPayments.filter((pay) => pay.penagihId === p.id).reduce((s, pay) => s + pay.jumlah, 0);
    return { ...p, total };
  }), [penagihList, monthPayments]);

  const daerahList = useMemo(() => [...new Set(customers.map((c) => c.daerah).filter(Boolean))].sort(), [customers]);
  const filtered = customers
    .filter((c) => (c.nama + c.daerah).toLowerCase().includes(query.toLowerCase()))
    .filter((c) => daerahFilter === "semua" || c.daerah === daerahFilter);

  const saveCustomer = (c) => {
    const next = editing ? customers.map((x) => (x.id === c.id ? c : x)) : [...customers, c];
    persistCustomers(next);
    setShowForm(false); setEditing(null);
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: CREAM }}>
      <div className="px-5 pt-5 pb-4 sticky top-0 z-10" style={{ background: NAVY }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white/60 text-xs">Panel Admin · {monthLabel(currentMonth)}</div>
            <div className="text-white font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>Buku Tagihan</div>
          </div>
          <button onClick={onLogout} className="text-white/70"><LogOut size={18} /></button>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {[["ringkasan","Ringkasan"],["pelanggan","Pelanggan"],["penagih","Kinerja Penagih"],["isolir","Isolir/Off"]].map(([k,label]) => (
            <button key={k} onClick={() => setTab(k)} className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={tab === k ? { background: "white", color: NAVY } : { background: "rgba(255,255,255,0.12)", color: "white" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {tab === "ringkasan" && (
          <>
            <div className="flex gap-3 flex-wrap mb-3">
              <StatCard icon={Users} label="Total Pelanggan" value={customers.length} />
              <StatCard icon={Wallet} label="Pendapatan Bulan Ini" value={rupiah(totalCash + totalTransfer)} accent={TEAL} />
              <StatCard icon={Ban} label="Isolir / Off" value={isolirCount} accent={AMBER} />
            </div>
            <div className="flex gap-3 flex-wrap mb-3">
              <StatCard icon={Banknote} label="Total Cash" value={rupiah(totalCash)} sub={`${monthPayments.filter(p=>p.metode==='cash').length} transaksi`} />
              <StatCard icon={Landmark} label="Total Transfer" value={rupiah(totalTransfer)} sub={`${monthPayments.filter(p=>p.metode==='transfer').length} transaksi`} />
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 p-4 mt-2">
              <div className="font-semibold text-sm mb-3" style={{ color: NAVY }}>Belum bayar bulan ini ({belumBayar.length})</div>
              {belumBayar.length === 0 ? (
                <p className="text-xs text-gray-400">Semua pelanggan aktif sudah bayar bulan ini.</p>
              ) : belumBayar.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium" style={{ color: INK }}>{c.nama}</div>
                    <div className="text-xs text-gray-400">{c.daerah}</div>
                  </div>
                  <div className="text-xs font-mono" style={{ color: AMBER }}>{rupiah(c.tagihan)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "pelanggan" && (
          <>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3">
                <Search size={15} color="#9CA3AF" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama / daerah" className="flex-1 py-2.5 text-sm outline-none" />
              </div>
              <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: TEAL }}>
                <Plus size={18} />
              </button>
            </div>
            <div className="flex gap-2 mb-3 overflow-x-auto">
              <button onClick={() => setDaerahFilter("semua")} className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border"
                style={daerahFilter === "semua" ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                Semua daerah
              </button>
              {daerahList.map((d) => (
                <button key={d} onClick={() => setDaerahFilter(d)} className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border"
                  style={daerahFilter === d ? { background: NAVY, color: "white", borderColor: NAVY } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                  {d}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => { setEditing(c); setShowForm(true); }} className="w-full text-left rounded-xl bg-white border border-gray-100 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: INK }}>{c.nama}</div>
                    <div className="text-xs text-gray-400">{c.daerah} · {rupiah(c.tagihan)}/bln</div>
                  </div>
                  <Badge status={c.status} />
                </button>
              ))}
              {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Tidak ada pelanggan ditemukan.</p>}
            </div>
          </>
        )}

        {tab === "penagih" && (
          <div className="space-y-2">
            {perPenagih.map((p) => (
              <div key={p.id} className="rounded-xl bg-white border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: INK }}>{p.nama}</div>
                  <div className="text-xs text-gray-400">{customers.filter(c=>c.penagihId===p.id).length} pelanggan ditugaskan</div>
                </div>
                <div className="text-sm font-mono font-semibold" style={{ color: TEAL }}>{rupiah(p.total)}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "isolir" && (
          <div className="space-y-2">
            {customers.filter((c) => c.status === "isolir" || c.status === "off").map((c) => (
              <button key={c.id} onClick={() => { setEditing(c); setShowForm(true); }} className="w-full text-left rounded-xl bg-white border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: INK }}>{c.nama}</div>
                  <div className="text-xs text-gray-400">{c.daerah}</div>
                </div>
                <Badge status={c.status} />
              </button>
            ))}
            {customers.filter((c) => c.status === "isolir" || c.status === "off").length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">Tidak ada pelanggan isolir/off.</p>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          initial={editing}
          penagihList={penagihList}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSave={saveCustomer}
        />
      )}
    </div>
  );
}

function PenagihView({ store, me, onLogout }) {
  const { customers, payments, persistPayments, currentMonth } = store;
  const [payTarget, setPayTarget] = useState(null);
  const mine = customers.filter((c) => c.penagihId === me.id);
  const monthPayments = payments[currentMonth] || [];
  const paidMap = new Map(monthPayments.filter(p=>p.penagihId===me.id).map((p) => [p.customerId, p]));
  const totalKu = [...paidMap.values()].reduce((s, p) => s + p.jumlah, 0);

  const savePayment = (jumlah, metode) => {
    const next = [...monthPayments.filter((p) => p.customerId !== payTarget.id), { customerId: payTarget.id, jumlah, metode, tanggal: new Date().toISOString(), penagihId: me.id }];
    persistPayments(currentMonth, next);
    setPayTarget(null);
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: CREAM }}>
      <div className="px-5 pt-5 pb-4 sticky top-0 z-10" style={{ background: NAVY }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white/60 text-xs">{monthLabel(currentMonth)}</div>
            <div className="text-white font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>{me.nama}</div>
          </div>
          <button onClick={onLogout} className="text-white/70"><LogOut size={18} /></button>
        </div>
        <div className="mt-4 rounded-2xl bg-white/10 p-3 flex items-center justify-between">
          <span className="text-white/80 text-xs">Total tertagih bulan ini</span>
          <span className="text-white font-mono font-semibold">{rupiah(totalKu)}</span>
        </div>
      </div>

      <div className="p-5 space-y-2">
        {mine.map((c) => {
          const paid = paidMap.get(c.id);
          return (
            <div key={c.id} className="rounded-xl bg-white border border-gray-100 p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium flex items-center gap-2" style={{ color: INK }}>
                  {c.nama} {c.status !== "aktif" && <Badge status={c.status} />}
                </div>
                <div className="text-xs text-gray-400">{c.daerah} · {rupiah(c.tagihan)}/bln</div>
              </div>
              {paid ? (
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: TEAL }}>
                  <CheckCircle2 size={14} /> {paid.metode === "cash" ? "Cash" : "Transfer"}
                </span>
              ) : (
                <button onClick={() => setPayTarget(c)} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: NAVY }}>
                  Tandai Bayar
                </button>
              )}
            </div>
          );
        })}
        {mine.length === 0 && <p className="text-xs text-gray-400 text-center py-10">Belum ada pelanggan yang ditugaskan ke Anda.</p>}
      </div>

      {payTarget && <PayModal customer={payTarget} onCancel={() => setPayTarget(null)} onSave={savePayment} />}
    </div>
  );
}

export default function App() {
  const store = useStorage();
  const [session, setSession] = useState(null);

  const handlePick = (role, me) => setSession({ role, me });
  const handleCreatePenagih = async (nama) => {
    const p = { id: uid(), nama };
    const next = [...store.penagihList, p];
    await store.persistPenagih(next);
    setSession({ role: "penagih", me: p });
  };

  if (!store.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <Loader2 className="animate-spin" color={NAVY} size={28} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {store.error && (
        <div className="text-xs text-white text-center py-2 px-3" style={{ background: AMBER }}>{store.error}</div>
      )}
      {!session && <RoleGate onPick={handlePick} penagihList={store.penagihList} onCreatePenagih={handleCreatePenagih} />}
      {session?.role === "admin" && <AdminView store={store} onLogout={() => setSession(null)} />}
      {session?.role === "penagih" && <PenagihView store={store} me={session.me} onLogout={() => setSession(null)} />}
    </div>
  );
}
