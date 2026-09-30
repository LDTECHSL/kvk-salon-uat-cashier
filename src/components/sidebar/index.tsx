import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  CheckSquare,
  Settings,
  ChevronDown,
  User2,
  Armchair,
  Scissors,
  Sparkles,
  CalendarClock,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose?: () => void;
}

interface NavSubitem {
  id: string;
  label: string;
  path: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  submenu: NavSubitem[] | null;
}

export default function Sidebar({
  isOpen,
  isMobile,
  onClose,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = !isOpen && !isMobile;

  // const [isDidDayEnd, setIsDidDayEnd] = useState(false);

  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  // const handleGetDayEndData = async () => {
  //   const today = new Date().toISOString().split("T")[0];

  //   try {
  //     const res = await getDayEndData(today);

  //     if (res && res.length > 0) {
  //       setIsDidDayEnd(true);
  //       localStorage.setItem("dayEndData", JSON.stringify(res[0]));
  //     } else {
  //       setIsDidDayEnd(false);
  //       localStorage.removeItem("dayEndData");
  //     }
  //   } catch (error) {
  //     setIsDidDayEnd(false);
  //     localStorage.removeItem("dayEndData");
  //   }
  // };

  // useEffect(() => {
  //   handleGetDayEndData();
  // }, []);

  // const canAccessMenu = (itemId: string) => {
  //   if (isDidDayEnd) return true;

  //   return itemId === "dayend";
  // };

  const navItems: NavItem[] = [
    {
      id: "staff",
      label: "Staff",
      icon: User2,
      path: "/staff",
      submenu: null,
    },
    {
      id: "seat",
      label: "Seat",
      icon: Armchair,
      path: "/seat",
      submenu: null,
    },
    {
      id: "services",
      label: "Services",
      icon: Sparkles,
      path: "/services",
      submenu: null,
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: CalendarClock,
      path: "/bookings",
      submenu: null,
    },
    {
      id: "today",
      label: "Today's Appointments",
      icon: CalendarCheck,
      path: "/today",
      submenu: null,
    },
    {
      id: "dayend",
      label: "Day end",
      icon: CheckSquare,
      path: "/dayend",
      submenu: null,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/settings",
      submenu: null,
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);

    if (isMobile && onClose) {
      onClose();
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Mobile drawer backdrop
  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      <aside
          className={`${isMobile ? "fixed inset-y-0 left-0 z-40" : "relative"} h-full w-full bg-white border-r border-purple-100 shadow-[0_0_0_1px_rgba(124,58,237,0.08)] transition-all duration-300 ease-in-out ${
          isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : ""
          } overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent`}
      >
        <div className="flex flex-col h-full">

          {/* Brand Header */}
          <div className="px-4 pt-4 pb-3 border-b border-purple-100">
            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-[#6D28D9] text-white flex items-center justify-center shadow-lg shadow-purple-950/40">
                <Scissors size={17} />
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    KVK Salon
                  </p>

                  <p className="text-xs text-purple-600">
                    Admin Management
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              const btnBase = `w-full flex items-center ${
                collapsed ? "justify-center" : "justify-between"
              } ${
                collapsed ? "px-2" : "px-3"
              } py-1.5 rounded-xl transition-colors duration-150`;

              const iconWrapper = `${
                active
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-500"
              } w-8 h-8 flex items-center justify-center rounded-lg transition`;

              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      // if (!canAccessMenu(item.id)) return;
                      handleNavigation(item.path);
                    }}
                    // disabled={!canAccessMenu(item.id)}
                    className={`${btnBase}
                      ${
                        active && !collapsed
                          ? "bg-purple-500/15 text-purple-200 shadow-sm"
                          : "text-slate-700 hover:bg-purple-50"
                      }
                      cursor-pointer
                      ${
                        // !canAccessMenu(item.id)
                          // ? "opacity-50 cursor-not-allowed"
                          // : ""
                          ""
                      }
                    `}
                  >
                    <div
                      className={`flex items-center gap-3 ${
                        collapsed ? "justify-center" : ""
                      }`}
                    >
                      <span className={iconWrapper}>
                        <Icon size={16} />
                      </span>

                      {!collapsed && (
                        <span
                          className={`text-sm ${
                            active
                              ? "text-purple-700 font-semibold"
                              : "text-slate-700"
                          }`}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!collapsed && item.submenu && (
                      <ChevronDown
                        size={16}
                        className="text-slate-400"
                      />
                    )}
                  </button>

                  {/* Submenu */}
                  {item.submenu && (
                    <div className="ml-3 space-y-1 animate-slide-up">
                      {item.submenu.map((subitem) => (
                        <button
                          key={subitem.id}
                          onClick={() =>
                            handleNavigation(subitem.path)
                          }
                          className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                            isActive(subitem.path)
                              ? "bg-purple-100 text-purple-700 font-medium"
                              : "text-slate-500 hover:bg-purple-50"
                          }`}
                        >
                          {subitem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto px-4 pb-4 pt-3 border-t border-purple-100 space-y-3">

            <div className="flex items-center gap-2 text-xs text-emerald-600">
              {!collapsed && (
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              )}

              {!collapsed && <span>System online</span>}
            </div>

            {!collapsed && (
              <div className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 px-3 py-3 shadow-sm">

                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-900 flex items-center justify-center text-xs font-semibold">
                  {cashier?.firstName?.charAt(0)}
                  {cashier?.lastName?.charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {cashier?.firstName} {cashier?.lastName}
                  </p>

                  <p className="text-xs text-slate-500">
                    {cashier?.email}
                  </p>
                </div>
              </div>
            )}

            {collapsed && (
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-200 flex items-center justify-center text-xs font-semibold">
                {cashier?.firstName?.charAt(0)}
                {cashier?.lastName?.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}