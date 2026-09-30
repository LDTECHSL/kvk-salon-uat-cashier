import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Box,
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  ImageIcon,
  Loader2,
  MoreVertical,
  PackageCheck,
  Percent,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { getCarServices } from "@/services/carwash-services-api";
import {
  createCarPackage,
  deleteCarPackage,
  getCarPackages,
  updateCarPackage,
} from "@/services/carwash-packages-api";
import { useNavigate } from "react-router-dom";

type ServiceOption = {
  id: string;
  title: string;
  price: number;
};

type PackageItem = {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  basPrice: number;
  pricesWithoutDiscounts: number;
  isActive: boolean;
  serviceIds: string[];
  services: ServiceOption[];
};

type PackageForm = {
  title: string;
  description: string;
  basPrice: string;
  pricesWithoutDiscounts: string;
  isActive: boolean;
  serviceIds: string[];
};

type FormErrors = Partial<
  Record<
    | "title"
    | "description"
    | "basPrice"
    | "pricesWithoutDiscounts"
    | "serviceIds"
    | "image",
    string
  >
>;

type AlertState = {
  visible: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description: string;
};

const initialForm: PackageForm = {
  title: "",
  description: "",
  basPrice: "",
  pricesWithoutDiscounts: "",
  isActive: true,
  serviceIds: [],
};

const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg";

const getImageSource = (image?: string | null) => {
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

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to create the image preview."));
      }
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Unable to read the image."));
    };

    reader.readAsDataURL(file);
  });

const normalizeService = (service: any): ServiceOption => ({
  id: String(service.id ?? service.serviceId ?? ""),
  title: String(service.title ?? service.name ?? "Unnamed service"),
  price: Number(service.price ?? 0),
});

const normalizePackage = (
  item: any,
  availableServices: ServiceOption[],
): PackageItem => {
  const rawServiceIds = Array.isArray(item.serviceIds)
    ? item.serviceIds
    : Array.isArray(item.services)
      ? item.services.map((service: any) => service.id ?? service.serviceId)
      : [];

  const serviceIds = rawServiceIds.map(String).filter(Boolean);

  const services = Array.isArray(item.services)
    ? item.services.map(normalizeService)
    : availableServices.filter((service) => serviceIds.includes(service.id));

  return {
    id: String(item.id ?? crypto.randomUUID()),
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    image: item.image ?? null,
    basPrice: Number(item.basPrice ?? item.basePrice ?? 0),
    pricesWithoutDiscounts: Number(item.pricesWithoutDiscounts ?? 0),
    isActive: Boolean(item.isActive),
    serviceIds,
    services,
  };
};

