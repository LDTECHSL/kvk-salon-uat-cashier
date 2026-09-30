import { useEffect, useMemo, useRef, useState } from "react";
import {
  Coffee,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Image as ImageIcon,
  ChevronDown,
  Check,
  Clock,
  Utensils,
  MoreVertical,
  Loader2,
  Eye,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItems,
  updateMenuItem,
} from "@/services/cafe-menu-api";

type MenuTab = "coffee" | "meals";

/* =========================================================
   IMAGE
========================================================= */

const getBase64ImageSrc = (base64: string | null | undefined): string => {
  if (!base64) return "";

  if (base64.startsWith("data:image/")) {
    return base64;
  }

  return `data:image/png;base64,${base64}`;
};

/* =========================================================
   TYPES
========================================================= */

interface CoffeeItem {
  id: number;
  name: string;
  image?: string;
  price: number;
  description: string;
  facts: string;
  ingredients: string[];
  category?: number;
  isActive?: boolean;
}

interface MealItem {
  id: number;
  name: string;
  image?: string;
  price: number;
  description: string;
  facts: string;

  // Backend returns meal includes inside "ingredients"
  includes: string[];

  preparationTimeInMinutes: number;
  portionSize: string;

  category?: number;
  isActive?: boolean;
}

interface FormData {
  name: string;
  image: File | null;
  imagePreview: string;
  price: string;
  description: string;
  facts: string;

  ingredients: string[];

  includes: string[];
  preparationTimeInMinutes: string;
  portionSize: string;
}

const ingredientOptions = [
  "Coffee",
  "Espresso",
  "Milk",
  "Sugar",
  "Water",
  "Ice",
  "Chocolate",
  "Vanilla",
  "Caramel",
  "Whipped Cream",
  "Cinnamon",
  "Honey",
];

const emptyForm: FormData = {
  name: "",
  image: null,
  imagePreview: "",
  price: "",
  description: "",
  facts: "",
  ingredients: [],
  includes: [],
  preparationTimeInMinutes: "",
  portionSize: "",
};

/* =========================================================
   ALERT
========================================================= */

