import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ImageIcon,
  Loader2,
  Phone,
  RefreshCw,
  Scissors,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { getNextWorkingDays } from "@/services/holidays-api";
import { getServiceItems } from "@/services/salon-services-api";
import {
  checkDayAvailability,
  createSalonBooking,
} from "@/services/salon-booking-api";

/* =========================================================
   Types
   ========================================================= */

type ServiceItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  image?: string | null;
};

type WorkingDay = {
  iso: string;
  weekday: string;
  dayNumber: string;
  month: string;
  isToday: boolean;
};

type AvailableWindow = {
  from: string;
  to: string;
};

type AlertState = {
  visible: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description: string;
};

const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg";
const TIME_SLOT_STEP_MINUTES = 30;

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
  isActive: Boolean(service.isActive),
  image: service.image ?? null,
});

const toIsoDate = (value: unknown): string => {
  const text = String(value ?? "");
  return text.length >= 10 ? text.slice(0, 10) : text;
};

const buildWorkingDays = (rawDates: unknown[]): WorkingDay[] => {
  const todayIso = new Date().toISOString().slice(0, 10);

  return rawDates.map((raw) => {
    const iso = toIsoDate(raw);
    const parsed = new Date(`${iso}T00:00:00`);

    return {
      iso,
      weekday: parsed.toLocaleDateString("en-GB", { weekday: "short" }),
      dayNumber: parsed.toLocaleDateString("en-GB", { day: "2-digit" }),
      month: parsed.toLocaleDateString("en-GB", { month: "short" }),
      isToday: iso === todayIso,
    };
  });
};

const timeStringToMinutes = (value: string): number => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

