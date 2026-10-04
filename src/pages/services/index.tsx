import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  ImageIcon,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Sparkles,
  Timer,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  createServiceItem,
  deleteServiceItem,
  getServiceItems,
  updateServiceItem,
} from "@/services/salon-services-api";

/* =========================================================
   Types
   ========================================================= */

type ServiceItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  image?: string | null;
};

type ServiceForm = {
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
  isActive: boolean;
};

type FormErrors = Partial<
  Record<"name" | "description" | "price" | "durationMinutes" | "image", string>
>;

const HARDCODED_BUFFER_MINUTES = 0;

type AlertState = {
  visible: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description: string;
};

const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg";

const getBase64ImageSource = (image?: string | null) => {
  if (!image) return "";

  const value = image.trim();

  if (
    value.startsWith("data:image/") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `data:${DEFAULT_IMAGE_MIME_TYPE};base64,${value}`;
};

const normalizeService = (service: any): ServiceItem => ({
  id: String(service.id),
  name: String(service.name ?? ""),
  description: String(service.description ?? ""),
  price: Number(service.price ?? 0),
  durationMinutes: Number(service.durationMinutes ?? 0),
  bufferMinutes: Number(service.bufferMinutes ?? 0),
  isActive: Boolean(service.isActive),
  image: service.image ?? null,
});

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to convert the image to Base64."));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Unable to read the image file."));
    };

    reader.readAsDataURL(file);
  });
};

const initialForm: ServiceForm = {
  name: "",
  description: "",
  price: "",
  durationMinutes: "",
  isActive: true,
};

/* =========================================================
   Salon Services Page
   ========================================================= */