type AlertState = {
  visible: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description: string;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState<MenuTab>("coffee");

  const [coffeeItems, setCoffeeItems] = useState<CoffeeItem[]>([]);

  const [mealItems, setMealItems] = useState<MealItem[]>([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormData>(emptyForm);

  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);

  const [includeText, setIncludeText] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [viewingItem, setViewingItem] = useState<CoffeeItem | MealItem | null>(
    null,
  );

  const [deletingItem, setDeletingItem] = useState<CoffeeItem | MealItem | null>(
    null,
  );

  const [pageAlert, setPageAlert] = useState<AlertState>({
    visible: false,
    variant: "success",
    title: "",
    description: "",
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  /* =========================================================
     FILTERING
  ========================================================= */

  const filteredCoffeeItems = useMemo(() => {
    return coffeeItems.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [coffeeItems, search]);

  const filteredMealItems = useMemo(() => {
    return mealItems.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [mealItems, search]);

  const paginatedCoffeeItems = useMemo(() => {
    const totalPageCount = Math.max(1, Math.ceil(filteredCoffeeItems.length / itemsPerPage));
    if (currentPage > totalPageCount) {
      setCurrentPage(totalPageCount);
    }

    const start = (currentPage - 1) * itemsPerPage;
    return filteredCoffeeItems.slice(start, start + itemsPerPage);
  }, [currentPage, filteredCoffeeItems, itemsPerPage]);

  const paginatedMealItems = useMemo(() => {
    const totalPageCount = Math.max(1, Math.ceil(filteredMealItems.length / itemsPerPage));
    if (currentPage > totalPageCount) {
      setCurrentPage(totalPageCount);
    }

    const start = (currentPage - 1) * itemsPerPage;
    return filteredMealItems.slice(start, start + itemsPerPage);
  }, [currentPage, filteredMealItems, itemsPerPage]);

  const totalPages =
    (activeTab === "coffee" ? filteredCoffeeItems.length : filteredMealItems.length) === 0
      ? 1
      : Math.ceil(
          (activeTab === "coffee" ? filteredCoffeeItems.length : filteredMealItems.length) /
            itemsPerPage,
        );

  const activeItems = activeTab === "coffee" ? filteredCoffeeItems : filteredMealItems;
  const showingFrom = activeItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, activeItems.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =========================================================
     LOAD MENU ITEMS
  ========================================================= */

  const loadMenuItems = async (category: number) => {
    try {
      setIsLoading(true);

      const response = await getMenuItems(category);

      const data =
        response?.additionalData?.response ??
        response?.response ??
        response ??
        [];

      const mappedData = Array.isArray(data)
        ? data.map((item: any) => {
            const parsedIngredients =
              typeof item.ingredients === "string"
                ? item.ingredients
                    .split(",")
                    .map((x: string) => x.trim())
                    .filter(Boolean)
                : Array.isArray(item.ingredients)
                  ? item.ingredients
                  : [];

            const itemCategory = Number(item.category ?? category);

            return {
              ...item,

              category: itemCategory,

              ingredients: itemCategory === 4 ? parsedIngredients : [],

              includes: itemCategory === 1 ? parsedIngredients : [],
            };
          })
        : [];

      if (category === 4) {
        setCoffeeItems(mappedData as CoffeeItem[]);
      }

      if (category === 1) {
        setMealItems(mappedData as MealItem[]);
      }
    } catch (error) {
      console.error("Failed to load menu items:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Failed to Load Menu",
        description: "Unable to load menu items. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadMenuItems(4);
  }, []);

  /* =========================================================
     MODAL
  ========================================================= */

  const openAddModal = () => {
    setEditingId(null);

    setFormData({
      ...emptyForm,
      ingredients: [],
      includes: [],
    });

    setIncludeText("");
    setShowIngredientDropdown(false);
    setShowModal(true);
  };

  const openEditModal = (item: CoffeeItem | MealItem) => {
    setEditingId(item.id);

    const itemCategory = Number(item.category);

    /* =====================================================
     COFFEE
  ===================================================== */

    if (itemCategory === 4 || activeTab === "coffee") {
      const coffee = item as CoffeeItem;

      setFormData({
        name: coffee.name ?? "",

        // IMPORTANT:
        // Existing image is only for preview.
        // Do not send it back unless user selects a new image.
        image: null,

        imagePreview: getBase64ImageSrc(coffee.image),

        price:
          coffee.price !== undefined && coffee.price !== null
            ? String(coffee.price)
            : "",

        description: coffee.description ?? "",

        facts: coffee.facts ?? "",

        ingredients: Array.isArray(coffee.ingredients)
          ? coffee.ingredients
          : typeof (coffee as any).ingredients === "string"
            ? (coffee as any).ingredients
                .split(",")
                .map((x: string) => x.trim())
                .filter(Boolean)
            : [],

        includes: [],

        preparationTimeInMinutes: "",

        portionSize: "",
      });
    } else {
      /* =====================================================
     MEAL
  ===================================================== */
      const meal = item as MealItem;

      /*
       * Backend returns meal includes as:
       *
       * ingredients: "Egg,Bread,Tea"
       *
       * Convert that into:
       *
       * includes: ["Egg", "Bread", "Tea"]
       */

      let mealIncludes: string[] = [];

      if (Array.isArray(meal.includes)) {
        mealIncludes = meal.includes;
      } else if (typeof (meal as any).ingredients === "string") {
        mealIncludes = (meal as any).ingredients
          .split(",")
          .map((x: string) => x.trim())
          .filter(Boolean);
      }

      setFormData({
        name: meal.name ?? "",

        // Existing image is only preview.
        image: null,

        imagePreview: getBase64ImageSrc(meal.image),

        price:
          meal.price !== undefined && meal.price !== null
            ? String(meal.price)
            : "",

        description: meal.description ?? "",

        facts: meal.facts ?? "",

        ingredients: [],

        includes: mealIncludes,

        preparationTimeInMinutes:
          meal.preparationTimeInMinutes !== undefined &&
          meal.preparationTimeInMinutes !== null
            ? String(meal.preparationTimeInMinutes)
            : "",

        portionSize:
          meal.portionSize !== undefined && meal.portionSize !== null
            ? String(meal.portionSize)
            : "",
      });
    }

    setIncludeText("");
    setShowIngredientDropdown(false);
    setShowModal(true);
  };

  const openViewModal = (item: CoffeeItem | MealItem) => {
    setViewingItem(item);
    setIsViewModalOpen(true);
    setOpenMenuId(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);

    setFormData({
      ...emptyForm,
      ingredients: [],
      includes: [],
    });

    setIncludeText("");
    setShowIngredientDropdown(false);
  };

  /* =========================================================
     IMAGE
  ========================================================= */

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Invalid Image",
        description: "Please select a PNG, JPG or WEBP image.",
      });

      return;
    }

    setFormData((prev) => ({
      ...prev,
      image: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  /* =========================================================
     INGREDIENTS
  ========================================================= */

  const toggleIngredient = (ingredient: string) => {
    setFormData((prev) => {
      const exists = prev.ingredients.includes(ingredient);

      return {
        ...prev,

        ingredients: exists
          ? prev.ingredients.filter((x) => x !== ingredient)
          : [...prev.ingredients, ingredient],
      };
    });
  };

  /* =========================================================
     MEAL INCLUDES
  ========================================================= */

  const addInclude = () => {
    const value = includeText.trim();

    if (!value) return;

    setFormData((prev) => ({
      ...prev,

      /*
       * Prevent duplicate includes
       */
      includes: prev.includes.includes(value)
        ? prev.includes
        : [...prev.includes, value],
    }));

    setIncludeText("");
  };

  const removeInclude = (index: number) => {
    setFormData((prev) => ({
      ...prev,

      includes: prev.includes.filter((_, i) => i !== index),
    }));
  };

  /* =========================================================
     BUILD FORM DATA
  ========================================================= */

  const buildMenuFormData = () => {
    const data = new FormData();

    /*
     * ID
     */
    data.append("id", editingId?.toString() ?? "0");

    /*
     * Common fields
     */
    data.append("name", formData.name.trim());

    data.append("price", Number(formData.price).toString());

    data.append("description", formData.description?.trim() ?? "");

    data.append("facts", formData.facts?.trim() ?? "");

    /* =====================================================
       COFFEE
    ===================================================== */

    if (activeTab === "coffee") {
      data.append("ingredients", formData.ingredients.join(","));

      data.append("category", "4");

      data.append("preparationTimeInMinutes", "0");

      data.append("portionSize", "0");
    } else {
      /* =====================================================
       MEALS
    ===================================================== */
      /*
       * IMPORTANT:
       *
       * Backend expects meal Includes
       * inside the "ingredients" field.
       *
       * Example:
       *
       * includes:
       * [
       *   "ffff",
       *   "eeeee",
       *   "trytr"
       * ]
       *
       * becomes:
       *
       * ingredients:
       * "ffff,eeeee,trytr"
       */
      data.append("ingredients", formData.includes.join(","));

      data.append("category", "1");

      data.append(
        "preparationTimeInMinutes",
        Number(formData.preparationTimeInMinutes || 0).toString(),
      );

      data.append("portionSize", formData.portionSize?.trim() || "0");
    }

    /*
     * Active
     */
    data.append("isActive", "true");

    /*
     * IMPORTANT:
     *
     * Only append image when a NEW
     * image has been selected.
     *
     * During edit:
     *
     * image = null
     *
     * means:
     * keep existing database image.
     */
    if (formData.image) {
      data.append("image", formData.image);
    }

    return data;
  };

  /* =========================================================
     CREATE / UPDATE
  ========================================================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!formData.name.trim()) {
      setPageAlert({
        visible: true,
        variant: "warning",
        title: "Item Name Required",
        description: "Please enter the menu item name.",
      });

      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      setPageAlert({
        visible: true,
        variant: "warning",
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
      });

      return;
    }

    if (activeTab === "meals" && !formData.portionSize.trim()) {
      setPageAlert({
        visible: true,
        variant: "warning",
        title: "Portion Required",
        description: "Please enter the meal portion.",
      });

      return;
    }

    if (
      activeTab === "meals" &&
      (!formData.preparationTimeInMinutes ||
        Number(formData.preparationTimeInMinutes) < 0)
    ) {
      setPageAlert({
        visible: true,
        variant: "warning",
        title: "Preparation Time Required",
        description: "Please enter a valid preparation time.",
      });

      return;
    }

    try {
      setIsLoading(true);

      const formDataToSend = buildMenuFormData();

      /* =====================================================
         UPDATE
      ===================================================== */

      if (editingId !== null) {
        await updateMenuItem(formDataToSend);

        setPageAlert({
          visible: true,
          variant: "success",
          title: "Menu Item Updated",
          description: "The menu item has been updated successfully.",
        });
      } else {
        /* =====================================================
         CREATE
      ===================================================== */
        await createMenuItem(formDataToSend);

        setPageAlert({
          visible: true,
          variant: "success",
          title: "Menu Item Created",
          description: "The menu item has been created successfully.",
        });
      }

      /*
       * Reload current category
       */
      await loadMenuItems(activeTab === "coffee" ? 4 : 1);

      closeModal();
    } catch (error) {
      console.error(
        editingId !== null
          ? "Failed to update menu item:"
          : "Failed to create menu item:",
        error,
      );

      setPageAlert({
        visible: true,
        variant: "error",
        title:
          editingId !== null
            ? "Error Updating Menu Item"
            : "Error Creating Menu Item",
        description:
          editingId !== null
            ? "An error occurred while updating the menu item."
            : "An error occurred while creating the menu item.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const openDeleteModal = (item: CoffeeItem | MealItem) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (id: number) => {
    try {
      setIsLoading(true);

      await deleteMenuItem(id.toString());

      if (activeTab === "coffee") {
        setCoffeeItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        setMealItems((prev) => prev.filter((item) => item.id !== id));
      }

      setPageAlert({
        visible: true,
        variant: "success",
        title: "Menu Item Deleted",
        description: "The menu item has been deleted successfully.",
      });

      await loadMenuItems(activeTab === "coffee" ? 4 : 1);
    } catch (error) {
      console.error("Failed to delete menu item:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error Deleting Menu Item",
        description: "An error occurred while deleting the menu item.",
      });
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
    }
  };

  /* =========================================================
     TAB CHANGE
  ========================================================= */

  const handleTabChange = (tab: MenuTab) => {
    setActiveTab(tab);
    setSearch("");
    setCurrentPage(1);
    setOpenMenuId(null);

    loadMenuItems(tab === "coffee" ? 4 : 1);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen">
      {/* =====================================================
          LOADING
      ===================================================== */}

      {isLoading &&
        createPortal(
          <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-white" />

              <p className="text-sm font-medium text-white">
                Loading, please wait...
              </p>
            </div>
          </div>,
          document.body,
        )}

      {/* =====================================================
          ALERT
      ===================================================== */}

      {pageAlert.visible &&
        createPortal(
          <div className="fixed right-4 top-4 z-[99999] w-[calc(100%-2rem)] max-w-md">
            <CustomAlert
              alert={pageAlert}
              onClose={() =>
                setPageAlert((previous) => ({
                  ...previous,
                  visible: false,
                }))
              }
            />
          </div>,
          document.body,
        )}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-[#7A3E18] text-white shadow-sm">
              <Coffee size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#4A2410]">
                Menu Management
              </h1>

              <p className="text-sm text-[#8A5A3C]">
                Manage coffee, breakfast and other meal items
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#7A3E18] px-5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>

        {/* =================================================
            TABS
        ================================================= */}

        <div className="mt-7 rounded-2xl border border-amber-200/70 bg-white/80 p-2 shadow-sm backdrop-blur">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("coffee")}
              className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                activeTab === "coffee"
                  ? "bg-gradient-to-r from-amber-500 to-[#7A3E18] text-white shadow-sm"
                  : "text-[#6B422B] hover:bg-amber-50"
              }`}
            >
              <Coffee size={18} />
              Coffee Items
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("meals")}
              className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                activeTab === "meals"
                  ? "bg-gradient-to-r from-amber-500 to-[#7A3E18] text-white shadow-sm"
                  : "text-[#6B422B] hover:bg-amber-50"
              }`}
            >
              <Utensils size={18} />
              Breakfast & Other Meals
            </button>
          </div>
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="mt-5 overflow-visible rounded-2xl border border-amber-200/70 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-amber-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-[#4A2410]">
                {activeTab === "coffee"
                  ? "Coffee Items"
                  : "Breakfast & Other Meals"}
              </h2>

              <p className="mt-0.5 text-xs text-[#9A6A4A]">
                {activeTab === "coffee"
                  ? `${coffeeItems.length} coffee item${
                      coffeeItems.length !== 1 ? "s" : ""
                    }`
                  : `${mealItems.length} meal item${
                      mealItems.length !== 1 ? "s" : ""
                    }`}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A4775C]"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search menu..."
                className="h-11 w-full rounded-xl border border-amber-200 bg-white pl-10 pr-4 text-sm text-[#4A2410] outline-none transition placeholder:text-[#B9957E] focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />
            </div>
          </div>

          {/* Desktop */}

          <div className="hidden overflow-visible md:block">
            {activeTab === "coffee" ? (
              <CoffeeTable
                items={paginatedCoffeeItems}
                openMenuId={openMenuId}
                menuRef={menuRef}
                onMenuToggle={(id) =>
                  setOpenMenuId((previous) => (previous === id ? null : id))
                }
                onEdit={openEditModal}
                onView={openViewModal}
                onDelete={openDeleteModal}
              />
            ) : (
              <MealTable
                items={paginatedMealItems}
                openMenuId={openMenuId}
                menuRef={menuRef}
                onMenuToggle={(id) =>
                  setOpenMenuId((previous) => (previous === id ? null : id))
                }
                onEdit={openEditModal}
                onView={openViewModal}
                onDelete={openDeleteModal}
              />
            )}

            {!isLoading && activeItems.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-amber-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <p className="text-sm text-[#8A5A3C]">
                    Showing <strong className="text-[#4A2410]">{showingFrom}</strong> to <strong className="text-[#4A2410]">{showingTo}</strong> of <strong className="text-[#4A2410]">{activeItems.length}</strong>
                  </p>

                  <select
                    value={itemsPerPage}
                    onChange={(event) => {
                      setItemsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-lg border border-amber-200 bg-white px-2 text-sm text-[#4A2410] outline-none focus:border-amber-500"
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

                  <span className="text-sm font-semibold text-[#6B422B]">
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
          </div>

          {/* Mobile */}

          <div className="md:hidden">
            {activeTab === "coffee" ? (
              <CoffeeMobileCards
                items={paginatedCoffeeItems}
                openMenuId={openMenuId}
                menuRef={menuRef}
                onMenuToggle={(id) =>
                  setOpenMenuId((previous) => (previous === id ? null : id))
                }
                onEdit={openEditModal}
                onView={openViewModal}
                onDelete={openDeleteModal}
              />
            ) : (
              <MealMobileCards
                items={paginatedMealItems}
                openMenuId={openMenuId}
                menuRef={menuRef}
                onMenuToggle={(id) =>
                  setOpenMenuId((previous) => (previous === id ? null : id))
                }
                onEdit={openEditModal}
                onView={openViewModal}
                onDelete={openDeleteModal}
              />
            )}

            {!isLoading && activeItems.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-amber-100 bg-amber-50/30 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#8A5A3C]">
                    Showing <strong className="text-[#4A2410]">{showingFrom}</strong> to <strong className="text-[#4A2410]">{showingTo}</strong> of <strong className="text-[#4A2410]">{activeItems.length}</strong>
                  </p>

                  <select
                    value={itemsPerPage}
                    onChange={(event) => {
                      setItemsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-lg border border-amber-200 bg-white px-2 text-sm text-[#4A2410] outline-none focus:border-amber-500"
                  >
                    <option value={5}>5 rows</option>
                    <option value={10}>10 rows</option>
                    <option value={20}>20 rows</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <PaginationButton
                    label="Previous"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  />

                  <span className="text-sm font-semibold text-[#6B422B]">
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
          </div>
        </div>
      </div>

      {isDeleteModalOpen && deletingItem && (
        <DeleteMenuItemModal
          item={deletingItem}
          isSubmitting={isLoading}
          onClose={() => {
            if (isLoading) return;
            setIsDeleteModalOpen(false);
            setDeletingItem(null);
          }}
          onDelete={() => void handleDelete(deletingItem.id)}
        />
      )}

      {isViewModalOpen && viewingItem && (
        <ViewMenuItemModal
          item={viewingItem}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingItem(null);
          }}
        />
      )}

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#2D160A]/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-amber-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-[#7A3E18]">
                    {activeTab === "coffee" ? (
                      <Coffee size={20} />
                    ) : (
                      <Utensils size={20} />
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-[#4A2410]">
                      {editingId !== null ? "Edit Menu Item" : "Add Menu Item"}
                    </h2>

                    <p className="text-xs text-[#9A6A4A]">
                      {activeTab === "coffee"
                        ? "Add or update a coffee item"
                        : "Add or update a breakfast or meal item"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-[#8A5A3C] transition hover:bg-amber-50 hover:text-[#7A3E18]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* BODY */}

              <form onSubmit={handleSubmit} className="overflow-y-auto">
                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
                  {/* LEFT */}

                  <div className="space-y-5">
                    {/* NAME */}

                    <FormField label="Name" required>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder={
                          activeTab === "coffee"
                            ? "e.g. Cappuccino"
                            : "e.g. English Breakfast"
                        }
                        className={inputClass}
                      />
                    </FormField>

                    {/* PRICE + PORTION */}

                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField label="Price" required>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8A5A3C]">
                            LKR
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                price: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className={`${inputClass} pl-14`}
                          />
                        </div>
                      </FormField>

                      {activeTab === "meals" && (
                        <FormField label="Portion" required>
                          <input
                            type="text"
                            value={formData.portionSize}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,

                                /*
                                 * FIX:
                                 * was "portion"
                                 *
                                 * must be:
                                 * "portionSize"
                                 */
                                portionSize: e.target.value,
                              }))
                            }
                            placeholder="e.g. 1 person"
                            className={inputClass}
                          />
                        </FormField>
                      )}
                    </div>

                    {/* DESCRIPTION */}

                    <FormField label="Description">
                      <textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Describe this menu item..."
                        className={textareaClass}
                      />
                    </FormField>

                    {/* FACTS */}

                    <FormField label="Facts">
                      <textarea
                        rows={3}
                        value={formData.facts}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            facts: e.target.value,
                          }))
                        }
                        placeholder="Interesting facts about this item..."
                        className={textareaClass}
                      />
                    </FormField>

                    {/* =================================================
                        COFFEE INGREDIENTS
                    ================================================= */}

                    {activeTab === "coffee" && (
                      <FormField label="Ingredients">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setShowIngredientDropdown((prev) => !prev)
                            }
                            className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-amber-200 bg-white px-3 text-left text-sm text-[#5B321D] outline-none transition hover:border-amber-400 focus:border-amber-500"
                          >
                            <div className="flex flex-wrap gap-1.5">
                              {formData.ingredients.length === 0 ? (
                                <span className="text-[#B9957E]">
                                  Select ingredients...
                                </span>
                              ) : (
                                formData.ingredients.map((ingredient) => (
                                  <span
                                    key={ingredient}
                                    className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-[#7A3E18]"
                                  >
                                    {ingredient}
                                  </span>
                                ))
                              )}
                            </div>

                            <ChevronDown size={17} />
                          </button>

                          {showIngredientDropdown && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-y-auto rounded-xl border border-amber-200 bg-white p-2 shadow-xl">
                              {ingredientOptions.map((ingredient) => {
                                const selected =
                                  formData.ingredients.includes(ingredient);

                                return (
                                  <button
                                    key={ingredient}
                                    type="button"
                                    onClick={() => toggleIngredient(ingredient)}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-[#5B321D] hover:bg-amber-50"
                                  >
                                    {ingredient}

                                    {selected && (
                                      <Check
                                        size={16}
                                        className="text-[#7A3E18]"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </FormField>
                    )}

                    {/* =================================================
                        MEAL INCLUDES
                    ================================================= */}

                    {activeTab === "meals" && (
                      <>
                        <FormField label="Includes">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={includeText}
                              onChange={(e) => setIncludeText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addInclude();
                                }
                              }}
                              placeholder="e.g. Toast with butter"
                              className={inputClass}
                            />

                            <button
                              type="button"
                              onClick={addInclude}
                              className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-amber-100 px-4 text-sm font-semibold text-[#7A3E18] hover:bg-amber-200"
                            >
                              <Plus size={16} />
                              Add
                            </button>
                          </div>

                          {formData.includes.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {formData.includes.map((include, index) => (
                                <div
                                  key={`${include}-${index}`}
                                  className="flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5"
                                >
                                  <div className="flex gap-2 text-sm text-[#6B422B]">
                                    <span className="font-semibold text-[#A45C27]">
                                      {index + 1}.
                                    </span>

                                    <span>{include}</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeInclude(index)}
                                    className="shrink-0 cursor-pointer text-[#B56A50] hover:text-red-600"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </FormField>

                        {/* PREPARATION TIME */}

                        <FormField label="Preparation Time" required>
                          <div className="relative">
                            <Clock
                              size={17}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A4775C]"
                            />

                            <input
                              type="number"
                              min="0"
                              value={formData.preparationTimeInMinutes}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  preparationTimeInMinutes: e.target.value,
                                }))
                              }
                              placeholder="e.g. 15"
                              className={`${inputClass} pl-10 pr-20`}
                            />

                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#9A6A4A]">
                              minutes
                            </span>
                          </div>
                        </FormField>
                      </>
                    )}
                  </div>

                  {/* =================================================
                      IMAGE
                  ================================================= */}

                  <div>
                    <FormField label="Image">
                      <label className="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 transition hover:border-amber-400 hover:bg-amber-50">
                        {formData.imagePreview ? (
                          <div className="relative h-full min-h-[280px] w-full">
                            <img
                              src={formData.imagePreview}
                              alt="Preview"
                              className="h-full min-h-[280px] w-full object-cover"
                            />

                            <div className="absolute inset-0 flex items-center justify-center bg-[#2D160A]/40 opacity-0 transition group-hover:opacity-100">
                              <span className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#7A3E18]">
                                Change Image
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-[#7A3E18]">
                              <ImageIcon size={25} />
                            </div>

                            <p className="text-sm font-semibold text-[#6B422B]">
                              Upload Image
                            </p>

                            <p className="mt-1 text-xs text-[#A4775C]">
                              PNG, JPG or WEBP
                            </p>
                          </>
                        )}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </FormField>

                    {/* =================================================
                        MEAL INFO
                    ================================================= */}

                    {activeTab === "meals" && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                        <div className="flex gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#7A3E18]">
                            <Utensils size={17} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-[#5B321D]">
                              Meal Information
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[#9A6A4A]">
                              Add the portion size, preparation time and
                              individual items included with this meal.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =================================================
                        COFFEE INFO
                    ================================================= */}

                    {activeTab === "coffee" &&
                      formData.ingredients.length > 0 && (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                          <p className="text-sm font-semibold text-[#5B321D]">
                            Selected Ingredients
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {formData.ingredients.map((ingredient) => (
                              <span
                                key={ingredient}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-[#7A3E18] shadow-sm ring-1 ring-amber-100"
                              >
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <div className="flex flex-col-reverse gap-3 border-t border-amber-100 bg-amber-50/40 px-6 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-11 cursor-pointer rounded-xl border border-amber-200 bg-white px-5 text-sm font-semibold text-[#6B422B] transition hover:bg-amber-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-11 cursor-pointer rounded-xl bg-gradient-to-r from-amber-500 to-[#7A3E18] px-6 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editingId !== null ? "Update Item" : "Save Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </main>
  );
}

/* =========================================================
   ALERT
========================================================= */

function CustomAlert({
  alert,
  onClose,
}: {
  alert: AlertState;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${styles[alert.variant]}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{alert.title}</p>

        <p className="mt-1 text-sm opacity-80">
          {alert.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-black/5"
      >
        <X size={17} />
      </button>
    </div>
  );
}
/* =========================================================
   COFFEE TABLE
========================================================= */

function CoffeeTable({
  items,
  openMenuId,
  menuRef,
  onMenuToggle,
  onEdit,
  onView,
  onDelete,
}: {
  items: CoffeeItem[];
  openMenuId: number | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onMenuToggle: (id: number) => void;
  onEdit: (item: CoffeeItem) => void;
  onView: (item: CoffeeItem) => void;
  onDelete: (item: CoffeeItem) => void;
}) {
  if (items.length === 0) {
    return <EmptyState type="coffee" />;
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50/80">
          <th className={thClass}>Item</th>

          <th className={thClass}>Price</th>

          <th className={thClass}>Ingredients</th>

          <th className={thClass}>Description</th>

          <th className={`${thClass} text-right`}>Actions</th>
        </tr>
      </thead>

      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="border-b border-slate-200 transition hover:bg-amber-50/40"
          >
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                {item.image ? (
                  <img
                    src={getBase64ImageSrc(item.image)}
                    alt={item.name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-[#7A3E18]">
                    <Coffee size={20} />
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-[#4A2410]">
                    {item.name}
                  </p>

                  <p className="text-xs text-[#A4775C]">Coffee</p>
                </div>
              </div>
            </td>

            <td className="px-5 py-4">
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-700">
                LKR {item.price.toLocaleString()}
              </span>
            </td>

            <td className="max-w-xs px-5 py-4">
              <div className="flex flex-wrap gap-1.5">
                {item.ingredients.slice(0, 3).map((x) => (
                  <span
                    key={x}
                    className="rounded-md bg-amber-50 px-2 py-1 text-xs text-[#7A3E18]"
                  >
                    {x}
                  </span>
                ))}

                {item.ingredients.length > 3 && (
                  <span className="text-xs text-[#A4775C]">
                    +{item.ingredients.length - 3}
                  </span>
                )}
              </div>
            </td>

            <td className="max-w-sm px-5 py-4">
              <p className="truncate text-sm text-[#79543C]">
                {item.description || "—"}
              </p>
            </td>

            <td className="relative px-5 py-4">
              <div
                ref={openMenuId === item.id ? menuRef : null}
                className="flex justify-end"
              >
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onMenuToggle(item.id);
                  }}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-amber-200 text-[#8A5A3C] transition hover:border-amber-400 hover:bg-amber-50 hover:text-[#7A3E18]"
                >
                  <MoreVertical size={18} />
                </button>

                {openMenuId === item.id && (
                  <div className="absolute right-5 top-14 z-50 w-40 rounded-xl border border-amber-200 bg-white p-1.5 shadow-xl">
                    <ActionMenuItem
                      icon={<Eye size={16} />}
                      label="View"
                      onClick={() => onView(item)}
                    />
                    <ActionMenuItem
                      icon={<Edit size={16} />}
                      label="Edit"
                      onClick={() => {
                        onEdit(item);
                        onMenuToggle(item.id);
                      }}
                    />
                    <ActionMenuItem
                      icon={<Trash2 size={16} />}
                      label="Delete"
                      danger
                      onClick={() => {
                        onDelete(item);
                        onMenuToggle(item.id);
                      }}
                    />
                  </div>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* =========================================================
   MEAL TABLE
========================================================= */

function MealTable({
  items,
  openMenuId,
  menuRef,
  onMenuToggle,
  onEdit,
  onView,
  onDelete,
}: {
  items: MealItem[];
  openMenuId: number | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onMenuToggle: (id: number) => void;
  onEdit: (item: MealItem) => void;
  onView: (item: MealItem) => void;
  onDelete: (item: MealItem) => void;
}) {
  if (items.length === 0) {
    return <EmptyState type="meal" />;
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50/80">
          <th className={thClass}>Item</th>

          <th className={thClass}>Price</th>

          <th className={thClass}>Preparation</th>

          <th className={thClass}>Portion</th>

          <th className={thClass}>Includes</th>

          <th className={thClass}>Description</th>

          <th className={`${thClass} text-right`}>Actions</th>
        </tr>
      </thead>

      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="border-b border-amber-50 transition hover:bg-amber-50/40"
          >
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                {item.image ? (
                  <img
                    src={getBase64ImageSrc(item.image)}
                    alt={item.name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-[#7A3E18]">
                    <Utensils size={20} />
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-[#4A2410]">
                    {item.name}
                  </p>

                  <p className="text-xs text-[#A4775C]">Meal</p>
                </div>
              </div>
            </td>

            <td className="px-5 py-4">
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-700">
                LKR {item.price.toLocaleString()}
              </span>
            </td>

            <td className="px-5 py-4">
              <div className="flex items-center gap-1.5 text-sm text-[#6B422B]">
                <Clock size={15} />
                {item.preparationTimeInMinutes} min
              </div>
            </td>

            <td className="px-5 py-4">
              <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-[#7A3E18]">
                {item.portionSize || "—"}
              </span>
            </td>

            <td className="max-w-xs px-5 py-4">
              <div className="flex flex-wrap gap-1.5">
                {item.includes.slice(0, 3).map((include, index) => (
                  <span
                    key={`${include}-${index}`}
                    className="rounded-md bg-amber-50 px-2 py-1 text-xs text-[#7A3E18]"
                  >
                    {include}
                  </span>
                ))}

                {item.includes.length > 3 && (
                  <span className="text-xs text-[#A4775C]">
                    +{item.includes.length - 3}
                  </span>
                )}
              </div>
            </td>

            <td className="max-w-sm px-5 py-4">
              <p className="truncate text-sm text-[#79543C]">
                {item.description || "—"}
              </p>
            </td>

            <td className="relative px-5 py-4">
              <div
                ref={openMenuId === item.id ? menuRef : null}
                className="flex justify-end"
              >
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onMenuToggle(item.id);
                  }}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-amber-200 text-[#8A5A3C] transition hover:border-amber-400 hover:bg-amber-50 hover:text-[#7A3E18]"
                >
                  <MoreVertical size={18} />
                </button>

                {openMenuId === item.id && (
                  <div className="absolute right-5 top-14 z-50 w-40 rounded-xl border border-amber-200 bg-white p-1.5 shadow-xl">
                    <ActionMenuItem
                      icon={<Eye size={16} />}
                      label="View"
                      onClick={() => onView(item)}
                    />
                    <ActionMenuItem
                      icon={<Edit size={16} />}
                      label="Edit"
                      onClick={() => {
                        onEdit(item);
                        onMenuToggle(item.id);
                      }}
                    />
                    <ActionMenuItem
                      icon={<Trash2 size={16} />}
                      label="Delete"
                      danger
                      onClick={() => {
                        onDelete(item);
                        onMenuToggle(item.id);
                      }}
                    />
                  </div>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* =========================================================
   COFFEE MOBILE
========================================================= */

function CoffeeMobileCards({
  items,
  openMenuId,
  menuRef,
  onMenuToggle,
  onEdit,
  onView,
  onDelete,
}: {
  items: CoffeeItem[];
  openMenuId: number | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onMenuToggle: (id: number) => void;
  onEdit: (item: CoffeeItem) => void;
  onView: (item: CoffeeItem) => void;
  onDelete: (item: CoffeeItem) => void;
}) {
  if (items.length === 0) {
    return <EmptyState type="coffee" />;
  }

  return (
    <div className="divide-y divide-amber-100">
      {items.map((item) => (
        <div key={item.id} className="p-4">
          <div className="flex gap-3">
            {item.image ? (
              <img
                src={getBase64ImageSrc(item.image)}
                alt={item.name}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#7A3E18]">
                <Coffee size={22} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="truncate text-sm font-semibold text-[#4A2410]">
                    {item.name}
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    LKR {item.price.toLocaleString()}
                  </p>
                </div>

                <div ref={openMenuId === item.id ? menuRef : null} className="relative">
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onMenuToggle(item.id);
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-amber-200 text-[#8A5A3C] transition hover:border-amber-400 hover:bg-amber-50 hover:text-[#7A3E18]"
                  >
                    <MoreVertical size={17} />
                  </button>

                  {openMenuId === item.id && (
                    <div className="absolute right-0 top-11 z-50 w-40 rounded-xl border border-amber-200 bg-white p-1.5 shadow-xl">
                      <ActionMenuItem
                        icon={<Eye size={16} />}
                        label="View"
                        onClick={() => onView(item)}
                      />
                      <ActionMenuItem
                        icon={<Edit size={16} />}
                        label="Edit"
                        onClick={() => {
                          onEdit(item);
                          onMenuToggle(item.id);
                        }}
                      />
                      <ActionMenuItem
                        icon={<Trash2 size={16} />}
                        label="Delete"
                        danger
                        onClick={() => {
                          onDelete(item);
                          onMenuToggle(item.id);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.ingredients.map((x) => (
                  <span
                    key={x}
                    className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-[#7A3E18]"
                  >
                    {x}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {item.description && (
            <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#79543C]">
              {item.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   MEAL MOBILE
========================================================= */

function MealMobileCards({
  items,
  openMenuId,
  menuRef,
  onMenuToggle,
  onEdit,
  onView,
  onDelete,
}: {
  items: MealItem[];
  openMenuId: number | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onMenuToggle: (id: number) => void;
  onEdit: (item: MealItem) => void;
  onView: (item: MealItem) => void;
  onDelete: (item: MealItem) => void;
}) {
  if (items.length === 0) {
    return <EmptyState type="meal" />;
  }

  return (
    <div className="divide-y divide-amber-100">
      {items.map((item) => (
        <div key={item.id} className="p-4">
          <div className="flex gap-3">
            {item.image ? (
              <img
                src={getBase64ImageSrc(item.image)}
                alt={item.name}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#7A3E18]">
                <Utensils size={22} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="truncate text-sm font-semibold text-[#4A2410]">
                    {item.name}
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    LKR {item.price.toLocaleString()}
                  </p>
                </div>

                <div ref={openMenuId === item.id ? menuRef : null} className="relative">
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onMenuToggle(item.id);
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-amber-200 text-[#8A5A3C] transition hover:border-amber-400 hover:bg-amber-50 hover:text-[#7A3E18]"
                  >
                    <MoreVertical size={17} />
                  </button>

                  {openMenuId === item.id && (
                    <div className="absolute right-0 top-11 z-50 w-40 rounded-xl border border-amber-200 bg-white p-1.5 shadow-xl">
                      <ActionMenuItem
                        icon={<Eye size={16} />}
                        label="View"
                        onClick={() => onView(item)}
                      />
                      <ActionMenuItem
                        icon={<Edit size={16} />}
                        label="Edit"
                        onClick={() => {
                          onEdit(item);
                          onMenuToggle(item.id);
                        }}
                      />
                      <ActionMenuItem
                        icon={<Trash2 size={16} />}
                        label="Delete"
                        danger
                        onClick={() => {
                          onDelete(item);
                          onMenuToggle(item.id);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-[#7A3E18]">
                  {item.preparationTimeInMinutes} min
                </span>

                <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-[#7A3E18]">
                  {item.portionSize || "—"}
                </span>
              </div>
            </div>
          </div>

          {item.includes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.includes.map((include, index) => (
                <span
                  key={`${include}-${index}`}
                  className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-[#7A3E18]"
                >
                  {include}
                </span>
              ))}
            </div>
          )}

          {item.description && (
            <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#79543C]">
              {item.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   ACTION BUTTONS
========================================================= */

function ActionMenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${danger ? "text-red-600 hover:bg-red-50" : "text-[#5B321D] hover:bg-amber-50 hover:text-[#7A3E18]"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function ViewMenuItemModal({
  item,
  onClose,
}: {
  item: CoffeeItem | MealItem;
  onClose: () => void;
}) {
  const isMeal = "includes" in item;
  const itemTags = isMeal ? item.includes : item.ingredients;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#2D160A]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-amber-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#A4775C]">
              {isMeal ? "Meal" : "Coffee"}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#4A2410]">{item.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close view"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#8A5A3C] transition hover:bg-amber-50"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {item.image ? (
            <img
              src={getBase64ImageSrc(item.image)}
              alt={item.name}
              className="h-52 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-2xl bg-amber-50 text-[#7A3E18]">
              {isMeal ? <Utensils size={34} /> : <Coffee size={34} />}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Price</p>
              <p className="mt-1 font-bold text-emerald-800">LKR {item.price.toLocaleString()}</p>
            </div>
            {isMeal ? (
              <>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs text-[#8A5A3C]">Preparation</p>
                  <p className="mt-1 font-semibold text-[#4A2410]">{item.preparationTimeInMinutes} min</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs text-[#8A5A3C]">Portion</p>
                  <p className="mt-1 font-semibold text-[#4A2410]">{item.portionSize || "-"}</p>
                </div>
              </>
            ) : null}
          </div>

          {item.description && (
            <div>
              <h3 className="text-sm font-semibold text-[#4A2410]">Description</h3>
              <p className="mt-1 text-sm leading-6 text-[#79543C]">{item.description}</p>
            </div>
          )}

          {item.facts && (
            <div>
              <h3 className="text-sm font-semibold text-[#4A2410]">Facts</h3>
              <p className="mt-1 text-sm leading-6 text-[#79543C]">{item.facts}</p>
            </div>
          )}

          {itemTags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#4A2410]">
                {isMeal ? "Includes" : "Ingredients"}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {itemTags.map((tag, index) => (
                  <span key={`${tag}-${index}`} className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-[#7A3E18]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DeleteMenuItemModal({
  item,
  isSubmitting,
  onClose,
  onDelete,
}: {
  item: CoffeeItem | MealItem;
  isSubmitting: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#2D160A]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-[#7A3E18]">
          <Trash2 size={25} />
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-bold text-[#4A2410]">Delete Menu Item</h2>
          <p className="mt-2 text-sm leading-6 text-[#7B5B49]">
            Are you sure you want to delete <strong className="text-[#4A2410]">{item.name}</strong>? This action cannot be undone.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 cursor-pointer flex-1 rounded-xl border border-amber-200 bg-white text-sm font-semibold text-[#6B422B] transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting}
            className="inline-flex h-11 cursor-pointer flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#7A3E18] text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
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
      className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-[#6B422B] transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({ type }: { type: "coffee" | "meal" }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-[#7A3E18]">
        {type === "coffee" ? <Coffee size={25} /> : <Utensils size={25} />}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-[#4A2410]">
        No menu items found
      </h3>

      <p className="mt-1 max-w-sm text-xs text-[#9A6A4A]">
        Add your first {type === "coffee" ? "coffee item" : "meal item"} to get
        started.
      </p>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#5B321D]">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const inputClass =
  "h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm text-[#4A2410] outline-none transition placeholder:text-[#B9957E] focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

const textareaClass =
  "w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-[#4A2410] outline-none transition placeholder:text-[#B9957E] focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

const thClass =
  "px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500";
