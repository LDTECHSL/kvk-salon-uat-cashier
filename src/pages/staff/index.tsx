import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
    BriefcaseBusiness,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Edit3,
    Loader2,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";
import Alert from "@/components/ui/alert";
import {
    createStaff,
    deleteStaff,
    getStaffList,
    updateStaff,
} from "@/services/salon-staff-api";
import { createPortal } from "react-dom";

interface StaffForm {
    name: string;
    phone: string;
    designation: string;
}

interface StaffRecord extends StaffForm {
    id: string;
    isActive: boolean;
}

type AlertState = {
    visible: boolean;
    variant: "success" | "error" | "warning";
    title: string;
    description: string;
};

const initialForm: StaffForm = {
    name: "",
    phone: "",
    designation: "",
};

const extractStaffData = (response: any): any[] => {
    const data =
        response?.additionalData?.response ??
        response?.response ??
        response;

    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.data)) return data.data;

    return [];
};

const mapStaff = (staff: any): StaffRecord => ({
    id: String(staff.id ?? staff.staffId ?? staff.userId),
    name: staff.name ?? "",
    phone: staff.phone ?? "",
    designation: staff.designation ?? "",
    isActive: Boolean(staff.isActive),
});

export default function StaffPage() {
    /* =========================================================
       Staff
       ========================================================= */

    const [staff, setStaff] = useState<StaffRecord[]>([]);

    /* =========================================================
       Form
       ========================================================= */

    const [form, setForm] = useState<StaffForm>(initialForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    /* =========================================================
       Search / Pagination
       ========================================================= */

    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    /* =========================================================
       Loading
       ========================================================= */

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingStaff, setDeletingStaff] = useState<StaffRecord | null>(null);

    /* =========================================================
       Alert
       ========================================================= */

    const [pageAlert, setPageAlert] = useState<AlertState>({
        visible: false,
        variant: "success",
        title: "",
        description: "",
    });

    /* =========================================================
       Alert Helper
       ========================================================= */

    const showAlert = (alert: Omit<AlertState, "visible">) => {
        setPageAlert({
            ...alert,
            visible: true,
        });
    };

    /* =========================================================
       Load Staff
       ========================================================= */

    const loadStaff = async () => {
        try {
            setIsLoading(true);

            const response = await getStaffList();

            setStaff(extractStaffData(response).map(mapStaff));
        } catch (error) {
            console.error("Failed to load staff:", error);

            setStaff([]);

            showAlert({
                variant: "error",
                title: "Unable to load staff",
                description: "Please refresh the page and try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadStaff();
    }, []);

    /* =========================================================
       Search
       ========================================================= */

    const filteredStaff = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return staff;

        return staff.filter((member) =>
            [member.name, member.phone, member.designation].some((value) =>
                value.toLowerCase().includes(query),
            ),
        );
    }, [search, staff]);

    /* =========================================================
       Pagination
       ========================================================= */

    const totalPages = Math.max(
        1,
        Math.ceil(filteredStaff.length / itemsPerPage),
    );

    const paginatedStaff = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;

        return filteredStaff.slice(start, start + itemsPerPage);
    }, [currentPage, filteredStaff, itemsPerPage]);

    const showingFrom =
        filteredStaff.length === 0
            ? 0
            : (currentPage - 1) * itemsPerPage + 1;

    const showingTo = Math.min(
        currentPage * itemsPerPage,
        filteredStaff.length,
    );

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    /* =========================================================
       Summary
       ========================================================= */

    const activeStaffCount = useMemo(
        () => staff.filter((member) => member.isActive).length,
        [staff],
    );

    const inactiveStaffCount = useMemo(
        () => staff.filter((member) => !member.isActive).length,
        [staff],
    );

    /* =========================================================
       Form
       ========================================================= */

    const openAddForm = () => {
        setEditingId(null);
        setForm(initialForm);
        setIsFormOpen(true);
    };

    const openEditForm = (member: StaffRecord) => {
        setEditingId(member.id);

        setForm({
            name: member.name,
            phone: member.phone,
            designation: member.designation,
        });

        setIsFormOpen(true);
    };

    const closeForm = () => {
        if (isSubmitting) return;

        setIsFormOpen(false);
        setEditingId(null);
        setForm(initialForm);
    };

    /* =========================================================
       Form Submit
       ========================================================= */

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        const normalizedPhone = form.phone.replace(/\D/g, "");

        if (normalizedPhone.length !== 10) {
            showAlert({
                variant: "warning",
                title: "Invalid phone number",
                description: "Please enter a mobile number with exactly 10 digits.",
            });
            return;
        }

        const payload = {
            id: editingId ?? undefined,
            name: form.name.trim(),
            phone: normalizedPhone,
            designation: form.designation.trim(),
            isActive: true,
        };

        try {
            setIsSubmitting(true);

            if (editingId) {
                await updateStaff(editingId, payload);

                showAlert({
                    variant: "success",
                    title: "Staff member updated",
                    description: `${payload.name}'s details were updated successfully.`,
                });
            } else {
                await createStaff(payload);

                showAlert({
                    variant: "success",
                    title: "Staff member added",
                    description: `${payload.name} is now active in the salon team.`,
                });
            }

            setIsFormOpen(false);
            setForm(initialForm);
            setEditingId(null);

            await loadStaff();
        } catch (error) {
            console.error("Failed to save staff:", error);

            showAlert({
                variant: "error",
                title: "Unable to save staff member",
                description: "Please check the details and try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /* =========================================================
       Delete
       ========================================================= */

    const handleDelete = async (member: StaffRecord) => {
        try {
            setDeletingId(member.id);

            await deleteStaff(member.id);

            setStaff((current) =>
                current.filter((item) => item.id !== member.id),
            );

            showAlert({
                variant: "success",
                title: "Staff member deleted",
                description: `${member.name} was removed from the staff list.`,
            });
        } catch (error) {
            console.error("Failed to delete staff:", error);

            showAlert({
                variant: "error",
                title: "Unable to delete staff member",
                description: "Please try again.",
            });
        } finally {
            setDeletingId(null);
            setDeletingStaff(null);
        }
    };

    /* =========================================================
       Render
       ========================================================= */

    return (
        <main className="min-h-screen bg-slate-50/60">
            {/* =====================================================
          Alert
          ===================================================== */}

            {pageAlert.visible && (
                <div className="fixed right-4 top-4 z-[99999] w-[calc(100%-2rem)] max-w-md">
                    <Alert
                        variant={pageAlert.variant}
                        title={pageAlert.title}
                        description={pageAlert.description}
                        onClose={() =>
                            setPageAlert((current) => ({
                                ...current,
                                visible: false,
                            }))
                        }
                    />
                </div>
            )}

            {/* =====================================================
          Loading Overlay
          ===================================================== */}

            {(isLoading || isSubmitting) && createPortal(
                <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-2xl">
                            <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
                        </div>

                        <p className="text-sm font-semibold text-white">
                            {isSubmitting
                                ? "Saving staff details..."
                                : "Loading staff..."}
                        </p>
                    </div>
                </div>,
                document.body,
            )}

            {/* =====================================================
          Main Container
          ===================================================== */}

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* ===================================================
            Header
            =================================================== */}

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-lg shadow-purple-300/30">
                            <UsersRound size={21} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Staff Maintenance
                            </h1>

                            <p className="text-sm text-slate-500">
                                Add and manage the people who keep KVK Salon
                                running smoothly.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={loadStaff}
                            disabled={isLoading}
                            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                className={isLoading ? "animate-spin" : ""}
                            >
                                <path
                                    d="M20 11a8.1 8.1 0 0 0-14.9-4M4 5v4h4M4 13a8.1 8.1 0 0 0 14.9 4M20 19v-4h-4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>

                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={openAddForm}
                            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 text-sm font-semibold text-white shadow-lg shadow-purple-300/30 transition hover:from-[#8B5CF6] hover:to-[#6D28D9]"
                        >
                            <Plus size={17} />
                            Add Staff
                        </button>
                    </div>
                </div>

                {/* ===================================================
            Summary Cards
            =================================================== */}

                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Total Staff"
                        value={String(staff.length)}
                        icon={<UsersRound size={20} />}
                        iconClassName="bg-purple-50 text-purple-700"
                    />

                    <SummaryCard
                        title="Active Staff"
                        value={String(activeStaffCount)}
                        icon={<CheckCircle2 size={20} />}
                        iconClassName="bg-emerald-50 text-emerald-600"
                    />

                    <SummaryCard
                        title="Inactive Staff"
                        value={String(inactiveStaffCount)}
                        icon={<ShieldCheck size={20} />}
                        iconClassName="bg-slate-100 text-slate-600"
                    />

                    <SummaryCard
                        title="Designations"
                        value={String(
                            new Set(
                                staff
                                    .map((member) => member.designation.trim())
                                    .filter(Boolean),
                            ).size,
                        )}
                        icon={<BriefcaseBusiness size={20} />}
                        iconClassName="bg-violet-50 text-violet-600"
                    />
                </div>

                {/* ===================================================
            Staff Table Card
            =================================================== */}

                <section className="overflow-visible rounded-2xl border border-purple-100 bg-white shadow-[0_12px_35px_rgba(91,33,182,0.07)]">
                    {/* Search Header */}

                    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Staff Directory
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {filteredStaff.length} staff member
                                {filteredStaff.length === 1 ? "" : "s"} found.
                            </p>
                        </div>

                        <div className="relative w-full sm:max-w-md">
                            <Search
                                size={18}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search name, phone or designation..."
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                            />
                        </div>
                    </div>

                    {/* =================================================
              Desktop Table
              ================================================= */}

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[850px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80">
                                    <TableHeading>Staff Member</TableHeading>
                                    <TableHeading>Phone</TableHeading>
                                    <TableHeading>Designation</TableHeading>
                                    <TableHeading>Status</TableHeading>

                                    <th className="w-28 px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {!isLoading && paginatedStaff.length > 0 ? (
                                    paginatedStaff.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="transition hover:bg-purple-50/30"
                                        >
                                            {/* Staff */}

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                                                        <UserRound size={18} />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-slate-900">
                                                            {member.name || "N/A"}
                                                        </p>

                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            Staff ID: {member.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Phone */}

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Phone
                                                        size={15}
                                                        className="text-purple-400"
                                                    />

                                                    <span>{member.phone || "-"}</span>
                                                </div>
                                            </td>

                                            {/* Designation */}

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <BriefcaseBusiness
                                                        size={15}
                                                        className="text-slate-400"
                                                    />

                                                    <span className="text-sm font-medium text-slate-700">
                                                        {member.designation || "-"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status */}

                                            <td className="px-5 py-4">
                                                <StatusBadge
                                                    isActive={member.isActive}
                                                />
                                            </td>

                                            {/* Actions */}

                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditForm(member)}
                                                        title="Edit staff member"
                                                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-purple-100 bg-white text-purple-600 transition hover:border-purple-300 hover:bg-purple-50"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingStaff(member)}
                                                        disabled={deletingId === member.id}
                                                        title="Delete staff member"
                                                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {deletingId === member.id ? (
                                                            <Loader2
                                                                size={16}
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <Trash2 size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5}>
                                            <StaffEmptyState
                                                hasSearch={Boolean(search.trim())}
                                                onAdd={openAddForm}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* =================================================
              Mobile Cards
              ================================================= */}

                    <div className="divide-y divide-slate-100 md:hidden">
                        {!isLoading && paginatedStaff.length > 0 ? (
                            paginatedStaff.map((member) => (
                                <article
                                    key={member.id}
                                    className="p-4 transition hover:bg-purple-50/20"
                                >
                                    {/* Header */}

                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                                                <UserRound size={19} />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate font-bold text-slate-900">
                                                    {member.name || "N/A"}
                                                </p>

                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    {member.designation || "-"}
                                                </p>
                                            </div>
                                        </div>

                                        <StatusBadge
                                            isActive={member.isActive}
                                        />
                                    </div>

                                    {/* Information */}

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <MobileInfo
                                            label="Phone"
                                            value={member.phone || "-"}
                                        />

                                        <MobileInfo
                                            label="Designation"
                                            value={member.designation || "-"}
                                        />
                                    </div>

                                    {/* Actions */}

                                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => openEditForm(member)}
                                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-purple-100 bg-white px-3 text-xs font-semibold text-purple-700 transition hover:bg-purple-50"
                                        >
                                            <Edit3 size={14} />
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setDeletingStaff(member)}
                                            disabled={deletingId === member.id}
                                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-100 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                        >
                                            {deletingId === member.id ? (
                                                <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Trash2 size={14} />
                                            )}

                                            Delete
                                        </button>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <StaffEmptyState
                                hasSearch={Boolean(search.trim())}
                                onAdd={openAddForm}
                            />
                        )}
                    </div>

                    {/* =================================================
              Pagination
              ================================================= */}

                    {!isLoading && filteredStaff.length > 0 && (
                        <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                <p className="text-sm text-slate-500">
                                    Showing{" "}
                                    <span className="font-semibold text-slate-700">
                                        {showingFrom}
                                    </span>{" "}
                                    to{" "}
                                    <span className="font-semibold text-slate-700">
                                        {showingTo}
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-semibold text-slate-700">
                                        {filteredStaff.length}
                                    </span>{" "}
                                    staff
                                </p>

                                <div className="flex items-center gap-2">
                                    <label
                                        htmlFor="staff-page-size"
                                        className="text-xs font-medium text-slate-500"
                                    >
                                        Rows:
                                    </label>

                                    <select
                                        id="staff-page-size"
                                        value={itemsPerPage}
                                        onChange={(event) => {
                                            setItemsPerPage(
                                                Number(event.target.value),
                                            );
                                            setCurrentPage(1);
                                        }}
                                        className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCurrentPage((page) =>
                                            Math.max(page - 1, 1),
                                        )
                                    }
                                    disabled={currentPage === 1}
                                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft size={16} />
                                    <span className="hidden sm:inline">
                                        Previous
                                    </span>
                                </button>

                                <span className="min-w-16 text-center text-sm font-semibold text-slate-600">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setCurrentPage((page) =>
                                            Math.min(page + 1, totalPages),
                                        )
                                    }
                                    disabled={currentPage === totalPages}
                                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <span className="hidden sm:inline">
                                        Next
                                    </span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* =====================================================
          Add / Edit Staff Modal
          ===================================================== */}

            {isFormOpen && createPortal(
                <div
                    className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !isSubmitting
                        ) {
                            closeForm();
                        }
                    }}
                >
                    <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                        {/* Modal Header */}

                        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-lg shadow-purple-300/30">
                                    {editingId ? (
                                        <Edit3 size={20} />
                                    ) : (
                                        <UserRound size={20} />
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">
                                        {editingId
                                            ? "Edit Staff Member"
                                            : "Add Staff Member"}
                                    </h2>

                                    <p className="mt-0.5 text-sm text-slate-500">
                                        {editingId
                                            ? "Update the staff member's details."
                                            : "Create a new active staff profile."}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={isSubmitting}
                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-purple-50 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Close form"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        {/* Modal Body */}

                        <div className="overflow-y-auto p-5 sm:p-6">
                            <form
                                className="space-y-5"
                                onSubmit={handleSubmit}
                            >
                                {/* Name */}

                                <FormInput
                                    id="staff-name"
                                    label="Full Name"
                                    value={form.name}
                                    placeholder="Enter staff name"
                                    icon={<UserRound size={17} />}
                                    onChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            name: value,
                                        }))
                                    }
                                />

                                {/* Phone */}

                                <FormInput
                                    id="staff-phone"
                                    label="Phone Number"
                                    value={form.phone}
                                    placeholder="Enter phone number"
                                    type="tel"
                                    maxLength={10}
                                    inputMode="numeric"
                                    icon={<Phone size={17} />}
                                    onChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            phone: value.replace(/\D/g, "").slice(0, 10),
                                        }))
                                    }
                                />

                                {/* Designation */}

                                <FormInput
                                    id="staff-designation"
                                    label="Designation"
                                    value={form.designation}
                                    placeholder="e.g. Hair Stylist"
                                    icon={<BriefcaseBusiness size={17} />}
                                    onChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            designation: value,
                                        }))
                                    }
                                />

                                {/* Info */}

                                <div className="flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                                        <ShieldCheck size={17} />
                                    </div>

                                    <div>
                                        <p className="text-sm font-semibold text-purple-900">
                                            Staff Status
                                        </p>

                                        <p className="mt-0.5 text-xs leading-5 text-purple-700">
                                            {editingId
                                                ? "This staff profile remains active."
                                                : "New staff members are added as active automatically."}
                                        </p>
                                    </div>
                                </div>

                                {/* Submit */}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 text-sm font-semibold text-white shadow-lg shadow-purple-300/30 transition hover:from-[#8B5CF6] hover:to-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmitting ? (
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />
                                    ) : editingId ? (
                                        <CheckCircle2 size={18} />
                                    ) : (
                                        <Plus size={18} />
                                    )}

                                    {isSubmitting
                                        ? "Saving..."
                                        : editingId
                                            ? "Save Changes"
                                            : "Add Staff Member"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {deletingStaff && createPortal(
                <DeleteStaffModal
                    staff={deletingStaff}
                    isSubmitting={deletingId === deletingStaff.id}
                    onClose={() => {
                        if (!deletingId) setDeletingStaff(null);
                    }}
                    onDelete={() => void handleDelete(deletingStaff)}
                />,
                document.body,
            )}
        </main>
    );
}