const minutesToTimeString = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:00`;
};

const formatTimeLabel = (value: string): string => {
  const [hours, minutes] = value.split(":").map(Number);
  const parsed = new Date();
  parsed.setHours(hours, minutes, 0, 0);

  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const buildTimeSlots = (windows: AvailableWindow[]): string[] => {
  const slots = new Set<string>();

  windows.forEach((window) => {
    const fromMinutes = timeStringToMinutes(window.from);
    const toMinutes = timeStringToMinutes(window.to);

    if (toMinutes <= fromMinutes) {
      slots.add(minutesToTimeString(fromMinutes));
      return;
    }

    for (
      let minute = fromMinutes;
      minute <= toMinutes;
      minute += TIME_SLOT_STEP_MINUTES
    ) {
      slots.add(minutesToTimeString(minute));
    }

    // Always include the exact last bookable start time too.
    slots.add(minutesToTimeString(toMinutes));
  });

  return Array.from(slots).sort(
    (a, b) => timeStringToMinutes(a) - timeStringToMinutes(b),
  );
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
  }).format(price);

// Accepts local Sri Lankan mobile/landline numbers: 0 followed by 9 digits,
// e.g. 0771234567 (10 digits total).
const SRI_LANKA_PHONE_REGEX = /^0[1-9][0-9]{8}$/;

const isValidSriLankanPhone = (value: string) => {
  const normalized = value.replace(/[\s-]/g, "");
  return SRI_LANKA_PHONE_REGEX.test(normalized);
};

const extractResponseData = (payload: unknown): any => {
  const record =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  const additionalData = record.additionalData as
    | Record<string, unknown>
    | undefined;

  return (
    additionalData?.Response ??
    additionalData?.response ??
    record.response ??
    payload
  );
};

/* =========================================================
   Salon Booking Page
   ========================================================= */

export default function SalonBookingPage() {
  const navigate = useNavigate();

  const dayendData = localStorage.getItem("dayEndData")
    ? JSON.parse(localStorage.getItem("dayEndData") as string)
    : null;

  useEffect(() => {
    if (!dayendData) {
      navigate("/dayend");
    }
  }, [dayendData]);

  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [isLoadingDays, setIsLoadingDays] = useState(true);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentType, setPaymentType] = useState<1 | 2>(1);
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<{
    customerName?: string;
    phoneNumber?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [pageAlert, setPageAlert] = useState<AlertState>({
    visible: false,
    variant: "success",
    title: "",
    description: "",
  });

  /* =========================================================
     Load working days
     ========================================================= */

  const loadWorkingDays = async () => {
    try {
      setIsLoadingDays(true);
      // getNextWorkingDays treats the given date as exclusive, so pass
      // yesterday to include today as the first selectable working day.
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startDate = yesterday.toISOString().slice(0, 10);
      const response = await getNextWorkingDays(startDate, 7);
      const rows = Array.isArray(response) ? response : [];
      const days = buildWorkingDays(rows);

      setWorkingDays(days);
      setSelectedDate((previous) => previous || days[0]?.iso || "");
    } catch (error) {
      console.error("Unable to load working days:", error);
      setWorkingDays([]);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to load available days",
        description: "Please refresh and try again.",
      });
    } finally {
      setIsLoadingDays(false);
    }
  };

  useEffect(() => {
    void loadWorkingDays();
  }, []);

  /* =========================================================
     Load services
     ========================================================= */

  const loadServices = async () => {
    try {
      setIsLoadingServices(true);
      const response = await getServiceItems();
      const rows = Array.isArray(response) ? response : [];

      setServices(
        rows.map(normalizeService).filter((service) => service.isActive),
      );
    } catch (error) {
      console.error("Unable to load services:", error);
      setServices([]);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to load services",
        description: "Please refresh and try again.",
      });
    } finally {
      setIsLoadingServices(false);
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

  /* =========================================================
     Derived selections
     ========================================================= */

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds],
  );

  const totalDurationMinutes = selectedServices.reduce(
    (sum, service) => sum + service.durationMinutes,
    0,
  );

  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0,
  );

  const canPickTime = Boolean(selectedDate) && selectedServiceIds.length > 0;

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((previous) =>
      previous.includes(serviceId)
        ? previous.filter((id) => id !== serviceId)
        : [...previous, serviceId],
    );
    setSelectedTime("");
  };

  /* =========================================================
     Availability
     ========================================================= */

  const fetchAvailability = async (date: string, serviceIds: string[]) => {
    const response = await checkDayAvailability(date, serviceIds);
    const data = extractResponseData(response);
    const windows: AvailableWindow[] = Array.isArray(data?.availableWindows)
      ? data.availableWindows
      : [];

    return {
      slots: buildTimeSlots(windows),
      message: String(data?.message ?? "No available time slots found."),
    };
  };

  useEffect(() => {
    if (!selectedDate || selectedServiceIds.length === 0) {
      setAvailableSlots([]);
      setAvailabilityMessage("");
      setSelectedTime("");
      return;
    }

    let isCancelled = false;

    const loadAvailability = async () => {
      try {
        setIsCheckingAvailability(true);
        setSelectedTime("");

        const { slots, message } = await fetchAvailability(
          selectedDate,
          selectedServiceIds,
        );

        if (isCancelled) return;

        setAvailableSlots(slots);
        setAvailabilityMessage(message);
      } catch (error) {
        console.error("Unable to check availability:", error);

        if (isCancelled) return;

        setAvailableSlots([]);
        setAvailabilityMessage(
          "Unable to check availability right now. Please try again.",
        );
      } finally {
        if (!isCancelled) setIsCheckingAvailability(false);
      }
    };

    void loadAvailability();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, selectedServiceIds]);

  /* =========================================================
     Submission
     ========================================================= */

  const validateForm = () => {
    const errors: { customerName?: string; phoneNumber?: string } = {};

    if (!customerName.trim()) {
      errors.customerName = "Customer name is required.";
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required.";
    } else if (!isValidSriLankanPhone(phoneNumber)) {
      errors.phoneNumber =
        "Enter a valid Sri Lankan phone number (e.g. 0771234567).";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canSubmit =
    Boolean(selectedDate) &&
    selectedServiceIds.length > 0 &&
    Boolean(selectedTime) &&
    Boolean(customerName.trim()) &&
    isValidSriLankanPhone(phoneNumber);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm() || !canSubmit) return;

    try {
      setIsSubmitting(true);

      // Re-check availability right before booking — the previously fetched
      // slot may have just been taken by another cashier in the meantime.
      const { slots: freshSlots, message: freshMessage } =
        await fetchAvailability(selectedDate, selectedServiceIds);

      setAvailableSlots(freshSlots);
      setAvailabilityMessage(freshMessage);

      if (!freshSlots.includes(selectedTime)) {
        setSelectedTime("");

        setPageAlert({
          visible: true,
          variant: "warning",
          title: "Time no longer available",
          description:
            "That time was just booked by someone else. Please choose another available time.",
        });

        return;
      }

      const payload = {
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        memberId: null,
        bookingDate: selectedDate,
        startTime: selectedTime,
        status: 2, // Confirmed
        totalAmount: totalPrice,
        discountAmount: 0,
        notes: notes.trim() || null,
        paymentType,
        services: selectedServices.map((service) => ({
          saloonServiceId: service.id,
          price: service.price,
          discountAmount: 0,
        })),
      };

      await createSalonBooking(payload);

      setShowSuccessModal(true);
      setSelectedServiceIds([]);
      setSelectedTime("");
      setCustomerName("");
      setPhoneNumber("");
      setNotes("");
      setPaymentType(1);
    } catch (error: any) {
      console.error("Unable to create booking:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Unable to create booking",
        description:
          error?.response?.data?.message ||
          "An error occurred while creating the booking.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingDays || isLoadingServices;

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
                {isSubmitting ? "Creating booking..." : "Loading..."}
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
              <CalendarClock size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                New Booking
              </h1>
              <p className="text-sm text-slate-500">
                Pick a day, choose services, and confirm a time for your
                customer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            disabled={isLoading}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Date */}
          <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-[0_12px_35px_rgba(91,33,182,0.07)] sm:p-6">
            <SectionHeading
              step={1}
              title="Select a Day"
              description="Choose from the next available working days."
            />

            {workingDays.length === 0 && !isLoadingDays ? (
              <p className="mt-3 text-sm text-slate-500">
                No upcoming working days found.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-7 gap-2 sm:gap-3">
                {workingDays.map((day) => {
                  const isSelected = day.iso === selectedDate;

                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => setSelectedDate(day.iso)}
                      className={`flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 transition sm:h-24 ${
                        isSelected
                          ? "border-purple-500 bg-purple-500 text-white shadow-lg shadow-purple-200"
                          : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide ${
                          isSelected ? "text-purple-100" : "text-slate-400"
                        }`}
                      >
                        {day.weekday}
                      </span>
                      <span className="mt-1 text-xl font-black">
                        {day.dayNumber}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isSelected ? "text-purple-100" : "text-slate-400"
                        }`}
                      >
                        {day.month}
                      </span>
                      {day.isToday && (
                        <span
                          className={`mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-purple-50 text-purple-600"
                          }`}
                        >
                          Today
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Step 2: Services */}
          <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-[0_12px_35px_rgba(91,33,182,0.07)] sm:p-6">
            <SectionHeading
              step={2}
              title="Select Services"
              description="Pick one or more services for this appointment."
            />

            {services.length === 0 && !isLoadingServices ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <Scissors size={22} className="text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  No active services available yet.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                        isSelected
                          ? "border-purple-500 bg-purple-50/70 shadow-md shadow-purple-100"
                          : "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40"
                      }`}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {service.image ? (
                          <img
                            src={getBase64ImageSource(service.image)}
                            alt={service.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {service.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} className="text-purple-400" />
                            {formatDuration(service.durationMinutes)}
                          </span>
                          <span className="font-semibold text-purple-700">
                            {formatPrice(service.price)}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedServices.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-purple-50/70 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-800">
                  <Clock size={13} />
                  Total duration: {formatDuration(totalDurationMinutes)}
                </div>
                <div className="text-sm font-black text-purple-700">
                  {formatPrice(totalPrice)}
                </div>
              </div>
            )}
          </section>

          {/* Step 3: Time */}
          {canPickTime && (
            <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-[0_12px_35px_rgba(91,33,182,0.07)] sm:p-6">
              <SectionHeading
                step={3}
                title="Select a Time"
                description="Available times are calculated across every seat."
              />

              {isCheckingAvailability ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin text-purple-500" />
                  Checking availability...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
                  <AlertCircle size={16} className="shrink-0" />
                  {availabilityMessage || "No available time slots."}
                </div>
              ) : (
                <>
                  <p className="mt-1 text-xs font-medium text-purple-600">
                    {availabilityMessage}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = slot === selectedTime;

                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border-2 px-4 text-sm font-semibold transition ${
                            isSelected
                              ? "border-purple-500 bg-purple-500 text-white shadow-md shadow-purple-200"
                              : "border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50"
                          }`}
                        >
                          {formatTimeLabel(slot)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {/* Step 4: Customer Details */}
          {canPickTime && (
          <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-[0_12px_35px_rgba(91,33,182,0.07)] sm:p-6">
            <SectionHeading
              step={4}
              title="Customer Details"
              description="Who is this appointment for?"
            />

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Customer Name"
                icon={<User size={16} />}
                value={customerName}
                placeholder="Enter customer name"
                required
                error={formErrors.customerName}
                onChange={(value) => {
                  setCustomerName(value);
                  if (formErrors.customerName) {
                    setFormErrors((previous) => ({
                      ...previous,
                      customerName: undefined,
                    }));
                  }
                }}
              />

              <FormField
                label="Phone Number"
                icon={<Phone size={16} />}
                value={phoneNumber}
                placeholder="e.g. 0771234567"
                type="tel"
                maxLength={10}
                required
                error={formErrors.phoneNumber}
                onChange={(value) => {
                  setPhoneNumber(value);
                  if (formErrors.phoneNumber) {
                    setFormErrors((previous) => ({
                      ...previous,
                      phoneNumber: undefined,
                    }));
                  }
                }}
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Payment Method
              </label>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentType(1)}
                  className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold transition ${
                    paymentType === 1
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-purple-300"
                  }`}
                >
                  <Banknote size={16} />
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType(2)}
                  className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold transition ${
                    paymentType === 2
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-purple-300"
                  }`}
                >
                  <CreditCard size={16} />
                  Card
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Notes{" "}
                <span className="text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Any additional notes for this booking..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
            </div>
          </section>
          )}

          {/* Summary + Submit */}
          <section className="sticky bottom-4 rounded-2xl border border-purple-200 bg-white p-4 shadow-[0_20px_50px_rgba(91,33,182,0.16)] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-500" />
                  {selectedServices.length} service
                  {selectedServices.length === 1 ? "" : "s"}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-purple-500" />
                  {formatDuration(totalDurationMinutes)}
                </span>

                <span className="text-base font-black text-purple-700">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-6 text-sm font-bold text-white shadow-lg shadow-purple-300/30 transition hover:from-[#8B5CF6] hover:to-[#6D28D9] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
      </div>

      {showSuccessModal &&
        createPortal(
          <SuccessModal onClose={() => setShowSuccessModal(false)} />,
          document.body,
        )}
    </main>
  );
}

/* =========================================================
   Section Heading
   ========================================================= */

function SectionHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-sm font-bold text-white">
        {step}
      </span>

      <div>
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">
          {title}
        </h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

/* =========================================================
   Form Field
   ========================================================= */

function FormField({
  label,
  icon,
  value,
  placeholder,
  required,
  error,
  type = "text",
  maxLength,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  required?: boolean;
  error?: string;
  type?: "text" | "tel";
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400">
          {icon}
        </div>

        <input
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
          }`}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}

/* =========================================================
   Success Modal
   ========================================================= */

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={34} />
        </div>

        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Booking Confirmed
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          The appointment has been booked successfully.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-sm font-semibold text-white transition hover:from-[#8B5CF6] hover:to-[#6D28D9]"
        >
          Book Another
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Custom Alert
   ========================================================= */

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
