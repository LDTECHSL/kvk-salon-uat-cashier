import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
    Armchair,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Edit3,
    FileText,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    X,
} from "lucide-react";
import { createPortal } from "react-dom";
import Alert from "@/components/ui/alert";
import {
    createSalonSeat,
    deleteSalonSeat,
    getSalonSeatList,
    updateSalonSeat,
} from "@/services/salon-seat-api";

interface SeatForm {
    name: string;
    description: string;
}

interface SeatRecord extends SeatForm {
    id: string;
    isActive: boolean;
}

type AlertState = {
    visible: boolean;
    variant: "success" | "error" | "warning";
    title: string;
    description: string;
};

const initialForm: SeatForm = { name: "", description: "" };

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
    typeof value === "object" && value !== null ? (value as JsonRecord) : {};

const extractSeatData = (response: unknown): JsonRecord[] => {
    const responseRecord = asRecord(response);
    const data =
        asRecord(responseRecord.additionalData).response ??
        responseRecord.response ??
        response;

    if (Array.isArray(data)) return data.map(asRecord);

    const dataRecord = asRecord(data);
    if (Array.isArray(dataRecord.data)) return dataRecord.data.map(asRecord);
    if (Array.isArray(dataRecord.results)) return dataRecord.results.map(asRecord);

    return [];
};

const mapSeat = (seat: JsonRecord): SeatRecord => ({
    id: String(seat.id ?? seat.seatId ?? seat.salonId),
    name: typeof seat.name === "string" ? seat.name : "",
    description: typeof seat.description === "string" ? seat.description : "",
    isActive: Boolean(seat.isActive),
});