/* =========================================================
   Summary Card
   ========================================================= */

function SummaryCard({
    title,
    value,
    icon,
    iconClassName,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    iconClassName: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {title}
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   Table Heading
   ========================================================= */

function TableHeading({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}

/* =========================================================
   Status Badge
   ========================================================= */

function StatusBadge({
    isActive,
}: {
    isActive: boolean;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
        >
            {isActive && <CheckCircle2 size={13} />}

            {isActive ? "Active" : "Inactive"}
        </span>
    );
}

/* =========================================================
   Mobile Information
   ========================================================= */

function MobileInfo({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {label}
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                {value}
            </p>
        </div>
    );
}

function DeleteStaffModal({
    staff,
    isSubmitting,
    onClose,
    onDelete,
}: {
    staff: StaffRecord;
    isSubmitting: boolean;
    onClose: () => void;
    onDelete: () => void;
}) {
    return createPortal(
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                    <Trash2 size={25} />
                </div>

                <div className="mt-4 text-center">
                    <h2 className="text-xl font-bold text-slate-900">Delete Staff Member</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Are you sure you want to delete{" "}
                        <strong className="text-slate-900">{staff.name}</strong>? This action cannot be undone.
                    </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="h-11 flex-1 cursor-pointer rounded-xl border border-purple-200 bg-white text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={isSubmitting}
                        className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-sm font-semibold text-white shadow-sm transition hover:from-[#8B5CF6] hover:to-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Deleting
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} />
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/* =========================================================
   Form Input
   ========================================================= */

function FormInput({
    id,
    label,
    value,
    placeholder,
    icon,
    type = "text",
    maxLength,
    inputMode,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    icon: React.ReactNode;
    type?: string;
    maxLength?: number;
    inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
                {label}

                <span className="ml-1 text-red-500">*</span>
            </label>

            <div className="relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center justify-center text-purple-400">
                    {icon}
                </div>

                <input
                    id={id}
                    type={type}
                    maxLength={maxLength}
                    inputMode={inputMode}
                    value={value}
                    onChange={(event) =>
                        onChange(event.target.value)
                    }
                    placeholder={placeholder}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                />
            </div>
        </div>
    );
}

/* =========================================================
   Empty State
   ========================================================= */

function StaffEmptyState({
    hasSearch,
    onAdd,
}: {
    hasSearch: boolean;
    onAdd: () => void;
}) {
    return (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-500">
                <UsersRound size={25} />
            </div>

            <h3 className="font-semibold text-slate-800">
                No staff found
            </h3>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
                {hasSearch
                    ? "No staff members match your search. Try another search term."
                    : "There are no staff members yet. Add your first salon team member."}
            </p>

            {!hasSearch && (
                <button
                    type="button"
                    onClick={onAdd}
                    className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                >
                    <Plus size={16} />
                    Add Staff
                </button>
            )}
        </div>
    );
}