export default function SalonServicesPage() {
  const navigate = useNavigate();

  const dayendData = localStorage.getItem("dayEndData")
    ? JSON.parse(localStorage.getItem("dayEndData") as string)
    : null;

  useEffect(() => {
    if (!dayendData) {
      navigate("/dayend");
    }
  }, [dayendData]);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    null,
  );

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<ServiceForm>(initialForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [pageAlert, setPageAlert] = useState<AlertState>({
    visible: false,
    variant: "success",
    title: "",
    description: "",
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  /* =========================================================
     Services Data Loading
     ========================================================= */

  const loadServices = async () => {
    try {
      setIsLoading(true);

      const response = await getServiceItems();
      setServices(Array.isArray(response) ? response.map(normalizeService) : []);
    } catch (error) {
      console.error("Unable to load salon services:", error);
      setServices([]);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to load services",
        description: "An error occurred while loading salon services.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadServices();
  }, []);

  useEffect(() => {
    if (!pageAlert.visible) return;

    const timer = setTimeout(() => {
      setPageAlert((prev) => ({ ...prev, visible: false }));
    }, 2500);

    return () => clearTimeout(timer);
  }, [pageAlert.visible]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* =========================================================
     Derived data
     ========================================================= */

  const filteredServices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return services;

    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(search) ||
        service.description.toLowerCase().includes(search) ||
        String(service.price).includes(search),
    );
  }, [searchTerm, services]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredServices.length / itemsPerPage),
  );

  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredServices, itemsPerPage]);

  const showingFrom =
    filteredServices.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;

  const showingTo = Math.min(
    currentPage * itemsPerPage,
    filteredServices.length,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeServiceCount = services.filter(
    (service) => service.isActive,
  ).length;

  const averagePrice =
    services.length > 0
      ? Math.round(
          services.reduce((total, service) => total + service.price, 0) /
            services.length,
        )
      : 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(price);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  /* =========================================================
     Form Helpers
     ========================================================= */

  const resetForm = () => {
    setForm(initialForm);
    setFormErrors({});
    setSelectedImage(null);
    setImagePreview("");
    setIsDragging(false);
  };

  const handleOpenAddModal = () => {
    setFormMode("add");
    setSelectedService(null);
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    setFormMode("edit");
    setSelectedService(service);

    setForm({
      name: service.name,
      description: service.description,
      price: String(service.price),
      durationMinutes: String(service.durationMinutes),
      isActive: service.isActive,
    });

    setSelectedImage(null);
    setImagePreview(getBase64ImageSource(service.image));
    setFormErrors({});
    setIsFormModalOpen(true);
    setOpenMenuId(null);
  };

  const handleOpenViewModal = (service: ServiceItem) => {
    setSelectedService(service);
    setIsViewModalOpen(true);
    setOpenMenuId(null);
  };

  const handleOpenDeleteModal = (service: ServiceItem) => {
    setSelectedService(service);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCloseFormModal = () => {
    if (isSubmitting) return;

    setIsFormModalOpen(false);
    setSelectedService(null);
    resetForm();
  };

  const handleFormChange = (
    field: "name" | "description" | "price" | "durationMinutes",
    value: string,
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));

    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: FormErrors = {};

    if (!form.name.trim()) {
      errors.name = "Service name is required.";
    } else if (form.name.trim().length < 2) {
      errors.name = "Name must contain at least 2 characters.";
    }

    if (!form.description.trim()) {
      errors.description = "Description is required.";
    } else if (form.description.trim().length < 10) {
      errors.description = "Description must contain at least 10 characters.";
    }

    const price = Number(form.price);

    if (!form.price.trim()) {
      errors.price = "Price is required.";
    } else if (Number.isNaN(price) || price < 0) {
      errors.price = "Enter a valid price.";
    }

    const duration = Number(form.durationMinutes);

    if (!form.durationMinutes.trim()) {
      errors.durationMinutes = "Duration is required.";
    } else if (Number.isNaN(duration) || duration <= 0) {
      errors.durationMinutes = "Enter a valid duration greater than zero.";
    }

    if (!selectedImage && !imagePreview) {
      errors.image = "Service image is required.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const validateImage = (file: File) => {
    const acceptedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    const maxSize = 5 * 1024 * 1024;

    if (!acceptedTypes.includes(file.type)) {
      setFormErrors((previous) => ({
        ...previous,
        image: "Only PNG, JPG, JPEG or WEBP images are allowed.",
      }));

      return false;
    }

    if (file.size > maxSize) {
      setFormErrors((previous) => ({
        ...previous,
        image: "Image size must not exceed 5 MB.",
      }));

      return false;
    }

    return true;
  };

  const handleImageSelection = async (file: File | null) => {
    if (!file || !validateImage(file)) return;

    try {
      const base64Image = await fileToBase64(file);

      setSelectedImage(file);
      setImagePreview(base64Image);

      setFormErrors((previous) => ({ ...previous, image: undefined }));
    } catch (error) {
      console.error("Unable to convert image to Base64:", error);

      setSelectedImage(null);
      setImagePreview("");
      setFormErrors((previous) => ({
        ...previous,
        image: "Unable to process the selected image.",
      }));
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    void handleImageSelection(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0] ?? null;
    void handleImageSelection(file);
  };

  const handleSubmitService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const payload = new FormData();
      payload.append("Name", form.name.trim());
      payload.append("Description", form.description.trim());
      payload.append("Price", String(Number(form.price)));
      payload.append("DurationMinutes", String(Number(form.durationMinutes)));
      payload.append("BufferMinutes", String(HARDCODED_BUFFER_MINUTES));
      payload.append("IsActive", String(form.isActive));

      if (selectedImage) {
        payload.append("Image", selectedImage);
      }

      if (formMode === "add") {
        await createServiceItem(payload);

        setPageAlert({
          visible: true,
          variant: "success",
          title: "Service added",
          description: `${form.name.trim()} was added successfully.`,
        });
      } else if (selectedService) {
        payload.append("Id", selectedService.id);
        await updateServiceItem(selectedService.id, payload);

        setPageAlert({
          visible: true,
          variant: "success",
          title: "Service updated",
          description: `${form.name.trim()} was updated successfully.`,
        });
      }

      await loadServices();
      setIsFormModalOpen(false);
      setSelectedService(null);
      resetForm();
    } catch (error) {
      console.error("Unable to save salon service:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to save service",
        description: "An error occurred while saving the service.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;

    try {
      setIsSubmitting(true);

      await deleteServiceItem(selectedService.id);

      setPageAlert({
        visible: true,
        variant: "success",
        title: "Service deleted",
        description: `${selectedService.name} was deleted successfully.`,
      });

      setIsDeleteModalOpen(false);
      setSelectedService(null);
    } catch (error) {
      console.error("Unable to delete salon service:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to delete service",
        description: "An error occurred while deleting the service.",
      });
    } finally {
      setIsSubmitting(false);
      await loadServices();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/60">
      {pageAlert.visible &&
        createPortal(
          <div className="fixed right-4 top-4 z-[99999] w-[calc(100%-2rem)] max-w-md">
            <CustomAlert
              alert={pageAlert}
              onClose={() =>
                setPageAlert((previous) => ({ ...previous, visible: false }))
              }
            />
          </div>,
          document.body,
        )}

      {(isLoading || isSubmitting) &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-white" />

              <p className="text-sm font-medium text-white">
                {isSubmitting ? "Processing..." : "Loading services..."}
              </p>
            </div>
          </div>,
          document.body,
        )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white shadow-lg shadow-purple-300/30">
              <Scissors size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Salon Services
              </h1>

              <p className="text-sm text-slate-500">
                Manage service details, pricing, duration and images.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              disabled={isLoading}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 text-sm font-semibold text-white shadow-lg shadow-purple-300/30 transition hover:from-[#8B5CF6] hover:to-[#6D28D9]"
            >
              <Plus size={17} />
              Add Service
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total Services"
            value={services.length}
            icon={<Scissors size={20} />}
            iconClassName="bg-purple-50 text-purple-700"
          />

          <SummaryCard
            title="Active Services"
            value={activeServiceCount}
            icon={<CheckCircle2 size={20} />}
            iconClassName="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            title="Average Service Price"
            value={averagePrice}
            isPrice
            icon={<Sparkles size={20} />}
            iconClassName="bg-violet-50 text-violet-600"
          />
        </div>

        {/* Table card */}
        <section className="overflow-visible rounded-2xl border border-purple-100 bg-white shadow-[0_12px_35px_rgba(91,33,182,0.07)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, description or price..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            <div className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">
                {filteredServices.length}
              </span>{" "}
              services
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-visible md:block">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Service
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Duration
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Price
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="w-20 px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!isLoading && paginatedServices.length > 0 ? (
                  paginatedServices.map((service) => (
                    <tr
                      key={service.id}
                      className="transition hover:bg-purple-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {service.image ? (
                              <img
                                src={getBase64ImageSource(service.image)}
                                alt={service.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {service.name}
                            </p>

                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                              {service.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <Clock size={14} className="text-purple-400" />
                          {formatDuration(service.durationMinutes)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                          {formatPrice(service.price)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge isActive={service.isActive} />
                      </td>

                      <td className="relative px-5 py-4">
                        <div
                          className="flex justify-end"
                          ref={openMenuId === service.id ? menuRef : null}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((previous) =>
                                previous === service.id ? null : service.id,
                              )
                            }
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                            aria-label={`Open actions for ${service.name}`}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openMenuId === service.id && (
                            <div className="absolute right-5 top-14 z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                              <button
                                type="button"
                                onClick={() => handleOpenViewModal(service)}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-purple-50 hover:text-purple-700"
                              >
                                <Eye size={16} />
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(service)}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-purple-50 hover:text-purple-700"
                              >
                                <Edit3 size={16} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(service)}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        hasSearch={Boolean(searchTerm.trim())}
                        onAdd={handleOpenAddModal}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {!isLoading && paginatedServices.length > 0 ? (
              paginatedServices.map((service) => (
                <article key={service.id} className="p-4">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {service.image ? (
                        <img
                          src={getBase64ImageSource(service.image)}
                          alt={service.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <ImageIcon size={22} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-900">
                        {service.name}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-emerald-600">
                        {formatPrice(service.price)}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={12} className="text-purple-400" />
                          {formatDuration(service.durationMinutes)}
                        </span>
                        <StatusBadge isActive={service.isActive} />
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((previous) =>
                            previous === service.id ? null : service.id,
                          )
                        }
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenuId === service.id && (
                        <div className="absolute right-0 top-11 z-50 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(service)}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                          >
                            <Eye size={16} />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(service)}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                          >
                            <Edit3 size={16} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(service)}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {service.description || "No description"}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState
                hasSearch={Boolean(searchTerm.trim())}
                onAdd={handleOpenAddModal}
              />
            )}
          </div>

          {/* Pagination */}
          {!isLoading && filteredServices.length > 0 && (
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
                    {filteredServices.length}
                  </span>{" "}
                  services
                </p>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="service-items-per-page"
                    className="text-xs font-medium text-slate-500"
                  >
                    Rows:
                  </label>

                  <select
                    id="service-items-per-page"
                    value={itemsPerPage}
                    onChange={(event) => {
                      setItemsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((previous) => Math.max(previous - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="text-sm font-semibold text-slate-600">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((previous) =>
                      Math.min(previous + 1, totalPages),
                    )
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {isViewModalOpen && selectedService && (
        <ViewServiceModal
          service={selectedService}
          formatPrice={formatPrice}
          formatDuration={formatDuration}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedService(null);
          }}
        />
      )}

      {isFormModalOpen && (
        <ServiceFormModal
          mode={formMode}
          form={form}
          errors={formErrors}
          imagePreview={imagePreview}
          isDragging={isDragging}
          isSubmitting={isSubmitting}
          onChange={handleFormChange}
          onToggleActive={() =>
            setForm((previous) => ({
              ...previous,
              isActive: !previous.isActive,
            }))
          }
          onFileChange={handleFileInputChange}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onClose={handleCloseFormModal}
          onSubmit={handleSubmitService}
        />
      )}

      {isDeleteModalOpen && selectedService && (
        <DeleteServiceModal
          service={selectedService}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (isSubmitting) return;

            setIsDeleteModalOpen(false);
            setSelectedService(null);
          }}
          onDelete={handleDeleteService}
        />
      )}
    </main>
  );
}

/* =========================================================
   Form Modal
   ========================================================= */

type ServiceFormModalProps = {
  mode: "add" | "edit";
  form: ServiceForm;
  errors: FormErrors;
  imagePreview: string;
  isDragging: boolean;
  isSubmitting: boolean;
  onChange: (
    field: "name" | "description" | "price" | "durationMinutes",
    value: string,
  ) => void;
  onToggleActive: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function ServiceFormModal({
  mode,
  form,
  errors,
  imagePreview,
  isDragging,
  isSubmitting,
  onChange,
  onToggleActive,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onClose,
  onSubmit,
}: ServiceFormModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white">
              {mode === "add" ? <Plus size={21} /> : <Edit3 size={20} />}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                {mode === "add" ? "Add Salon Service" : "Edit Salon Service"}
              </h2>

              <p className="text-sm text-slate-500">
                Add service information, timing and one image.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_250px]">
              <div className="space-y-4">
                <FormField
                  label="Service Name"
                  value={form.name}
                  placeholder="e.g. Classic Haircut"
                  required
                  error={errors.name}
                  onChange={(value) => onChange("name", value)}
                />

                <FormTextArea
                  label="Description"
                  value={form.description}
                  placeholder="Enter service description"
                  required
                  error={errors.description}
                  onChange={(value) => onChange("description", value)}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Price (LKR)"
                    value={form.price}
                    placeholder="Enter price"
                    type="number"
                    required
                    error={errors.price}
                    onChange={(value) => onChange("price", value)}
                  />

                  <FormField
                    label="Duration (minutes)"
                    value={form.durationMinutes}
                    placeholder="e.g. 30"
                    type="number"
                    required
                    error={errors.durationMinutes}
                    onChange={(value) => onChange("durationMinutes", value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={onToggleActive}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
                    form.isActive
                      ? "border-purple-200 bg-purple-50/70"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        form.isActive
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <CheckCircle2 size={17} />
                    </div>

                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          form.isActive ? "text-purple-900" : "text-slate-600"
                        }`}
                      >
                        {form.isActive ? "Active" : "Inactive"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Inactive services are hidden from booking.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${
                      form.isActive ? "bg-purple-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        form.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </span>
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Service Image
                  <span className="ml-1 text-red-500">*</span>
                </label>

                {imagePreview ? (
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img
                      src={imagePreview}
                      alt="Service preview"
                      className="h-56 w-full object-cover"
                    />

                    <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
                      <label className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                        <UploadCloud size={15} />
                        Replace
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={onFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={`flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
                      isDragging
                        ? "border-purple-500 bg-purple-50"
                        : errors.image
                          ? "border-red-300 bg-red-50/30"
                          : "border-slate-300 bg-slate-50 hover:border-purple-400 hover:bg-purple-50/40"
                    }`}
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                      <UploadCloud size={23} />
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      Drag and drop image
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      PNG, JPG, JPEG or WEBP
                      <br />
                      Maximum size 5 MB
                    </p>

                    <label className="mt-4 inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 text-xs font-semibold text-white transition hover:from-[#8B5CF6] hover:to-[#6D28D9]">
                      Browse Image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={onFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {errors.image && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.image}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-5 text-sm font-semibold text-white shadow-sm transition hover:from-[#8B5CF6] hover:to-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  {mode === "add" ? <Plus size={17} /> : <Check size={17} />}
                  {mode === "add" ? "Add Service" : "Save Changes"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/* =========================================================
   View Modal
   ========================================================= */

type ViewServiceModalProps = {
  service: ServiceItem;
  formatPrice: (price: number) => string;
  formatDuration: (minutes: number) => string;
  onClose: () => void;
};

function ViewServiceModal({
  service,
  formatPrice,
  formatDuration,
  onClose,
}: ViewServiceModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white">
              <Eye size={21} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Service Details
              </h2>

              <p className="text-sm text-slate-500">
                View full salon service information.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-5 sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {service.image ? (
              <img
                src={getBase64ImageSource(service.image)}
                alt={service.name}
                className="h-64 w-full object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-slate-400">
                <ImageIcon size={38} />
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-slate-900">
                  {service.name}
                </h3>
              </div>

              <p className="mt-2 text-sm leading-7 text-slate-600">
                {service.description || "No description provided."}
              </p>
            </div>

            <span className="shrink-0 rounded-xl bg-emerald-50 px-4 py-2 text-base font-bold text-emerald-700">
              {formatPrice(service.price)}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Timer size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                  Duration
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {formatDuration(service.durationMinutes)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* =========================================================
   Delete Modal
   ========================================================= */

type DeleteServiceModalProps = {
  service: ServiceItem;
  isSubmitting: boolean;
  onClose: () => void;
  onDelete: () => void;
};

function DeleteServiceModal({
  service,
  isSubmitting,
  onClose,
  onDelete,
}: DeleteServiceModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 size={25} />
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-bold text-slate-900">Delete Service</h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">
              {service.name}
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-11 cursor-pointer flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting}
            className="inline-flex h-11 cursor-pointer flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:bg-red-300"
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
   Form Field / Text Area
   ========================================================= */

type FormFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  type?: "text" | "number";
  hint?: string;
  onChange: (value: string) => void;
};

function FormField({
  label,
  value,
  placeholder,
  error,
  required,
  type = "text",
  hint,
  onChange,
}: FormFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value}
        min={type === "number" ? 0 : undefined}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
        }`}
      />

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

type FormTextAreaProps = {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

function FormTextArea({
  label,
  value,
  placeholder,
  error,
  required,
  onChange,
}: FormTextAreaProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full resize-none rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
        }`}
      />

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}

/* =========================================================
   Summary Card / Status Badge / Empty State / Alert
   ========================================================= */

type SummaryCardProps = {
  title: string;
  value: number;
  icon: ReactNode;
  iconClassName: string;
  isPrice?: boolean;
};

function SummaryCard({
  title,
  value,
  icon,
  iconClassName,
  isPrice,
}: SummaryCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>

        <p className="mt-0.5 text-2xl font-bold text-slate-900">
          {isPrice ? `LKR ${value.toLocaleString()}` : value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {isActive && <CheckCircle2 size={13} />}
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function EmptyState({
  hasSearch,
  onAdd,
}: {
  hasSearch: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-500">
        <Scissors size={26} />
      </div>

      <h3 className="font-semibold text-slate-900">No services found</h3>

      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {hasSearch
          ? "No services match your search. Try another search term."
          : "No salon services have been created yet."}
      </p>

      {!hasSearch && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 text-sm font-semibold text-white shadow-sm transition hover:from-[#8B5CF6] hover:to-[#6D28D9]"
        >
          <Plus size={16} />
          Add Service
        </button>
      )}
    </div>
  );
}

type CustomAlertProps = {
  alert: AlertState;
  onClose: () => void;
};

function CustomAlert({ alert, onClose }: CustomAlertProps) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-purple-200 bg-purple-50 text-purple-800",
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-lg ${styles[alert.variant]}`}
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="font-semibold">{alert.title}</p>
        <p className="mt-1 text-sm opacity-80">{alert.description}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 cursor-pointer rounded-lg p-1 transition hover:bg-black/5"
      >
        <X size={17} />
      </button>
    </div>
  );
}