export default function SeatPage() {
    const [seats, setSeats] = useState<SeatRecord[]>([]);
    const [form, setForm] = useState<SeatForm>(initialForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingSeat, setDeletingSeat] = useState<SeatRecord | null>(null);
    const [pageAlert, setPageAlert] = useState<AlertState>({
        visible: false,
        variant: "success",
        title: "",
        description: "",
    });

    const showAlert = (alert: Omit<AlertState, "visible">) =>
        setPageAlert({ ...alert, visible: true });

    const loadSeats = async () => {
        try {
            setIsLoading(true);
            const response = await getSalonSeatList();
            setSeats(extractSeatData(response).map(mapSeat));
        } catch (error) {
            console.error("Failed to load salon seats:", error);
            setSeats([]);
            showAlert({
                variant: "error",
                title: "Unable to load seats",
                description: "Please refresh the page and try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadSeats();
    }, []);

    const filteredSeats = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return seats;

        return seats.filter((seat) =>
            [seat.name, seat.description].some((value) =>
                value.toLowerCase().includes(query),
            ),
        );
    }, [search, seats]);

    const totalPages = Math.max(1, Math.ceil(filteredSeats.length / itemsPerPage));
    const paginatedSeats = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredSeats.slice(start, start + itemsPerPage);
    }, [currentPage, filteredSeats, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const activeSeatCount = seats.filter((seat) => seat.isActive).length;
    const inactiveSeatCount = seats.length - activeSeatCount;
    const showingFrom = filteredSeats.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const showingTo = Math.min(currentPage * itemsPerPage, filteredSeats.length);

    const openAddForm = () => {
        setEditingId(null);
        setForm(initialForm);
        setIsFormOpen(true);
    };

    const openEditForm = (seat: SeatRecord) => {
        setEditingId(seat.id);
        setForm({ name: seat.name, description: seat.description });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        if (isSubmitting) return;
        setIsFormOpen(false);
        setEditingId(null);
        setForm(initialForm);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = {
            id: editingId,
            name: form.name.trim(),
            description: form.description.trim(),
            isActive: true,
        };

        if (!payload.name) {
            showAlert({
                variant: "warning",
                title: "Seat name is required",
                description: "Please enter a name for this salon seat.",
            });
            return;
        }

        try {
            setIsSubmitting(true);
            if (editingId) {
                await updateSalonSeat(editingId, payload);
                showAlert({
                    variant: "success",
                    title: "Seat updated",
                    description: `${payload.name} was updated successfully.`,
                });
            } else {
                await createSalonSeat(payload);
                showAlert({
                    variant: "success",
                    title: "Seat added",
                    description: `${payload.name} is now active in the salon.`,
                });
            }
            closeForm();
            await loadSeats();
        } catch (error) {
            console.error("Failed to save salon seat:", error);
            showAlert({
                variant: "error",
                title: "Unable to save seat",
                description: "Please check the details and try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (seat: SeatRecord) => {
        try {
            setDeletingId(seat.id);
            await deleteSalonSeat(seat.id);
            setSeats((current) => current.filter((item) => item.id !== seat.id));
            showAlert({
                variant: "success",
                title: "Seat deleted",
                description: `${seat.name} was removed from the seat list.`,
            });
        } catch (error) {
            console.error("Failed to delete salon seat:", error);
            showAlert({
                variant: "error",
                title: "Unable to delete seat",
                description: "Please try again.",
            });
        } finally {
            setDeletingId(null);
            setDeletingSeat(null);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50/60">
            {pageAlert.visible && (
                <div className="fixed right-4 top-4 z-[99999] w-[calc(100%-2rem)] max-w-md">
                    <Alert
                        variant={pageAlert.variant}
                        title={pageAlert.title}
                        description={pageAlert.description}
                        onClose={() => setPageAlert((current) => ({ ...current, visible: false }))}
                    />
                </div>
            )}

            {(isLoading || isSubmitting) &&
                createPortal(
                    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                            <p className="text-sm font-semibold text-white">
                                {isSubmitting ? "Saving seat details..." : "Loading seats..."}
                            </p>
                        </div>
                    </div>,
                    document.body,
                )}

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-lg shadow-purple-300/30">
                            <Armchair size={21} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Seat Maintenance</h1>
                            <p className="text-sm text-slate-500">Add and manage the seats available across KVK Salon.</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="button" onClick={loadSeats} disabled={isLoading} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50">
                            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button type="button" onClick={openAddForm} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 text-sm font-semibold text-white shadow-lg shadow-purple-300/30 transition hover:from-[#8B5CF6] hover:to-[#6D28D9]">
                            <Plus size={17} /> Add Seat
                        </button>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <SummaryCard title="Total Seats" value={String(seats.length)} icon={<Armchair size={20} />} iconClassName="bg-purple-50 text-purple-700" />
                    <SummaryCard title="Active Seats" value={String(activeSeatCount)} icon={<CheckCircle2 size={20} />} iconClassName="bg-emerald-50 text-emerald-600" />
                    <SummaryCard title="Inactive Seats" value={String(inactiveSeatCount)} icon={<ShieldCheck size={20} />} iconClassName="bg-slate-100 text-slate-600" />
                </div>

                <section className="overflow-visible rounded-2xl border border-purple-100 bg-white shadow-[0_12px_35px_rgba(91,33,182,0.07)]">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Seat Directory</h2>
                            <p className="mt-1 text-sm text-slate-500">{filteredSeats.length} seat{filteredSeats.length === 1 ? "" : "s"} found.</p>
                        </div>
                        <div className="relative w-full sm:max-w-md">
                            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                            <input type="text" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Search name or description..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10" />
                        </div>
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[700px]">
                            <thead><tr className="border-b border-slate-200 bg-slate-50/80"><TableHeading>Seat</TableHeading><TableHeading>Description</TableHeading><TableHeading>Status</TableHeading><th className="w-28 px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {!isLoading && paginatedSeats.length > 0 ? paginatedSeats.map((seat) => <SeatRow key={seat.id} seat={seat} deletingId={deletingId} onEdit={openEditForm} onDelete={setDeletingSeat} />) : <tr><td colSpan={4}><EmptyState hasSearch={Boolean(search.trim())} onAdd={openAddForm} /></td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div className="divide-y divide-slate-100 md:hidden">
                        {!isLoading && paginatedSeats.length > 0 ? paginatedSeats.map((seat) => <article key={seat.id} className="p-4 transition hover:bg-purple-50/20"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><Armchair size={19} /></div><div className="min-w-0"><p className="truncate font-bold text-slate-900">{seat.name || "N/A"}</p><p className="mt-0.5 truncate text-xs text-slate-500">{seat.description || "No description"}</p></div></div><StatusBadge isActive={seat.isActive} /></div><div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p><p className="mt-1 text-sm font-semibold text-slate-700">{seat.description || "-"}</p></div><div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4"><ActionButton label="Edit" icon={<Edit3 size={14} />} onClick={() => openEditForm(seat)} /><ActionButton label="Delete" icon={deletingId === seat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} onClick={() => setDeletingSeat(seat)} danger disabled={deletingId === seat.id} /></div></article>) : <EmptyState hasSearch={Boolean(search.trim())} onAdd={openAddForm} />}
                    </div>

                    {!isLoading && filteredSeats.length > 0 && <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"><p className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-700">{showingFrom}</span> to <span className="font-semibold text-slate-700">{showingTo}</span> of <span className="font-semibold text-slate-700">{filteredSeats.length}</span> seats</p><div className="flex items-center gap-2"><label htmlFor="seat-page-size" className="text-xs font-medium text-slate-500">Rows:</label><select id="seat-page-size" value={itemsPerPage} onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1); }} className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></div></div><div className="flex items-center justify-between gap-2 sm:justify-end"><button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1} className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /><span className="hidden sm:inline">Previous</span></button><span className="min-w-16 text-center text-sm font-semibold text-slate-600">{currentPage} / {totalPages}</span><button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages} className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"><span className="hidden sm:inline">Next</span><ChevronRight size={16} /></button></div></div>}
                </section>
            </div>

            {isFormOpen && createPortal(<SeatFormModal editingId={editingId} form={form} isSubmitting={isSubmitting} setForm={setForm} onClose={closeForm} onSubmit={handleSubmit} />, document.body)}
            {deletingSeat && createPortal(<DeleteModal seat={deletingSeat} isSubmitting={deletingId === deletingSeat.id} onClose={() => { if (!deletingId) setDeletingSeat(null); }} onDelete={() => void handleDelete(deletingSeat)} />, document.body)}
        </main>
    );
}

function SummaryCard({ title, value, icon, iconClassName }: { title: string; value: string; icon: React.ReactNode; iconClassName: string }) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>{icon}</div></div></div>;
}

function TableHeading({ children }: { children: React.ReactNode }) { return <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</th>; }

function StatusBadge({ isActive }: { isActive: boolean }) { return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{isActive && <CheckCircle2 size={13} />}{isActive ? "Active" : "Inactive"}</span>; }

function SeatRow({ seat, deletingId, onEdit, onDelete }: { seat: SeatRecord; deletingId: string | null; onEdit: (seat: SeatRecord) => void; onDelete: (seat: SeatRecord) => void }) {
    return <tr className="transition hover:bg-purple-50/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><Armchair size={18} /></div><div><p className="text-sm font-bold text-slate-900">{seat.name || "N/A"}</p><p className="mt-0.5 text-xs text-slate-400">Seat ID: {seat.id}</p></div></div></td><td className="max-w-sm px-5 py-4"><div className="flex items-center gap-2 text-sm text-slate-600"><FileText size={15} className="shrink-0 text-purple-400" /><span className="truncate">{seat.description || "-"}</span></div></td><td className="px-5 py-4"><StatusBadge isActive={seat.isActive} /></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => onEdit(seat)} title="Edit seat" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-purple-100 bg-white text-purple-600 transition hover:border-purple-300 hover:bg-purple-50"><Edit3 size={16} /></button><button type="button" onClick={() => onDelete(seat)} disabled={deletingId === seat.id} title="Delete seat" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50">{deletingId === seat.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></div></td></tr>;
}

function ActionButton({ label, icon, onClick, danger = false, disabled = false }: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-xs font-semibold transition disabled:opacity-50 ${danger ? "border-red-100 text-red-600 hover:bg-red-50" : "border-purple-100 text-purple-700 hover:bg-purple-50"}`}>{icon}{label}</button>; }

function SeatFormModal({ editingId, form, isSubmitting, setForm, onClose, onSubmit }: { editingId: string | null; form: SeatForm; isSubmitting: boolean; setForm: React.Dispatch<React.SetStateAction<SeatForm>>; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
    return <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}><div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-lg shadow-purple-300/30">{editingId ? <Edit3 size={20} /> : <Armchair size={20} />}</div><div><h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit Seat" : "Add Seat"}</h2><p className="mt-0.5 text-sm text-slate-500">{editingId ? "Update the seat details." : "Create a new active salon seat."}</p></div></div><button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close form" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"><X size={19} /></button></div><div className="overflow-y-auto p-5 sm:p-6"><form className="space-y-5" onSubmit={onSubmit}><FormInput id="seat-name" label="Seat Name" value={form.name} placeholder="e.g. Seat 01" icon={<Armchair size={17} />} onChange={(value) => setForm((current) => ({ ...current, name: value }))} /><div><label htmlFor="seat-description" className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label><div className="relative"><FileText size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-purple-400" /><textarea id="seat-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe this salon seat" rows={4} className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10" /></div></div><div className="flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50/70 p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700"><ShieldCheck size={17} /></div><div><p className="text-sm font-semibold text-purple-900">Seat Status</p><p className="mt-0.5 text-xs leading-5 text-purple-700">New and updated seats are saved as active automatically.</p></div></div><button type="submit" disabled={isSubmitting} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 text-sm font-semibold text-white shadow-lg shadow-purple-300/30 transition hover:from-[#8B5CF6] hover:to-[#6D28D9] disabled:opacity-60">{isSubmitting ? <Loader2 size={18} className="animate-spin" /> : editingId ? <CheckCircle2 size={18} /> : <Plus size={18} />}{isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Add Seat"}</button></form></div></div></div>;
}

function FormInput({ id, label, value, placeholder, icon, onChange }: { id: string; label: string; value: string; placeholder: string; icon: React.ReactNode; onChange: (value: string) => void }) { return <div><label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}<span className="ml-1 text-red-500">*</span></label><div className="relative"><div className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-purple-400">{icon}</div><input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10" /></div></div>; }

function DeleteModal({ seat, isSubmitting, onClose, onDelete }: { seat: SeatRecord; isSubmitting: boolean; onClose: () => void; onDelete: () => void }) { return <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700"><Trash2 size={25} /></div><div className="mt-4 text-center"><h2 className="text-xl font-bold text-slate-900">Delete Seat</h2><p className="mt-2 text-sm leading-6 text-slate-500">Are you sure you want to delete <strong className="text-slate-900">{seat.name}</strong>? This action cannot be undone.</p></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row"><button type="button" onClick={onClose} disabled={isSubmitting} className="h-11 flex-1 cursor-pointer rounded-xl border border-purple-200 bg-white text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60">Cancel</button><button type="button" onClick={onDelete} disabled={isSubmitting} className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-sm font-semibold text-white shadow-sm transition hover:from-[#8B5CF6] hover:to-[#6D28D9] disabled:opacity-60">{isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Deleting</> : <><Trash2 size={16} /> Delete</>}</button></div></div></div>; }

function EmptyState({ hasSearch, onAdd }: { hasSearch: boolean; onAdd: () => void }) { return <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-500"><Armchair size={25} /></div><h3 className="font-semibold text-slate-800">No seats found</h3><p className="mt-1 max-w-sm text-sm text-slate-500">{hasSearch ? "No seats match your search. Try another search term." : "There are no salon seats yet. Add your first seat."}</p>{!hasSearch && <button type="button" onClick={onAdd} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"><Plus size={16} /> Add Seat</button>}</div>; }