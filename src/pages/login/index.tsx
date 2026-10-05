import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  X,
  CheckCircle,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  Scissors,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/auth-api'
import Alert from '@/components/ui/alert'

type PageAlert = {
  visible: boolean
  variant?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  description?: string
}

export default function Login() {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    userId: '',
    password: '',
  })

  const [pageAlert, setPageAlert] = useState<PageAlert>({
    visible: false,
  })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setLoading(true)
    setPageAlert({ visible: false })

    try {
      const cashier = await login(
        formData.userId,
        formData.password,
      )

      localStorage.setItem('cashier', JSON.stringify(cashier))
      navigate('/seat')
    } catch (error) {
      console.error('Login failed:', error)

      setPageAlert({
        visible: true,
        variant: 'error',
        title: 'Login Failed',
        description: (error as { response?: { status?: number; data?: { message?: string } } })?.response?.status === 403
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'You are not assigned to this module. Contact your administrator.'
          : error instanceof Error && error.message === 'You are not assigned to this module. Contact your administrator.'
            ? error.message
            : 'Invalid user ID or password.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setForgotLoading(true)

    try {
      // Replace this with your forgot-password API.
      await new Promise((resolve) => setTimeout(resolve, 1200))

      setForgotSuccess(true)
    } catch (error) {
      console.error('Password reset request failed:', error)

      setPageAlert({
        visible: true,
        variant: 'error',
        title: 'Request Failed',
        description: 'Unable to send the password reset request.',
      })

      setShowForgotModal(false)
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgotModal = () => {
    setShowForgotModal(false)
    setForgotEmail('')
    setForgotSuccess(false)
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#08050D]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#08050D_0%,#140B20_48%,#24103A_100%)]" />

        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-purple-500/15 blur-[100px]" />

        <div className="absolute -bottom-32 right-[-5rem] h-96 w-96 rounded-full bg-violet-400/10 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full">
        {/* Left panel */}
        <section className="hidden h-full w-[42%] flex-col justify-between border-r border-white/10 px-10 py-8 lg:flex xl:px-16">
          <div>
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-[#6D28D9] shadow-lg shadow-purple-950/40">
                <Scissors className="h-6 w-6 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white">
                  KVK Salon
                </h1>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
                  Admin Management
                </p>
              </div>
            </div>

            <div className="mt-20 max-w-md">
              {/* Secure badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-300/15 bg-purple-400/10 px-3 py-1.5 text-xs font-medium text-purple-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure administration
              </div>

              <h2 className="text-4xl font-bold leading-tight text-white">
                Premium Salon management.
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                Manage salon services, appointments, staff and daily
                operations from one secure dashboard.
              </p>

              <div className="mt-8 space-y-4">
                {/* Salon Management */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Salon Management
                    </p>

                    <p className="text-xs text-slate-500">
                      Manage services, appointments and salon operations.
                    </p>
                  </div>
                </div>

                {/* Appointment Tracking */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                    <BarChart3 className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Appointment Tracking
                    </p>

                    <p className="text-xs text-slate-500">
                      Monitor bookings, schedules and daily appointments.
                    </p>
                  </div>
                </div>

                {/* Secure Staff Access */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Secure Staff Access
                    </p>

                    <p className="text-xs text-slate-500">
                      Protected access for authorized salon staff.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="border-t border-white/10 pt-5 text-xs text-slate-500">
            © 2026 KVK Salon. Developed by{' '}
            <span className="font-semibold text-slate-300">
              2D-Coders
            </span>
          </p>
        </section>

        {/* Right panel */}
        <main className="flex h-full w-full items-center justify-center bg-[#F8F3EE] px-4 backdrop-blur-lg lg:w-[58%]">
          <div className="w-full max-w-[410px]">
            {pageAlert.visible && (
              <div className="mb-3">
                <Alert
                  variant={pageAlert.variant as any}
                  title={pageAlert.title}
                  description={pageAlert.description}
                  onClose={() =>
                    setPageAlert((previous) => ({
                      ...previous,
                      visible: false,
                    }))
                  }
                />
              </div>
            )}

            {/* Mobile logo */}
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-[#6D28D9]">
                <Scissors className="h-5 w-5 text-white" />
              </div>

              <div>
                <p className="text-lg font-bold text-white">
                  KVK Salon
                </p>

                <p className="text-[10px] uppercase tracking-[0.18em] text-purple-300">
                  Admin Portal
                </p>
              </div>
            </div>

            {/* Login Card */}
            <div className="rounded-[26px] border border-purple-500/15 bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="mb-5">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-50 px-3 py-1 text-[11px] font-medium text-purple-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure administrator access
                </div>

                <h2 className="text-3xl font-bold text-[#2A160D]">
                  Welcome back
                </h2>

                <p className="mt-1.5 text-sm text-stone-500">
                  Sign in to access the KVK Salon dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* User ID */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="userId"
                    className="text-sm font-semibold text-stone-600"
                  >
                    User ID
                  </Label>

                  <div className="group relative rounded-xl border border-purple-500/15 bg-stone-50 hover:border-purple-400/40 focus-within:border-purple-500 focus-within:ring-purple-500/20">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 group-focus-within:text-purple-500" />

                    <Input
                      id="userId"
                      name="userId"
                      type="text"
                      placeholder="Enter your user ID"
                      value={formData.userId}
                      onChange={handleChange}
                      autoComplete="username"
                      className="h-11 rounded-xl border-purple-500/15 bg-stone-50 pl-10 text-stone-900 placeholder:text-stone-400 hover:border-purple-400/40 focus-visible:border-purple-500 focus-visible:ring-purple-500/20"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-stone-600"
                  >
                    Password
                  </Label>

                  <div className="group relative rounded-xl border border-purple-500/15 bg-stone-50 hover:border-purple-400/40 focus-within:border-purple-500 focus-within:ring-purple-500/20">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 group-focus-within:text-purple-500" />

                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      className="h-11 rounded-xl border-purple-500/15 bg-stone-50 pl-10 pr-11 text-stone-900 placeholder:text-stone-400 hover:border-purple-400/40 focus-visible:border-purple-500 focus-visible:ring-purple-500/20"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      className="absolute right-3.5 top-1/2 cursor-pointer -translate-y-1/2 rounded-md p-1 text-stone-400 transition hover:text-purple-500"
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot password */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="cursor-pointer text-xs font-medium text-purple-400 transition hover:text-purple-300"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="group h-11 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] font-semibold text-white shadow-lg shadow-purple-950/30 hover:from-[#8B5CF6] hover:to-[#6D28D9]"
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />

                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>

                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 cursor-pointer transition-transform group-hover:translate-x-0.5" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              {/* Contact administrator - intentionally disabled */}
              {/* 
              <div className="mt-5 border-t border-white/10 pt-4 text-center">
                <p className="text-xs text-slate-500">
                  Need access?{' '}
                  <button
                    type="button"
                    className="cursor-pointer font-semibold text-purple-400 hover:text-purple-300"
                  >
                    Contact administrator
                  </button>
                </p>
              </div>
              */}
            </div>

            {/* Security message */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              <span>Your login information is securely protected</span>
            </div>
          </div>
        </main>
      </div>

      {/* Forgot password modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08050D]/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#15101F] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#6D28D9] to-[#3B0764] px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Reset Password
                </h3>

                <p className="mt-0.5 text-xs text-purple-200">
                  Request a password reset.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForgotModal}
                className="cursor-pointer rounded-lg p-2 text-purple-100 transition hover:bg-white/10"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {!forgotSuccess ? (
                <form
                  onSubmit={handleForgotSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="forgotEmail"
                      className="text-sm font-semibold text-slate-200"
                    >
                      Email or User ID
                    </Label>

                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                      <Input
                        id="forgotEmail"
                        type="text"
                        placeholder="Enter email or user ID"
                        value={forgotEmail}
                        onChange={(event) =>
                          setForgotEmail(event.target.value)
                        }
                        className="h-11 rounded-xl border-purple-500/15 bg-[#0F0A17] pl-10 text-white placeholder:text-slate-600 focus-visible:border-purple-500 focus-visible:ring-purple-500/20"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="h-10 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] font-semibold text-white hover:from-[#8B5CF6] hover:to-[#6D28D9]"
                  >
                    {forgotLoading ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />

                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>

                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Reset Request
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeForgotModal}
                    className="h-10 w-full cursor-pointer border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="py-4 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10">
                    <CheckCircle className="h-7 w-7 text-emerald-400" />
                  </div>

                  <h4 className="text-lg font-bold text-white">
                    Request Sent
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Check your registered email for password reset
                    instructions.
                  </p>

                  <Button
                    type="button"
                    onClick={closeForgotModal}
                    className="mt-4 h-10 w-full rounded-xl bg-[#6D28D9] text-white hover:bg-[#7C3AED]"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}