export default function Packages() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");

  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(
    null,
  );
  const [form, setForm] = useState<PackageForm>(initialForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [pageAlert, setPageAlert] = useState<AlertState>({
    visible: false,
    variant: "success",
    title: "",
    description: "",
  });

  const navigate = useNavigate();

  const dayendData = localStorage.getItem("dayEndData")
    ? JSON.parse(localStorage.getItem("dayEndData") as string)
    : null;

  useEffect(() => {
    if (!dayendData) {
      navigate("/dayend");
    }
  }, [dayendData]);

  useEffect(() => {
    if (!pageAlert.visible) return;

    const timer = setTimeout(() => {
      setPageAlert((prev) => ({
        ...prev,
        visible: false,
      }));
    }, 2000);

    return () => clearTimeout(timer);
  }, [pageAlert.visible]);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(price);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [servicesResponse, packagesResponse] = await Promise.all([
        getCarServices(),
        getCarPackages(),
      ]);

      const normalizedServices = Array.isArray(servicesResponse)
        ? servicesResponse.map(normalizeService).filter((service) => service.id)
        : [];

      setServices(normalizedServices);
      setPackages(
        Array.isArray(packagesResponse)
          ? packagesResponse.map((item) =>
              normalizePackage(item, normalizedServices),
            )
          : [],
      );
    } catch (error) {
      console.error("Unable to load packages:", error);
      setPackages([]);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to load packages",
        description: "An error occurred while loading package information.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredPackages = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return packages;

    return packages.filter((item) =>
      [
        item.title,
        item.description,
        String(item.basPrice),
        ...item.services.map((service) => service.title),
      ].some((value) => value.toLowerCase().includes(search)),
    );
  }, [packages, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPackages.length / itemsPerPage),
  );

  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPackages.slice(start, start + itemsPerPage);
  }, [currentPage, filteredPackages, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const activePackages = packages.filter((item) => item.isActive).length;
  const averageDiscount = packages.length
    ? Math.round(
        packages.reduce((total, item) => {
          if (item.pricesWithoutDiscounts <= 0) return total;
          return (
            total +
            ((item.pricesWithoutDiscounts - item.basPrice) /
              item.pricesWithoutDiscounts) *
              100
          );
        }, 0) / packages.length,
      )
    : 0;

  const resetForm = () => {
    setForm(initialForm);
    setFormErrors({});
    setSelectedImage(null);
    setImagePreview("");
    setIsDragging(false);
    setServiceSearchTerm("");
  };

  const openAddModal = () => {
    setFormMode("add");
    setSelectedPackage(null);
    resetForm();
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: PackageItem) => {
    const regularTotalPrice = services
      .filter((service) => item.serviceIds.includes(service.id))
      .reduce((total, service) => total + service.price, 0);

    setFormMode("edit");
    setSelectedPackage(item);

    setForm({
      title: item.title,
      description: item.description,
      basPrice: String(item.basPrice),
      pricesWithoutDiscounts: String(regularTotalPrice),
      isActive: item.isActive,
      serviceIds: item.serviceIds,
    });

    setSelectedImage(null);
    setImagePreview(getImageSource(item.image));
    setFormErrors({});
    setServiceSearchTerm("");
    setIsFormModalOpen(true);
    setOpenMenuId(null);
  };

  const closeFormModal = () => {
    if (isSubmitting) return;
    setIsFormModalOpen(false);
    setSelectedPackage(null);
    resetForm();
  };

  const updateField = <K extends keyof PackageForm>(
    field: K,
    value: PackageForm[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const toggleService = (serviceId: string) => {
    setForm((previous) => {
      const updatedServiceIds = previous.serviceIds.includes(serviceId)
        ? previous.serviceIds.filter((id) => id !== serviceId)
        : [...previous.serviceIds, serviceId];

      const regularTotalPrice = services
        .filter((service) => updatedServiceIds.includes(service.id))
        .reduce((total, service) => total + service.price, 0);

      return {
        ...previous,
        serviceIds: updatedServiceIds,
        pricesWithoutDiscounts:
          regularTotalPrice > 0 ? String(regularTotalPrice) : "",
      };
    });

    setFormErrors((previous) => ({
      ...previous,
      serviceIds: undefined,
      pricesWithoutDiscounts: undefined,
    }));
  };

  const validateForm = () => {
    const errors: FormErrors = {};
    const basPrice = Number(form.basPrice);
    const pricesWithoutDiscounts = Number(form.pricesWithoutDiscounts);

    if (!form.title.trim()) {
      errors.title = "Package title is required.";
    } else if (form.title.trim().length < 3) {
      errors.title = "Title must contain at least 3 characters.";
    }

    if (!form.description.trim()) {
      errors.description = "Description is required.";
    } else if (form.description.trim().length < 10) {
      errors.description = "Description must contain at least 10 characters.";
    }

    if (!form.basPrice.trim()) {
      errors.basPrice = "Package price is required.";
    } else if (Number.isNaN(basPrice) || basPrice <= 0) {
      errors.basPrice = "Enter a valid package price greater than zero.";
    }

    if (!form.pricesWithoutDiscounts.trim()) {
      errors.pricesWithoutDiscounts = "Select at least one service.";
    } else if (
      Number.isNaN(pricesWithoutDiscounts) ||
      pricesWithoutDiscounts <= 0
    ) {
      errors.pricesWithoutDiscounts =
        "Regular price must be greater than zero.";
    } else if (basPrice > pricesWithoutDiscounts) {
      errors.basPrice =
        "Package price cannot be higher than the regular total price.";
    }
    if (form.serviceIds.length === 0) {
      errors.serviceIds = "Select at least one service.";
    }

    if (formMode === "add" && !selectedImage && !imagePreview) {
      errors.image = "Package image is required.";
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

    if (!acceptedTypes.includes(file.type)) {
      setFormErrors((previous) => ({
        ...previous,
        image: "Only PNG, JPG, JPEG or WEBP images are allowed.",
      }));
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
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
      const preview = await fileToDataUrl(file);
      setSelectedImage(file);
      setImagePreview(preview);
      setFormErrors((previous) => ({ ...previous, image: undefined }));
    } catch (error) {
      console.error("Unable to process image:", error);
      setFormErrors((previous) => ({
        ...previous,
        image: "Unable to process the selected image.",
      }));
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleImageSelection(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleImageSelection(event.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = validateForm();

    if (!isValid) {
      setPageAlert({
        visible: true,
        variant: "warning",
        title: "Invalid package price",
        description:
          "The package price cannot be higher than the regular total price of the selected services.",
      });

      return;
    }

    try {
      setIsSubmitting(true);

      const payload = new FormData();

      payload.append("Title", form.title.trim());
      payload.append("Description", form.description.trim());
      payload.append("BasPrice", String(Number(form.basPrice)));
      payload.append(
        "PricesWithoutDiscounts",
        String(Number(form.pricesWithoutDiscounts)),
      );
      payload.append("IsActive", String(form.isActive));

      if (selectedImage) {
        payload.append("Image", selectedImage);
      }

      form.serviceIds.forEach((serviceId) => {
        payload.append("ServiceIds", serviceId);
      });

      if (formMode === "add") {
        await createCarPackage(payload);
      } else if (selectedPackage) {
        payload.append("Id", selectedPackage.id);
        await updateCarPackage(payload);
      }

      setPageAlert({
        visible: true,
        variant: "success",
        title: formMode === "add" ? "Package added" : "Package updated",
        description: `${form.title.trim()} was ${
          formMode === "add" ? "added" : "updated"
        } successfully.`,
      });

      closeFormModal();
      await loadData();
    } catch (error) {
      console.error("Unable to save package:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to save package",
        description: "An error occurred while saving the package.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;

    try {
      setIsSubmitting(true);
      await deleteCarPackage(selectedPackage.id);

      setPageAlert({
        visible: true,
        variant: "success",
        title: "Package deleted",
        description: `${selectedPackage.title} was deleted successfully.`,
      });

      setIsDeleteModalOpen(false);
      setSelectedPackage(null);
      await loadData();
    } catch (error) {
      console.error("Unable to delete package:", error);
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to delete package",
        description: "An error occurred while deleting the package.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const discountAmount = Math.max(
    0,
    Number(form.pricesWithoutDiscounts || 0) - Number(form.basPrice || 0),
  );

  const discountPercentage = Number(form.pricesWithoutDiscounts)
    ? Math.max(
        0,
        Math.round(
          (discountAmount / Number(form.pricesWithoutDiscounts)) * 100,
        ),
      )
    : 0;

  const showingFrom =
    filteredPackages.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(
    currentPage * itemsPerPage,
    filteredPackages.length,
  );

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
                {isSubmitting ? "Processing..." : "Loading packages..."}
              </p>
            </div>
          </div>,
          document.body,
        )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm shadow-blue-900/20">
              <PackageCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Car Wash Packages
              </h1>
              <p className="text-sm text-slate-500">
                Combine services and manage package discounts and availability.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-900 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Add Package
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total Packages"
            value={packages.length}
            icon={<PackageCheck size={20} />}
            iconClassName="bg-blue-50 text-blue-900"
          />
          <SummaryCard
            title="Active Packages"
            value={activePackages}
            icon={<CheckCircle2 size={20} />}
            iconClassName="bg-emerald-50 text-emerald-600"
          />
          <SummaryCard
            title="Average Discount"
            value={averageDiscount}
            suffix="%"
            icon={<Percent size={20} />}
            iconClassName="bg-amber-50 text-amber-600"
          />
        </div>

        <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search packages or services..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">
                {filteredPackages.length}
              </span>{" "}
              packages
            </p>
          </div>

          <div className="hidden overflow-visible md:block">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  {[
                    "Package",
                    "Included Services",
                    "Regular Price",
                    "Package Price",
                    "Status",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                        heading === "Action" ? "text-right" : "text-left"
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPackages.length ? (
                  paginatedPackages.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {item.image ? (
                              <img
                                src={getImageSource(item.image)}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-400">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-semibold text-slate-900">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.services.length} service
                              {item.services.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-sm px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.services.slice(0, 3).map((service) => (
                            <span
                              key={service.id}
                              className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800"
                            >
                              {service.title}
                            </span>
                          ))}
                          {item.services.length > 3 && (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                              +{item.services.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-500 line-through">
                        {formatPrice(item.pricesWithoutDiscounts)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                          {formatPrice(item.basPrice)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="relative px-5 py-4">
                        <div
                          ref={openMenuId === item.id ? menuRef : null}
                          className="flex justify-end"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((previous) =>
                                previous === item.id ? null : item.id,
                              )
                            }
                            className="flex h-9 w-9 items-center cursor-pointer justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-900 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openMenuId === item.id && (
                            <div className="absolute right-5 top-14 z-50 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                              <ActionButton
                                icon={<Eye size={16} />}
                                label="View"
                                onClick={() => {
                                  setSelectedPackage(item);
                                  setIsViewModalOpen(true);
                                  setOpenMenuId(null);
                                }}
                              />
                              <ActionButton
                                icon={<Edit3 size={16} />}
                                label="Edit"
                                onClick={() => openEditModal(item)}
                              />
                              <ActionButton
                                icon={<Trash2 size={16} />}
                                label="Delete"
                                danger
                                onClick={() => {
                                  setSelectedPackage(item);
                                  setIsDeleteModalOpen(true);
                                  setOpenMenuId(null);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {paginatedPackages.length ? (
              paginatedPackages.map((item) => (
                <article key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {item.image ? (
                        <img
                          src={getImageSource(item.image)}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <ImageIcon size={22} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 font-semibold text-emerald-600">
                        {formatPrice(item.basPrice)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackage(item);
                        setIsViewModalOpen(true);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
                    >
                      <Eye size={17} />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.services.map((service) => (
                      <span
                        key={service.id}
                        className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-800"
                      >
                        {service.title}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700"
                    >
                      <Edit3 size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackage(item);
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-semibold text-red-600"
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState />
            )}
          </div>

          {!isLoading && filteredPackages.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <strong className="text-slate-700">{showingFrom}</strong> to{" "}
                  <strong className="text-slate-700">{showingTo}</strong> of{" "}
                  <strong className="text-slate-700">
                    {filteredPackages.length}
                  </strong>
                </p>
                <select
                  value={itemsPerPage}
                  onChange={(event) => {
                    setItemsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                >
                  <option value={5}>5 rows</option>
                  <option value={10}>10 rows</option>
                  <option value={20}>20 rows</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <PaginationButton
                  label="Previous"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                />
                <span className="text-sm font-semibold text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <PaginationButton
                  label="Next"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {isFormModalOpen && (
        <PackageFormModal
          mode={formMode}
          form={form}
          errors={formErrors}
          services={services}
          serviceSearchTerm={serviceSearchTerm}
          imagePreview={imagePreview}
          isDragging={isDragging}
          isSubmitting={isSubmitting}
          discountAmount={discountAmount}
          discountPercentage={discountPercentage}
          formatPrice={formatPrice}
          onChange={updateField}
          onToggleService={toggleService}
          onServiceSearchChange={setServiceSearchTerm}
          onFileChange={handleFileChange}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onRemoveImage={() => {
            setSelectedImage(null);
            setImagePreview("");
          }}
          onClose={closeFormModal}
          onSubmit={handleSubmit}
        />
      )}

      {isViewModalOpen && selectedPackage && (
        <ViewPackageModal
          item={selectedPackage}
          formatPrice={formatPrice}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedPackage(null);
          }}
        />
      )}

      {isDeleteModalOpen && selectedPackage && (
        <DeletePackageModal
          item={selectedPackage}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (isSubmitting) return;
            setIsDeleteModalOpen(false);
            setSelectedPackage(null);
          }}
          onDelete={() => void handleDelete()}
        />
      )}
    </main>
  );
}

type PackageFormModalProps = {
  mode: "add" | "edit";
  form: PackageForm;
  errors: FormErrors;
  services: ServiceOption[];
  serviceSearchTerm: string;
  imagePreview: string;
  isDragging: boolean;
  isSubmitting: boolean;
  discountAmount: number;
  discountPercentage: number;
  formatPrice: (price: number) => string;
  onChange: <K extends keyof PackageForm>(
    field: K,
    value: PackageForm[K],
  ) => void;
  onToggleService: (serviceId: string) => void;
  onServiceSearchChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onRemoveImage: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function PackageFormModal({
  mode,
  form,
  errors,
  services,
  serviceSearchTerm,
  imagePreview,
  isDragging,
  isSubmitting,
  discountAmount,
  discountPercentage,
  formatPrice,
  onChange,
  onToggleService,
  onServiceSearchChange,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onClose,
  onSubmit,
}: PackageFormModalProps) {
  const filteredServices = services.filter((service) =>
    service.title
      .toLowerCase()
      .includes(serviceSearchTerm.trim().toLowerCase()),
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white">
              {mode === "add" ? <Plus size={21} /> : <Edit3 size={20} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {mode === "add"
                  ? "Add Car Wash Package"
                  : "Edit Car Wash Package"}
              </h2>
              <p className="text-sm text-slate-500">
                Add package details, pricing and included services.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <FormField
                  label="Package Title"
                  value={form.title}
                  placeholder="Enter package title"
                  required
                  error={errors.title}
                  onChange={(value) => onChange("title", value)}
                />

                <FormTextArea
                  label="Description"
                  value={form.description}
                  placeholder="Describe the package and its benefits"
                  required
                  error={errors.description}
                  onChange={(value) => onChange("description", value)}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Package Price"
                    value={form.basPrice}
                    placeholder="Enter discounted package price"
                    type="number"
                    required
                    error={errors.basPrice}
                    onChange={(value) => onChange("basPrice", value)}
                  />
                  <FormField
                    label="Regular Total Price"
                    value={form.pricesWithoutDiscounts}
                    placeholder="Select services to calculate"
                    type="number"
                    required
                    readOnly
                    error={errors.pricesWithoutDiscounts}
                    onChange={() => {}}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <PriceInfo
                    title="Package price"
                    value={formatPrice(Number(form.basPrice || 0))}
                  />
                  <PriceInfo
                    title="Customer saves"
                    value={formatPrice(discountAmount)}
                  />
                  <PriceInfo
                    title="Discount"
                    value={`${discountPercentage}%`}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Included Services <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs font-medium text-slate-500">
                      {form.serviceIds.length} selected
                    </span>
                  </div>

                  <div
                    className={`overflow-hidden rounded-2xl border ${errors.serviceIds ? "border-red-300" : "border-slate-200"}`}
                  >
                    <div className="relative border-b border-slate-200 bg-slate-50 p-3">
                      <Search
                        size={16}
                        className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={serviceSearchTerm}
                        onChange={(event) =>
                          onServiceSearchChange(event.target.value)
                        }
                        placeholder="Search available services..."
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto p-3">
                      {filteredServices.length ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {filteredServices.map((service) => {
                            const selected = form.serviceIds.includes(
                              service.id,
                            );
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => onToggleService(service.id)}
                                className={`flex items-center cursor-pointer gap-3 rounded-xl border p-3 text-left transition ${
                                  selected
                                    ? "border-blue-300 bg-blue-50"
                                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                                }`}
                              >
                                <div
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? "border-blue-900 bg-blue-900 text-white" : "border-slate-300"}`}
                                >
                                  {selected && <Check size={13} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {service.title}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {formatPrice(service.price)}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="py-8 text-center text-sm text-slate-500">
                          No services found.
                        </p>
                      )}
                    </div>
                  </div>
                  {errors.serviceIds && (
                    <p className="mt-1.5 text-xs font-medium text-red-600">
                      {errors.serviceIds}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Package Image <span className="text-red-500">*</span>
                  </label>
                  {imagePreview ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <img
                        src={imagePreview}
                        alt="Package preview"
                        className="h-60 w-full object-cover"
                      />
                      <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
                        <label className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <UploadCloud size={15} /> Replace
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
                      className={`flex min-h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
                        isDragging
                          ? "border-blue-500 bg-blue-50"
                          : errors.image
                            ? "border-red-300 bg-red-50/30"
                            : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40"
                      }`}
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-900">
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
                      <label className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-lg bg-blue-900 px-4 text-xs font-semibold text-white hover:bg-blue-700">
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

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Package Status
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Inactive packages will not be available to customers.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isActive}
                      onClick={() => onChange("isActive", !form.isActive)}
                      className={`relative h-7 w-12 cursor-pointer shrink-0 rounded-full transition ${form.isActive ? "bg-blue-900" : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${form.isActive ? "left-6" : "left-1"}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Saving
                </>
              ) : (
                <>
                  {mode === "add" ? <Plus size={17} /> : <Check size={17} />}
                  {mode === "add" ? "Add Package" : "Save Changes"}
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

function ViewPackageModal({
  item,
  formatPrice,
  onClose,
}: {
  item: PackageItem;
  formatPrice: (price: number) => string;
  onClose: () => void;
}) {
  const savings = Math.max(0, item.pricesWithoutDiscounts - item.basPrice);
  const discount =
    item.pricesWithoutDiscounts > 0
      ? Math.round((savings / item.pricesWithoutDiscounts) * 100)
      : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white">
              <Eye size={21} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Package Details
              </h2>
              <p className="text-sm text-slate-500">
                View included services and package pricing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {item.image ? (
              <img
                src={getImageSource(item.image)}
                alt={item.title}
                className="h-72 w-full object-cover"
              />
            ) : (
              <div className="flex h-72 items-center justify-center text-slate-400">
                <ImageIcon size={40} />
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-slate-900">
                  {item.title}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {item.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {item.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm text-slate-400 line-through">
                {formatPrice(item.pricesWithoutDiscounts)}
              </p>
              <p className="text-xl font-bold text-emerald-700">
                {formatPrice(item.basPrice)}
              </p>
              <p className="mt-1 text-xs font-semibold text-amber-600">
                Save {formatPrice(savings)} ({discount}%)
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <Box size={18} className="text-blue-900" /> Included Services
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {item.services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-white">
                    <Check size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {service.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatPrice(service.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DeletePackageModal({
  item,
  isSubmitting,
  onClose,
  onDelete,
}: {
  item: PackageItem;
  isSubmitting: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 size={25} />
        </div>
        <div className="mt-4 text-center">
          <h2 className="text-xl font-bold text-slate-900">Delete Package</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Are you sure you want to delete{" "}
            <strong className="text-slate-800">{item.title}</strong>? This
            action cannot be undone.
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 cursor-pointer flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting}
            className="inline-flex h-11 cursor-pointer flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
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

function FormField({
  label,
  value,
  placeholder,
  error,
  required,
  type = "text",
  readOnly = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  type?: "text" | "number";
  readOnly?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        min={type === "number" ? 1 : undefined}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition focus:ring-4 ${
          readOnly
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600"
            : error
              ? "border-red-400 bg-white focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-100"
        }`}
      />

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}

function FormTextArea({
  label,
  value,
  placeholder,
  error,
  required,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <textarea
        rows={5}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full resize-none rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition focus:ring-4 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"}`}
      />
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  iconClassName,
  suffix = "",
}: {
  title: string;
  value: number;
  icon: ReactNode;
  iconClassName: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">
          {value.toLocaleString()}
          {suffix}
        </p>
      </div>
    </div>
  );
}

function PriceInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function PaginationButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-blue-900 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <PackageCheck size={26} />
      </div>
      <h3 className="font-semibold text-slate-900">No packages found</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        No packages match the current search, or no car wash packages have been
        created yet.
      </p>
    </div>
  );
}

function CustomAlert({
  alert,
  onClose,
}: {
  alert: AlertState;
  onClose: () => void;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
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
        className="rounded-lg p-1 cursor-pointer hover:bg-black/5"
      >
        <X size={17} />
      </button>
    </div>
  );
}
